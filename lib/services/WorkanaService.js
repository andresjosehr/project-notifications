const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const logger = require('../utils/logger');
const config = require('../config');
const { query } = require('../../database');
const aiService = require('./AIService');
const userRepository = require('../database/repositories/UserRepository');
const userProposalRepository = require('../database/repositories/UserProposalRepository');
const DateUtils = require('../utils/dateUtils');

class WorkanaService {
  constructor() {
    this.sessionPath = path.join(process.cwd(), 'data', 'workana_session.json');
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.loginUrl = 'https://www.workana.com/login';
    this.baseUrl = 'https://www.workana.com';
    
    // Ensure data directory exists
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initBrowser() {
    try {
      if (this.browser) return;
      
      this.browser = await chromium.launch({
        headless: config.scraping.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setExtraHTTPHeaders({
        'User-Agent': config.scraping.userAgent
      });
      
      // Set viewport
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
      logger.info('Browser de Workana inicializado');
    } catch (error) {
      logger.errorWithStack('Error inicializando browser', error);
      throw error;
    }
  }

  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      logger.info('Browser de Workana cerrado');
    } catch (error) {
      logger.errorWithStack('Error cerrando browser', error);
    }
  }

  async saveSession() {
    try {
      if (!this.page) return false;
      
      const cookies = await this.page.context().cookies();
      const sessionData = {
        cookies,
        timestamp: DateUtils.toVenezuelaString(),
        userAgent: config.scraping.userAgent
      };
      
      fs.writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      logger.info('Sesión de Workana guardada');
      return true;
    } catch (error) {
      logger.errorWithStack('Error guardando sesión', error);
      return false;
    }
  }

  async loadSession(userId = null) {
    try {
      let sessionData = null;
      let sessionSource = 'file';
      
      // Si se proporciona userId, intentar cargar desde base de datos primero
      if (userId) {
        try {
          const user = await userRepository.findById(userId);
          if (user && user.workanaSessionData && user.sessionExpiresAt) {
            if (new Date(user.sessionExpiresAt) > new Date()) {
              sessionData = JSON.parse(user.workanaSessionData);
              sessionSource = 'database';
              logger.info(`Cargando sesión desde base de datos para usuario ${user.workanaEmail}`);
            } else {
              logger.info(`Sesión en base de datos expirada para usuario ${user.workanaEmail}`);
            }
          }
        } catch (dbError) {
          logger.errorWithStack('Error cargando sesión desde base de datos', dbError);
        }
      }
      
      // Fallback a archivo local si no se pudo cargar desde BD
      if (!sessionData && fs.existsSync(this.sessionPath)) {
        sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
        sessionSource = 'file';
        
        // Verificar que la sesión no sea muy antigua (24 horas)
        const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
        if (sessionAge > 24 * 60 * 60 * 1000) {
          logger.info('Sesión de archivo expirada');
          return false;
        }
      }
      
      if (!sessionData) {
        return false;
      }
      
      if (!this.page) {
        await this.initBrowser();
      }
      
      // Restaurar cookies
      await this.page.context().addCookies(sessionData.cookies);
      
      // Verificar si la sesión sigue activa
      const isValid = await this.validateSession();
      if (isValid) {
        this.isLoggedIn = true;
        logger.info(`Sesión de Workana cargada exitosamente desde ${sessionSource}`);
        return true;
      } else {
        logger.info(`Sesión de Workana inválida desde ${sessionSource}`);
        return false;
      }
    } catch (error) {
      logger.errorWithStack('Error cargando sesión', error);
      return false;
    }
  }

  async validateSession() {
    try {
      if (!this.page) return false;
      
      // Ir a una página que requiere login
      await this.page.goto(`${this.baseUrl}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Verificar si estamos en login o dashboard
      const currentUrl = this.page.url();
      logger.info(`Validando sesión - URL actual: ${currentUrl}`);
      
      if (currentUrl.includes('login')) {
        logger.info('Sesión inválida - URL contiene login');
        return false;
      }
      
      // Verificar si existe algún elemento característico del dashboard o usuario logueado
      const dashboardElement = await this.page.locator('[data-testid="dashboard"], .dashboard, #dashboard').first();
      const profileElement = await this.page.locator('[data-testid="user-menu"], .user-menu, .profile-menu').first();
      const loggedInIndicator = await this.page.locator('a[href*="logout"], button:has-text("Cerrar"), .navbar-nav, .avatar').first();
      
      const dashboardCount = await dashboardElement.count();
      const profileCount = await profileElement.count();
      const loggedInCount = await loggedInIndicator.count();
      
      logger.info(`Elementos encontrados - Dashboard: ${dashboardCount}, Profile: ${profileCount}, LoggedIn: ${loggedInCount}`);
      
      return dashboardCount > 0 || profileCount > 0 || loggedInCount > 0;
    } catch (error) {
      logger.errorWithStack('Error validando sesión', error);
      return false;
    }
  }

  async loginByUserId(userId) {
    try {
      if (!userId) {
        throw new Error('Se requiere userId');
      }
      
      // Obtener usuario de la base de datos
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado en la base de datos');
      }
      
      if (!user.isActive) {
        throw new Error('Usuario inactivo, no se puede realizar login');
      }
      
      logger.info(`Iniciando sesión en Workana con usuario ${user.workanaEmail}...`);
      
      const result = await this.login(user.workanaEmail, user.workanaPassword);
      
      if (result.success) {
        result.userId = userId;
        result.userEmail = user.workanaEmail;
        
        // Guardar sesión en la base de datos para el usuario específico
        try {
          const cookies = await this.page.context().cookies();
          const sessionData = {
            cookies,
            timestamp: DateUtils.toVenezuelaString(),
            userAgent: config.scraping.userAgent
          };
          
          const sessionDataJson = JSON.stringify(sessionData);
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
          
          await userRepository.updateSession(userId, sessionDataJson, expiresAt);
          logger.info(`Sesión guardada en base de datos para usuario ${user.workanaEmail}`);
        } catch (dbError) {
          logger.errorWithStack('Error guardando sesión en base de datos', dbError);
          // No fallar el login solo por el error de guardar en BD
        }
      }
      
      return result;
    } catch (error) {
      logger.errorWithStack('Error en login por userId', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async login(username = null, password = null) {
    try {
      // Usar credenciales del .env si no se proporcionan
      const finalUsername = username || process.env.WORKANA_USERNAME;
      const finalPassword = password || process.env.WORKANA_PASSWORD;
      
      if (!finalUsername || !finalPassword) {
        throw new Error('Se requieren credenciales de Workana. Configurar WORKANA_USERNAME y WORKANA_PASSWORD en .env o proporcionar como parámetros');
      }
      
      // Verificar si el usuario está activo
      const user = await userRepository.findByEmail(finalUsername);
      if (!user) {
        throw new Error('Usuario no encontrado en la base de datos');
      }
      
      if (!user.isActive) {
        throw new Error('Usuario inactivo, no se puede realizar login');
      }
      
      await this.initBrowser();
      
      logger.info('Iniciando sesión en Workana...');
      
      // Ir a la página de login
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      // Handle cookie consent dialog if present
      try {
        const cookieAcceptButton = this.page.locator('#onetrust-accept-btn-handler, button:has-text("Accept"), button:has-text("Aceptar")').first();
        if (await cookieAcceptButton.count() > 0) {
          await cookieAcceptButton.click();
          await this.page.waitForTimeout(1000);
        }
      } catch (error) {
        // Ignore cookie consent errors
      }
      
      // Buscar campos de login
      const usernameField = this.page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
      const passwordField = this.page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
      
      if (await usernameField.count() === 0) {
        throw new Error('No se encontró el campo de usuario');
      }
      
      if (await passwordField.count() === 0) {
        throw new Error('No se encontró el campo de contraseña');
      }
      
      // Rellenar campos
      await usernameField.fill(finalUsername);
      await this.page.waitForTimeout(1000);
      
      await passwordField.fill(finalPassword);
      await this.page.waitForTimeout(1000);
      
      // Buscar y hacer clic en el botón de login
      const submitButton = this.page.locator('button[type="submit"], input[type="submit"], button:has-text("Iniciar"), button:has-text("Login")').first();
      
      if (await submitButton.count() === 0) {
        throw new Error('No se encontró el botón de login');
      }
      
      await submitButton.click();
      
      // Esperar a que se procese el login
      await this.page.waitForTimeout(5000);
      
      // Verificar si el login fue exitoso
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('login')) {
        // Verificar si hay mensaje de error
        const errorMessage = await this.page.locator('.error, .alert-danger, [data-testid="error"]').first();
        if (await errorMessage.count() > 0) {
          const errorText = await errorMessage.textContent();
          throw new Error(`Error de login: ${errorText}`);
        }
        throw new Error('Login falló - aún en página de login');
      }
      
      // Verificar que estamos logueados
      await this.page.waitForTimeout(3000);
      const isValid = await this.validateSession();
      
      if (!isValid) {
        throw new Error('Login aparentemente exitoso pero sesión no válida');
      }
      
      this.isLoggedIn = true;
      
      // Guardar sesión
      await this.saveSession();
      
      // Obtener información del usuario si es posible
      let userInfo = null;
      try {
        const userElement = await this.page.locator('.user-name, .username, [data-testid="username"]').first();
        if (await userElement.count() > 0) {
          userInfo = await userElement.textContent();
        }
      } catch (error) {
        logger.warn('No se pudo obtener información del usuario', error);
      }
      
      logger.info('Login en Workana exitoso');
      
      return {
        success: true,
        user: userInfo,
        message: 'Login exitoso'
      };
    } catch (error) {
      logger.errorWithStack('Error en login de Workana', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async hasActiveSession(userId = null) {
    try {
      if (this.isLoggedIn) return true;
      
      return await this.loadSession(userId);
    } catch (error) {
      logger.errorWithStack('Error verificando sesión activa', error);
      return false;
    }
  }

  async sendProposal(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new Error('Se requiere projectId');
      }
      
      // Verificar si hay un usuario activo para este proyecto
      const activeUsers = await userRepository.findActive();
      if (activeUsers.length === 0) {
        throw new Error('No hay usuarios activos disponibles para enviar propuestas');
      }
      
      // Determinar el usuario a usar (por userId, email, o el primero activo)
      let currentUser = null;
      if (options.userId) {
        currentUser = await userRepository.findById(options.userId);
        if (!currentUser) {
          throw new Error('Usuario no encontrado por ID');
        }
        if (!currentUser.isActive) {
          throw new Error('Usuario especificado está inactivo');
        }
      } else if (options.username) {
        currentUser = await userRepository.findByEmail(options.username);
        if (!currentUser) {
          throw new Error('Usuario no encontrado por email');
        }
        if (!currentUser.isActive) {
          throw new Error('Usuario especificado está inactivo');
        }
      } else {
        currentUser = activeUsers[0]; // Usar el primer usuario activo
      }
      
      const hasSession = await this.hasActiveSession(currentUser.id);
      if (!hasSession) {
        logger.info('No hay sesión activa, intentando login automático...');
        const loginResult = await this.loginByUserId(currentUser.id);
        if (!loginResult.success) {
          throw new Error(`No se pudo iniciar sesión automáticamente: ${loginResult.error}`);
        }
        logger.info('Login automático exitoso');
      }
      
      logger.info(`Enviando propuesta para proyecto ${projectId} con usuario ${currentUser.workanaEmail}...`);
      
      // Verificar si este usuario ya envió una propuesta para este proyecto
      const existingProposal = await userProposalRepository.findByUserAndProject(
        currentUser.id, 
        projectId, 
        'workana'
      );
      
      if (existingProposal) {
        throw new Error(`El usuario ${currentUser.workanaEmail} ya envió una propuesta para este proyecto el ${existingProposal.proposalSentAt}`);
      }
      
      // Buscar el proyecto en la base de datos para obtener la URL real y datos del proyecto
      let projectDatabase;
      let projectUrl;
      try {
        const rows = await query(
          'SELECT link, title, description FROM projects WHERE id = ? AND platform = ?',
          [projectId, 'workana']
        );
        
        if (rows.length === 0) {
          throw new Error(`No se encontró el proyecto ${projectId} en la base de datos`);
        }
        
        projectDatabase = rows[0];
        logger.info(`Proyecto obtenido de la base de datos: ${projectDatabase.title}`);
        
        const jobSlug = projectDatabase.link.split('/job/')[1];
        projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
        logger.info(`URL de propuesta construida: ${projectUrl}`);

      } catch (error) {
        logger.error('Error consultando la base de datos:', error);
      }
      
      // Ir directamente a la página de envío de propuesta
      await this.page.goto(projectUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Verificar que estamos en la página correcta
      const currentUrl = this.page.url();
      logger.info(`URL actual después de navegación: ${currentUrl}`);
      
      if (currentUrl.includes('login')) {
        throw new Error('Sesión expirada, se requiere login');
      }
      
      // Verificar si el proyecto existe
      const projectNotFound = await this.page.locator('h1:has-text("404"), h1:has-text("No encontrado"), .error-404').count();
      if (projectNotFound > 0) {
        throw new Error('El proyecto no existe o no es accesible');
      }
      
      // Generar propuesta con IA usando el perfil profesional y las directrices del usuario
      let proposalText;
      try {
        if (!projectDatabase.title || !projectDatabase.description) {
          throw new Error('Título o descripción del proyecto no disponible');
        }
        
        logger.info('Generando propuesta con IA usando perfil del usuario...');
        proposalText = await aiService.generateProposalWithUserProfile(
          projectDatabase.title,
          projectDatabase.description,
          currentUser.professionalProfile,
          currentUser.proposalDirectives
        );
        
        logger.info('Propuesta generada exitosamente con IA');
      } catch (aiError) {
        logger.errorWithStack('Error generando propuesta con IA', aiError);
        
        // Fallback a propuesta personalizada si la IA falla
        proposalText = options.customProposal || 'Propuesta personalizada para este proyecto.';
        logger.warn('Usando propuesta fallback debido a error de IA');
      }
      
     
      // Buscar el área de texto de la propuesta
      const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"]').first();
      
      if (await proposalTextArea.count() === 0) {
        throw new Error('No se encontró el área de texto de la propuesta');
      }
      
      // Llenar el área de texto
      await proposalTextArea.fill(proposalText);
      await this.page.waitForTimeout(1000);
      
      // Buscar y hacer clic en el botón de enviar (excluyendo botones de búsqueda)
      const sendButton = this.page.locator(`
        button:has-text("Enviar"):not(.search-submit):not([class*="search"]), 
        button:has-text("Enviar propuesta"),
        button:has-text("Send"), 
        button:has-text("Send proposal"),
        button:has-text("Envía"),
        button:has-text("Aplicar"),
        button:has-text("Apply"),
        .send-btn, 
        .submit-btn,
        [data-testid="send-proposal-btn"],
        input[type="submit"]:not(.search-submit):not([class*="search"]),
        button[type="submit"]:not(.search-submit):not([class*="search"])
      `).filter({ hasNotText: 'Buscar' }).filter({ hasNotText: 'Search' }).first();
      
      if (await sendButton.count() === 0) {
        // Debug: log what buttons are available after opening proposal form
        const allButtonsInForm = await this.page.locator('button, .btn, input[type="submit"]').all();
        logger.info(`Botones encontrados en el formulario: ${allButtonsInForm.length}`);
        for (let i = 0; i < Math.min(allButtonsInForm.length, 10); i++) {
          try {
            const text = await allButtonsInForm[i].textContent();
            logger.info(`Botón formulario ${i}: "${text}"`);
          } catch (e) {
            logger.info(`Botón formulario ${i}: Error obteniendo texto`);
          }
        }
        throw new Error('No se encontró el botón de enviar');
      }
      
      await sendButton.click();
      
      // Esperar confirmación
      await this.page.waitForTimeout(5000);
      
      // Verificar si hubo éxito
      const errorMessage = this.page.locator('.error, .alert-danger, [data-testid="error"]').first();
      
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Error enviando propuesta: ${errorText}`);
      }
      
      logger.info(`Propuesta enviada exitosamente para proyecto ${projectId}`);
      
      // Crear registro en user_proposals
      try {
        const UserProposal = require('../models/UserProposal');
        const userProposal = UserProposal.createFromProposal(
          currentUser.id,
          projectId,
          'workana',
          proposalText
        );
        
        await userProposalRepository.create(userProposal);
        logger.info(`Propuesta guardada en user_proposals para usuario ${currentUser.workanaEmail} y proyecto ${projectId}`);
      } catch (saveError) {
        logger.errorWithStack('Error guardando propuesta en user_proposals', saveError);
      }

      
      return {
        success: true,
        projectId,
        userId: currentUser.id,
        userEmail: currentUser.workanaEmail,
        title: projectDatabase.title,
        message: 'Propuesta enviada exitosamente',
        proposalText: proposalText
      };
    } catch (error) {
      logger.errorWithStack('Error enviando propuesta', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendProposalByUserId(projectId, userId, options = {}) {
    try {
      if (!projectId) {
        throw new Error('Se requiere projectId');
      }
      
      if (!userId) {
        throw new Error('Se requiere userId');
      }
      
      // Obtener usuario de la base de datos
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado en la base de datos');
      }
      
      if (!user.isActive) {
        throw new Error('Usuario inactivo, no se puede enviar propuesta');
      }
      
      logger.info(`Enviando propuesta para proyecto ${projectId} con usuario ${user.workanaEmail}...`);
      
      // Usar el método sendProposal existente pero con el usuario específico
      const proposalOptions = {
        ...options,
        username: user.workanaEmail,
        userId: userId
      };
      
      const result = await this.sendProposal(projectId, proposalOptions);
      
      return result;
    } catch (error) {
      logger.errorWithStack('Error en sendProposal por userId', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate proposal only (for review flow)
  async generateProposalOnly(projectId, userId, options = {}) {
    try {
      logger.info(`Generando propuesta para proyecto ${projectId} con usuario ${userId}`);
      
      if (!projectId) {
        return {
          success: false,
          error: 'Se requiere projectId'
        };
      }

      if (!userId) {
        return {
          success: false,
          error: 'Se requiere userId'
        };
      }

      // Obtener información del proyecto
      const projectQuery = 'SELECT * FROM projects WHERE id = ?';
      const projectResult = await query(projectQuery, [projectId]);
      
      if (projectResult.length === 0) {
        return {
          success: false,
          error: 'Proyecto no encontrado'
        };
      }

      const project = projectResult[0];

      // Obtener información del usuario
      const user = await userRepository.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Usuario inactivo'
        };
      }

      // Generar propuesta usando IA
      let proposalText = '';
      
      try {
        if (user.professionalProfile && user.proposalDirectives) {
          // Usar perfil personalizado del usuario
          proposalText = await aiService.generateProposalWithUserProfile(
            project.title,
            project.description,
            user.professionalProfile,
            user.proposalDirectives
          );
        } else {
          // Usar método básico si no hay perfil
          proposalText = await aiService.buildProposal(
            project.title,
            project.description,
            project.skills || ''
          );
        }
      } catch (aiError) {
        logger.error('Error generando propuesta con IA:', aiError);
        return {
          success: false,
          error: 'Error generando propuesta con IA: ' + aiError.message
        };
      }

      logger.info(`Propuesta generada exitosamente para proyecto ${projectId}`);
      
      return {
        success: true,
        proposal: proposalText,
        projectTitle: project.title,
        userEmail: user.email,
        userId: user.id
      };

    } catch (error) {
      logger.errorWithStack('Error generando propuesta solamente', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send proposal with custom content
  async sendProposalWithCustomContent(projectId, userId, proposalContent, options = {}) {
    try {
      logger.info(`Enviando propuesta personalizada para proyecto ${projectId} con usuario ${userId}`);
      
      if (!projectId) {
        return {
          success: false,
          error: 'Se requiere projectId'
        };
      }

      if (!userId) {
        return {
          success: false,
          error: 'Se requiere userId'
        };
      }

      if (!proposalContent) {
        return {
          success: false,
          error: 'Se requiere contenido de la propuesta'
        };
      }

      // Obtener información del proyecto
      const projectQuery = 'SELECT * FROM projects WHERE id = ?';
      const projectResult = await query(projectQuery, [projectId]);
      
      if (projectResult.length === 0) {
        return {
          success: false,
          error: 'Proyecto no encontrado'
        };
      }

      const project = projectResult[0];

      // Obtener información del usuario
      const user = await userRepository.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Usuario inactivo'
        };
      }

      // Verificar si ya se envió propuesta
      const existingProposal = await userProposalRepository.findByUserAndProject(userId, projectId, 'workana');
      
      if (existingProposal) {
        return {
          success: false,
          error: 'Ya se envió una propuesta para este proyecto con este usuario'
        };
      }

      // Inicializar browser si es necesario
      await this.initBrowser();

      // Verificar sesión activa y hacer login si es necesario
      const hasSession = await this.hasActiveSession(userId);
      if (!hasSession) {
        logger.info('No hay sesión activa, intentando login automático...');
        const loginResult = await this.loginByUserId(userId);
        if (!loginResult.success) {
          return {
            success: false,
            error: `No se pudo establecer sesión con Workana: ${loginResult.error}`
          };
        }
        logger.info('Login automático exitoso');
      }

      // Construir URL del proyecto
      const jobSlug = project.link.split('/job/')[1];
      const projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
      
      logger.info(`Navegando a: ${projectUrl}`);
      
      // Navegar con configuración más robusta
      await this.page.goto(projectUrl, { 
        waitUntil: 'domcontentloaded',  // Menos estricto que networkidle
        timeout: 60000  // Aumentar timeout a 60 segundos
      });

      // Esperar un poco para que cargue
      await this.page.waitForTimeout(3000);

      // Verificar si estamos en la página correcta
      const currentUrl = this.page.url();
      logger.info(`URL actual después de navegación: ${currentUrl}`);
      
      if (currentUrl.includes('login')) {
        return {
          success: false,
          error: 'Sesión expirada, se requiere login'
        };
      }

      // Verificar si el proyecto existe
      const projectNotFound = await this.page.locator('h1:has-text("404"), h1:has-text("No encontrado"), .error-404').count();
      if (projectNotFound > 0) {
        return {
          success: false,
          error: 'El proyecto no existe o no es accesible'
        };
      }

      // Buscar el área de texto de la propuesta con múltiples selectores
      const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"], textarea[name="message"], textarea[placeholder*="propuesta"], textarea[placeholder*="mensaje"]').first();
      
      if (await proposalTextArea.count() === 0) {
        logger.info('No se encontró el textarea, buscando botón de aplicar/enviar propuesta');
        // Si no encontramos el textarea, buscar botón de aplicar primero
        const applyButton = this.page.locator('[data-testid="apply-project-button"], .btn-primary:has-text("Enviar propuesta"), .btn:has-text("Enviar propuesta"), button:has-text("Aplicar")').first();
        
        if (await applyButton.count() > 0) {
          logger.info('Se encontró el botón de aplicar/enviar propuesta');
          logger.info('Haciendo clic en botón de aplicar/enviar propuesta');
          await applyButton.click();
          await this.page.waitForTimeout(3000);
          
          // Buscar nuevamente el textarea después de hacer clic
          const proposalTextAreaAfterClick = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"], textarea[name="message"], textarea[placeholder*="propuesta"], textarea[placeholder*="mensaje"]').first();
          
          if (await proposalTextAreaAfterClick.count() === 0) {
            logger.info('No se encontró el campo de texto para la propuesta');
            return {
              success: false,
              error: 'No se encontró el campo de texto para la propuesta'
            };
          }
          
          // Llenar el área de texto
          await proposalTextAreaAfterClick.fill(proposalContent);
          await this.page.waitForTimeout(1000);
        } else {
          logger.info('No se encontró el botón para enviar propuesta ni el campo de texto');
          return {
            success: false,
            error: 'No se encontró el botón para enviar propuesta ni el campo de texto'
          };
        }
      } else {
        logger.info('Se encontró el textarea, llenando el área de texto directamente');

        
        // Llenar el área de texto directamente
        await proposalTextArea.fill(proposalContent);
        await this.page.waitForTimeout(1000);
        await this.page.screenshot({ path: 'screenshot.png' });
        logger.info('Screenshot saved to screenshot.png');
      }

      // Buscar y hacer clic en el botón de envío final
      const finalSubmitButton = this.page.locator(`
        .wk-submit-block input[type="submit"][value="Enviar"],
        .wk-submit-block input[type="submit"].btn-primary,
        input[type="submit"][value="Enviar"].btn.btn-primary,
        .wk-submit-block input.btn-primary[type="submit"]
      `).first();
      
      if (await finalSubmitButton.count() === 0) {
        logger.info('No se encontró el botón final de envío');
        return {
          success: false,
          error: 'No se encontró el botón final de envío'
        };
      }

      logger.info('Haciendo clic en el botón final de envío');
      await finalSubmitButton.click();
      await this.page.waitForTimeout(5000);
      logger.info('Botón final de envío clicado');


      // Verificar si hubo éxito
      const errorMessage = this.page.locator('.error, .alert-danger, [data-testid="error"]').first();
      
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.textContent();
        return {
          success: false,
          error: `Error enviando propuesta: ${errorText}`
        };
      }

      // Registrar la propuesta en la base de datos
      try {
        const UserProposal = require('../models/UserProposal');
        const userProposal = UserProposal.createFromProposal(
          userId,
          projectId,
          'workana',
          proposalContent
        );
        
        await userProposalRepository.create(userProposal);
        logger.info(`Propuesta personalizada guardada en user_proposals para usuario ${user.workanaEmail} y proyecto ${projectId}`);
      } catch (saveError) {
        logger.errorWithStack('Error guardando propuesta en user_proposals', saveError);
      }

      logger.info(`Propuesta personalizada enviada exitosamente para proyecto ${projectId}`);
      
      return {
        success: true,
        message: 'Propuesta enviada exitosamente',
        projectId: projectId,
        userId: userId,
        userEmail: user.workanaEmail,
        title: project.title,
        proposalText: proposalContent
      };

    } catch (error) {
      logger.errorWithStack('Error enviando propuesta personalizada', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  async cleanup() {
    try {
      await this.closeBrowser();
      this.isLoggedIn = false;
      
      // Eliminar sesión guardada si existe
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
        logger.info('Sesión de Workana eliminada');
      }
    } catch (error) {
      logger.errorWithStack('Error en cleanup de WorkanaService', error);
    }
  }
}

module.exports = WorkanaService;