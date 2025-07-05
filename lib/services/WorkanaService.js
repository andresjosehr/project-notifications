const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const logger = require('../utils/logger');
const config = require('../config');
const { query } = require('../../database');

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
        timestamp: new Date().toISOString(),
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

  async loadSession() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return false;
      }
      
      const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
      
      // Verificar que la sesión no sea muy antigua (24 horas)
      const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) {
        logger.info('Sesión de Workana expirada');
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
        logger.info('Sesión de Workana cargada exitosamente');
        return true;
      } else {
        logger.info('Sesión de Workana inválida');
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

  async login(username = null, password = null) {
    try {
      // Usar credenciales del .env si no se proporcionan
      const finalUsername = username || process.env.WORKANA_USERNAME;
      const finalPassword = password || process.env.WORKANA_PASSWORD;
      
      if (!finalUsername || !finalPassword) {
        throw new Error('Se requieren credenciales de Workana. Configurar WORKANA_USERNAME y WORKANA_PASSWORD en .env o proporcionar como parámetros');
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

  async hasActiveSession() {
    try {
      if (this.isLoggedIn) return true;
      
      return await this.loadSession();
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
      
      const hasSession = await this.hasActiveSession();
      if (!hasSession) {
        throw new Error('No hay sesión activa en Workana');
      }
      
      logger.info(`Enviando propuesta para proyecto ${projectId}...`);
      
      // Buscar el proyecto en la base de datos para obtener la URL real
      let projectUrl;
      try {
        const rows = await query(
          'SELECT link FROM workana_projects WHERE id = ?',
          [projectId]
        );
        
        if (rows.length === 0) {
          throw new Error(`No se encontró el proyecto ${projectId} en la base de datos`);
        }
        
        const projectDatabase = rows[0];
        logger.info(`URL del proyecto obtenida de la base de datos: ${projectDatabase.link}`);
        
        // Transformar la URL del proyecto a la URL de envío de propuesta
        // De: https://www.workana.com/job/desarrollo-de-api-para-uso-en-interfaz-web-de-comercios-en-linea
        // A: https://www.workana.com/messages/bid/desarrollo-de-api-para-uso-en-interfaz-web-de-comercios-en-linea/?tab=message&ref=project_view
        if (projectDatabase.link.includes('/job/')) {
          const jobSlug = projectDatabase.link.split('/job/')[1];
          projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
          logger.info(`URL de propuesta construida: ${projectUrl}`);
        } else {
          projectUrl = projectDatabase.link;
          logger.warn('URL del proyecto no tiene el formato esperado /job/, usando URL original');
        }
      } catch (error) {
        logger.error('Error consultando la base de datos:', error);
        // Fallback a la URL construida manualmente
        projectUrl = `${this.baseUrl}/projects/${projectId}`;
        logger.info(`Usando URL fallback: ${projectUrl}`);
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
      
      // Ya estamos en la página del formulario de propuesta, buscar directamente el área de texto
      
      // Buscar el área de texto de la propuesta
      const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"]').first();
      
      if (await proposalTextArea.count() === 0) {
        throw new Error('No se encontró el área de texto de la propuesta');
      }
      
      // Obtener el texto de la propuesta
      const proposalText = options.customProposal || process.env.BID || 'Propuesta personalizada para este proyecto.';
      
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
      const successMessage = await this.page.locator('.success, .alert-success, [data-testid="success"]').first();
      const errorMessage = await this.page.locator('.error, .alert-danger, [data-testid="error"]').first();
      
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Error enviando propuesta: ${errorText}`);
      }
      
      logger.info(`Propuesta enviada exitosamente para proyecto ${projectId}`);
      
      return {
        success: true,
        projectId,
        title: projectDatabase.title,
        message: 'Propuesta enviada exitosamente'
      };
    } catch (error) {
      logger.errorWithStack('Error enviando propuesta', error);
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