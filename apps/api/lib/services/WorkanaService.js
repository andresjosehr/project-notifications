const { chromium } = require('playwright');
const logger = require('../utils/logger');
const config = require('../config');
const Database = require('../database/connection');
const aiService = require('./AIService');
const userRepository = require('../database/repositories/UserRepository');
const userProposalRepository = require('../database/repositories/UserProposalRepository');
const ExternalCredentialRepository = require('../database/repositories/ExternalCredentialRepository');
const DateUtils = require('../utils/dateUtils');

class WorkanaService {
  constructor() {
    this._initializeConfiguration();
    this._initializeBrowserState();
  }

  // ===========================================
  // CONFIGURATION AND INITIALIZATION
  // ===========================================

  _initializeConfiguration() {
    this.baseUrl = 'https://www.workana.com';
    this.loginUrl = `${this.baseUrl}/login`;
    this.sessionExpiryHours = 24;
    
    this.browserConfig = {
      headless: config.scraping.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    };
    
    // For CAPTCHA handling, we might need non-headless mode
    this.captchaFallbackConfig = {
      ...this.browserConfig,
      headless: false
    };
    
    this.pageConfig = {
      viewport: { width: 1920, height: 1080 },
      userAgent: config.scraping.userAgent,
      timeout: 30000,
      waitTimeout: 3000
    };
  }

  _initializeBrowserState() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }


  // ===========================================
  // BROWSER MANAGEMENT
  // ===========================================

  async initBrowser() {
    try {
      if (this.browser) return;
      
      this.browser = await chromium.launch(this.browserConfig);
      this.page = await this.browser.newPage();
      
      await this._configurePage();
      
      logger.info('Browser de Workana inicializado');
    } catch (error) {
      logger.errorWithStack('Error inicializando browser', error);
      throw error;
    }
  }

  async _configurePage() {
    if (!this.page) return;
    
    await this.page.setExtraHTTPHeaders({
      'User-Agent': this.pageConfig.userAgent
    });
    
    await this.page.setViewportSize(this.pageConfig.viewport);
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

  async _ensureBrowserReady() {
    if (!this.browser || !this.page) {
      await this.initBrowser();
    }
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  async saveSession(userId = null) {
    try {
      if (!this.page) return false;
      if (!userId) {
        logger.warn('No se puede guardar sesión sin userId');
        return false;
      }
      
      const sessionData = await this._createSessionData();
      const sessionDataJson = JSON.stringify(sessionData);
      const expiresAt = new Date(Date.now() + this.sessionExpiryHours * 60 * 60 * 1000);
      
      const externalCredentialRepository = new ExternalCredentialRepository();
      await externalCredentialRepository.updateSessionData(userId, sessionDataJson, expiresAt);
      
      logger.info(`Sesión de Workana guardada en base de datos para usuario ${userId}`);
      return true;
    } catch (error) {
      logger.errorWithStack('Error guardando sesión en base de datos', error);
      return false;
    }
  }

  async _createSessionData() {
    const cookies = await this.page.context().cookies();
    return {
      cookies,
      timestamp: DateUtils.toVenezuelaString(),
      userAgent: this.pageConfig.userAgent
    };
  }

  async loadSession(userId = null) {
    try {
      const sessionData = await this._getSessionData(userId);
      if (!sessionData) return false;
      
      await this._ensureBrowserReady();
      await this.page.context().addCookies(sessionData.cookies);
      
      const isValid = await this.validateSession();
      if (isValid) {
        this.isLoggedIn = true;
        logger.info(`Sesión de Workana cargada exitosamente desde ${sessionData.source}`);
        return true;
      } else {
        logger.info(`Sesión de Workana inválida desde ${sessionData.source}`);
        return false;
      }
    } catch (error) {
      logger.errorWithStack('Error cargando sesión', error);
      return false;
    }
  }

  async _getSessionData(userId = null) {
    if (!userId) {
      logger.warn('No se puede cargar sesión sin userId');
      return null;
    }
    
    const sessionData = await this._loadSessionFromDatabase(userId);
    return sessionData ? { ...sessionData, source: 'database' } : null;
  }

  async _loadSessionFromDatabase(userId) {
    try {
      const externalCredentialRepository = new ExternalCredentialRepository();
      const workanaCredential = await externalCredentialRepository.findByUserIdAndPlatform(userId, 'workana');
      
      if (!workanaCredential) {
        logger.info(`No se encontraron credenciales de Workana para usuario ${userId}`);
        return null;
      }
      
      if (!workanaCredential.sessionData || !workanaCredential.sessionExpiresAt) {
        logger.info(`No hay datos de sesión guardados para usuario ${workanaCredential.email}`);
        return null;
      }
      
      if (new Date(workanaCredential.sessionExpiresAt) > new Date()) {
        logger.info(`Cargando sesión desde external_credentials para usuario ${workanaCredential.email}`);
        return JSON.parse(workanaCredential.sessionData);
      } else {
        logger.info(`Sesión en external_credentials expirada para usuario ${workanaCredential.email}`);
        return null;
      }
    } catch (dbError) {
      logger.errorWithStack('Error cargando sesión desde external_credentials', dbError);
      return null;
    }
  }


  async validateSession() {
    try {
      if (!this.page) return false;
      
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.pageConfig.timeout 
      });
      
      await this.page.waitForTimeout(this.pageConfig.waitTimeout);
      
      const currentUrl = this.page.url();
      logger.info(`Validando sesión - URL actual: ${currentUrl}`);
      
      if (currentUrl.includes('login')) {
        logger.info('Sesión inválida - URL contiene login');
        return false;
      }
      
      return await this._checkLoggedInElements();
    } catch (error) {
      logger.errorWithStack('Error validando sesión', error);
      return false;
    }
  }

  async _checkLoggedInElements() {
    const selectors = [
      '[data-testid="dashboard"], .dashboard, #dashboard',
      '[data-testid="user-menu"], .user-menu, .profile-menu',
      'a[href*="logout"], button:has-text("Cerrar"), .navbar-nav, .avatar'
    ];
    
    const counts = await Promise.all(
      selectors.map(selector => this.page.locator(selector).first().count())
    );
    
    const [dashboardCount, profileCount, loggedInCount] = counts;
    logger.info(`Elementos encontrados - Dashboard: ${dashboardCount}, Profile: ${profileCount}, LoggedIn: ${loggedInCount}`);
    
    return dashboardCount > 0 || profileCount > 0 || loggedInCount > 0;
  }

  async hasActiveSession(userId = null) {
    try {
      if (this.isLoggedIn) return true;
      
      // Primero verificar si hay datos de sesión válidos en la base de datos
      const sessionData = await this._getSessionData(userId);
      if (!sessionData) {
        logger.info('No hay datos de sesión en la base de datos');
        return false;
      }
      
      // Si hay datos de sesión, intentar cargarlos en el browser
      return await this.loadSession(userId);
    } catch (error) {
      logger.errorWithStack('Error verificando sesión activa', error);
      return false;
    }
  }

  // ===========================================
  // AUTHENTICATION METHODS
  // ===========================================

  async loginByUserId(userId) {
    try {
      this._validateUserId(userId);
      
      const user = await this._getUserForLogin(userId);
      logger.info(`Iniciando sesión en Workana con usuario ${user.workanaEmail}, ${user.workanaPassword}...`);
      
      const result = await this.login(user.workanaEmail, user.workanaPassword);
      
      if (result.success) {
        result.userId = userId;
        result.userEmail = user.workanaEmail;
        await this.saveSession(userId);
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

  async _getUserForLogin(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado en la base de datos');
    }
    
    if (!user.isActive) {
      throw new Error('Usuario inactivo, no se puede realizar login');
    }

    // Obtener credenciales de Workana para este usuario
    const externalCredentialRepository = new ExternalCredentialRepository();
    const workanaCredential = await externalCredentialRepository.findByUserIdAndPlatform(userId, 'workana');
    
    if (!workanaCredential) {
      throw new Error('No se encontraron credenciales de Workana para este usuario');
    }
    
    if (!workanaCredential.isActive) {
      throw new Error('Credenciales de Workana inactivas para este usuario');
    }

    // Agregar las credenciales al objeto user para compatibilidad
    user.workanaEmail = workanaCredential.email;
    user.workanaPassword = workanaCredential.password;
    user.workanaSessionData = workanaCredential.sessionData;
    user.sessionExpiresAt = workanaCredential.sessionExpiresAt;
    
    return user;
  }


  async login(username = null, password = null) {
    try {
      const { finalUsername, finalPassword } = this._prepareCredentials(username, password);
      
      await this.initBrowser();
      logger.info('Iniciando sesión en Workana...');
      
      await this._navigateToLogin();
      await this._handleCookieConsent();
      
      // Check for CAPTCHA before attempting login
      const hasCaptcha = await this._checkForCaptcha();
      if (hasCaptcha) {
        throw new Error('CAPTCHA detectado. Para resolver este problema, use headless=false en la configuración o complete el CAPTCHA manualmente.');
      }
      
      await this._fillLoginForm(finalUsername, finalPassword);
      await this._submitLogin();
      
      await this._verifyLoginSuccess();
      
      this.isLoggedIn = true;
      // Note: saveSession now requires userId, will be called from loginByUserId
      
      const userInfo = await this._getUserInfo();
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

  _prepareCredentials(username, password) {
    const finalUsername = username || process.env.WORKANA_USERNAME;
    const finalPassword = password || process.env.WORKANA_PASSWORD;
    
    if (!finalUsername || !finalPassword) {
      throw new Error('Se requieren credenciales de Workana. Configurar WORKANA_USERNAME y WORKANA_PASSWORD en .env o proporcionar como parámetros');
    }
    
    return { finalUsername, finalPassword };
  }


  async _navigateToLogin() {
    await this.page.goto(this.loginUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: this.pageConfig.timeout 
    });
    await this.page.waitForTimeout(3000);
  }

  async _handleCookieConsent() {
    try {
      const cookieAcceptButton = this.page.locator('#onetrust-accept-btn-handler, button:has-text("Accept"), button:has-text("Aceptar")').first();
      if (await cookieAcceptButton.count() > 0) {
        await cookieAcceptButton.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      // Ignore cookie consent errors
    }
  }

  async _checkForCaptcha() {
    try {
      // Check for Cloudflare captcha
      const captchaElement = await this.page.locator('.cf-turnstile, [data-sitekey], iframe[src*="challenges.cloudflare"], :has-text("Verify you are human")').first();
      if (await captchaElement.count() > 0) {
        logger.warn('⚠️ CAPTCHA detectado en Workana. Se requiere interacción manual.');
        logger.warn('El login automático está bloqueado por protección anti-bot.');
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Error verificando CAPTCHA:', error.message);
      return false;
    }
  }

  async _fillLoginForm(username, password) {
    const usernameField = this.page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordField = this.page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    
    if (await usernameField.count() === 0) {
      throw new Error('No se encontró el campo de usuario');
    }
    
    if (await passwordField.count() === 0) {
      throw new Error('No se encontró el campo de contraseña');
    }
    
    // Clear fields first
    await usernameField.clear();
    await usernameField.fill(username);
    logger.info(`Campo de email llenado con: ${username}`);
    await this.page.waitForTimeout(1000);
    
    await passwordField.clear();
    await passwordField.fill(password);
    logger.info('Campo de contraseña llenado');
    await this.page.waitForTimeout(1000);
  }

  async _submitLogin() {
    const submitButton = this.page.locator('button:has-text("Ingresa"), button[type="submit"], input[type="submit"], button:has-text("Iniciar"), button:has-text("Login")').first();
    
    if (await submitButton.count() === 0) {
      // Debug: log available buttons
      const allButtons = await this.page.locator('button, input[type="submit"]').all();
      logger.info(`Botones disponibles: ${allButtons.length}`);
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        try {
          const text = await allButtons[i].textContent();
          logger.info(`Botón ${i}: "${text}"`);
        } catch (e) {
          logger.info(`Botón ${i}: Error obteniendo texto`);
        }
      }
      throw new Error('No se encontró el botón de login');
    }
    
    await submitButton.click();
    await this.page.waitForTimeout(8000);
  }

  async _verifyLoginSuccess() {
    const currentUrl = this.page.url();
    logger.info(`URL después del login: ${currentUrl}`);
    
    if (currentUrl.includes('login')) {
      // Check for CAPTCHA first
      const hasCaptcha = await this._checkForCaptcha();
      if (hasCaptcha) {
        throw new Error('Login bloqueado por CAPTCHA. Se requiere intervención manual o uso de headless=false.');
      }
      
      // Check for the specific error messages that appear on Workana
      const errorSelectors = [
        ':has-text("Captcha inválido")',
        ':has-text("Combinación de email y contraseña inválidos")',
        '.error',
        '.alert-danger',
        '[data-testid="error"]'
      ];
      
      for (const selector of errorSelectors) {
        const errorMessage = await this.page.locator(selector).first();
        if (await errorMessage.count() > 0) {
          const errorText = await errorMessage.textContent();
          throw new Error(`Error de login: ${errorText}`);
        }
      }
      
      // Take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'login-error-debug.png' });
        logger.info('Screenshot guardado en login-error-debug.png');
      } catch (e) {
        // Ignore screenshot errors
      }
      
      throw new Error('Login falló - aún en página de login');
    }
    
    await this.page.waitForTimeout(this.pageConfig.waitTimeout);
    const isValid = await this.validateSession();
    
    if (!isValid) {
      throw new Error('Login aparentemente exitoso pero sesión no válida');
    }
  }

  async _getUserInfo() {
    try {
      const userElement = await this.page.locator('.user-name, .username, [data-testid="username"]').first();
      if (await userElement.count() > 0) {
        return await userElement.textContent();
      }
      return null;
    } catch (error) {
      logger.warn('No se pudo obtener información del usuario', error);
      return null;
    }
  }

  // ===========================================
  // VALIDATION METHODS
  // ===========================================

  _validateUserId(userId) {
    if (!userId) {
      throw new Error('Se requiere userId');
    }
  }

  _validateProjectId(projectId) {
    if (!projectId) {
      throw new Error('Se requiere projectId');
    }
  }

  _validateProposalContent(proposalContent) {
    if (!proposalContent) {
      throw new Error('Se requiere contenido de la propuesta');
    }
  }

  async _validateUserAccess(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    if (!user.isActive) {
      throw new Error('Usuario inactivo');
    }
    
    return user;
  }

  async _validateProjectExists(projectId) {
    const projectQuery = 'SELECT * FROM projects WHERE id = ?';
    const projectResult = await Database.query(projectQuery, [projectId]);
    
    if (projectResult.length === 0) {
      throw new Error('Proyecto no encontrado');
    }
    
    return projectResult[0];
  }

  async _checkExistingProposal(userId, projectId) {
    const existingProposal = await userProposalRepository.findByUserAndProject(userId, projectId, 'workana');
    
    if (existingProposal) {
      throw new Error('Ya se envió una propuesta para este proyecto con este usuario');
    }
  }

  // ===========================================
  // PROPOSAL MANAGEMENT
  // ===========================================

  async sendProposal(projectId, options = {}) {
    try {
      this._validateProjectId(projectId);
      
      const currentUser = await this._selectUserForProposal(options);
      await this._ensureUserSession(currentUser);
      
      logger.info(`Enviando propuesta para proyecto ${projectId} con usuario ${currentUser.workanaEmail}...`);
      
      await this._checkExistingProposal(currentUser.id, projectId);
      const project = await this._getProjectData(projectId);
      
      await this._navigateToProposal(project);
      await this._verifyProposalPage();
      
      const proposalText = await this._generateProposalText(project, currentUser, options);
      await this._fillAndSubmitProposal(proposalText);
      
      await this._saveProposalRecord(currentUser, projectId, proposalText);
      
      logger.info(`Propuesta enviada exitosamente para proyecto ${projectId}`);
      
      return {
        success: true,
        projectId,
        userId: currentUser.id,
        userEmail: currentUser.workanaEmail,
        title: project.title,
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

  async _selectUserForProposal(options) {
    const activeUsers = await userRepository.findActive();
    if (activeUsers.length === 0) {
      throw new Error('No hay usuarios activos disponibles para enviar propuestas');
    }
    
    if (options.userId) {
      const user = await userRepository.findById(options.userId);
      if (!user) throw new Error('Usuario no encontrado por ID');
      if (!user.isActive) throw new Error('Usuario especificado está inactivo');
      return user;
    }
    
    if (options.username) {
      const user = await userRepository.findByEmail(options.username);
      if (!user) throw new Error('Usuario no encontrado por email');
      if (!user.isActive) throw new Error('Usuario especificado está inactivo');
      return user;
    }
    
    return activeUsers[0];
  }

  async _ensureUserSession(user) {
    logger.info(`Verificando sesión activa para usuario ${user.id}...`);
    const hasSession = await this.hasActiveSession(user.id);
    
    if (hasSession) {
      logger.info(`Sesión activa encontrada para usuario ${user.id}`);
    } else {
      logger.info('No hay sesión activa, intentando login automático...');
      const loginResult = await this.loginByUserId(user.id);
      if (!loginResult.success) {
        throw new Error(`No se pudo iniciar sesión automáticamente: ${loginResult.error}`);
      }
      logger.info('Login automático exitoso');
    }
  }

  async _getProjectData(projectId) {
    const rows = await Database.query(
      'SELECT link, title, description, language FROM projects WHERE id = ? AND platform = ?',
      [projectId, 'workana']
    );
    
    if (rows.length === 0) {
      throw new Error(`No se encontró el proyecto ${projectId} en la base de datos`);
    }
    
    const project = rows[0];
    logger.info(`Proyecto obtenido de la base de datos: ${project.title} (idioma: ${project.language || 'no especificado'})`);
    
    return project;
  }

  async _navigateToProposal(project) {
    const jobSlug = project.link.split('/job/')[1];
    const projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
    
    logger.info(`URL de propuesta construida: ${projectUrl}`);
    
    await this.page.goto(projectUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await this.page.waitForTimeout(3000);
  }

  async _verifyProposalPage() {
    const currentUrl = this.page.url();
    logger.info(`URL actual después de navegación: ${currentUrl}`);
    
    if (currentUrl.includes('login')) {
      throw new Error('Sesión expirada, se requiere login');
    }
    
    const projectNotFound = await this.page.locator('h1:has-text("404"), h1:has-text("No encontrado"), .error-404').count();
    if (projectNotFound > 0) {
      throw new Error('El proyecto no existe o no es accesible');
    }
  }

  async _generateProposalText(project, user, options) {
    try {
      if (!project.title || !project.description) {
        throw new Error('Título o descripción del proyecto no disponible');
      }
      
      logger.info('Generando propuesta con IA usando perfil del usuario...');
      const proposalText = await aiService.generateProposalWithUserProfile(
        project.title,
        project.description,
        user.professionalProfile,
        user.proposalDirectives,
        { language: project.language }
      );
      
      logger.info('Propuesta generada exitosamente con IA');
      return proposalText;
    } catch (aiError) {
      logger.errorWithStack('Error generando propuesta con IA', aiError);
      
      const fallbackText = options.customProposal || 'Propuesta personalizada para este proyecto.';
      logger.warn('Usando propuesta fallback debido a error de IA');
      return fallbackText;
    }
  }

  async _fillAndSubmitProposal(proposalText) {
    const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"]').first();
    
    if (await proposalTextArea.count() === 0) {
      throw new Error('No se encontró el área de texto de la propuesta');
    }
    
    await proposalTextArea.fill(proposalText);
    await this.page.waitForTimeout(1000);
    
    const sendButton = this._getSubmitButtonLocator();
    
    if (await sendButton.count() === 0) {
      await this._debugAvailableButtons();
      throw new Error('No se encontró el botón de enviar');
    }
    
    await sendButton.click();
    await this.page.waitForTimeout(5000);
    
    await this._verifySubmissionSuccess();
  }

  _getSubmitButtonLocator() {
    return this.page.locator(`
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
  }

  async _debugAvailableButtons() {
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
  }

  async _verifySubmissionSuccess() {
    const errorMessage = this.page.locator('.error, .alert-danger, [data-testid="error"]').first();
    
    if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.textContent();
      throw new Error(`Error enviando propuesta: ${errorText}`);
    }
  }

  async _saveProposalRecord(user, projectId, proposalText) {
    try {
      const UserProposal = require('../models/UserProposal');
      const userProposal = UserProposal.createFromProposal(
        user.id,
        projectId,
        'workana',
        proposalText
      );
      
      await userProposalRepository.create(userProposal);
      logger.info(`Propuesta guardada en user_proposals para usuario ${user.workanaEmail} y proyecto ${projectId}`);
    } catch (saveError) {
      logger.errorWithStack('Error guardando propuesta en user_proposals', saveError);
    }
  }

  async sendProposalByUserId(projectId, userId, options = {}) {
    try {
      this._validateProjectId(projectId);
      this._validateUserId(userId);
      
      const user = await this._validateUserAccess(userId);
      logger.info(`Enviando propuesta para proyecto ${projectId} con usuario ${user.workanaEmail}...`);
      
      const proposalOptions = {
        ...options,
        username: user.workanaEmail,
        userId: userId
      };
      
      return await this.sendProposal(projectId, proposalOptions);
    } catch (error) {
      logger.errorWithStack('Error en sendProposal por userId', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateProposalOnly(projectId, userId) {
    try {
      logger.info(`Generando propuesta para proyecto ${projectId} con usuario ${userId}`);
      
      this._validateProjectId(projectId);
      this._validateUserId(userId);
      
      const project = await this._validateProjectExists(projectId);
      const user = await this._validateUserAccess(userId);
      
      const proposalText = await this._generateProposalForUser(project, user);
      
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

  async _generateProposalForUser(project, user) {
    try {
      if (user.professionalProfile && user.proposalDirectives) {
        return await aiService.generateProposalWithUserProfile(
          project.title,
          project.description,
          user.professionalProfile,
          user.proposalDirectives,
          { language: project.language }
        );
      } else {
        return await aiService.buildProposal(
          project.description,
          { language: project.language }
        );
      }
    } catch (aiError) {
      logger.error('Error generando propuesta con IA:', aiError);
      throw new Error('Error generando propuesta con IA: ' + aiError.message);
    }
  }

  async sendProposalWithCustomContent(projectId, userId, proposalContent) {
    try {
      logger.info(`Enviando propuesta personalizada para proyecto ${projectId} con usuario ${userId}`);
      
      this._validateProjectId(projectId);
      this._validateUserId(userId);
      this._validateProposalContent(proposalContent);
      
      const project = await this._validateProjectExists(projectId);
      const user = await this._validateUserAccess(userId);
      
      await this._checkExistingProposal(userId, projectId);
      await this._ensureBrowserReady();
      await this._ensureUserSession(user);
      
      await this._navigateToCustomProposal(project);
      await this._fillCustomProposalForm(proposalContent);
      await this._submitCustomProposal();
      
      await this._saveProposalRecord(user, projectId, proposalContent);
      
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

  async _navigateToCustomProposal(project) {
    const jobSlug = project.link.split('/job/')[1];
    const projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
    
    logger.info(`Navegando a: ${projectUrl}`);
    
    await this.page.goto(projectUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await this.page.waitForTimeout(3000);
    await this._verifyProposalPage();
  }

  async _fillCustomProposalForm(proposalContent) {
    const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"], textarea[name="message"], textarea[placeholder*="propuesta"], textarea[placeholder*="mensaje"]').first();
    
    if (await proposalTextArea.count() === 0) {
      await this._handleMissingTextArea(proposalContent);
    } else {
      logger.info('Se encontró el textarea, llenando el área de texto directamente');
      await proposalTextArea.fill(proposalContent);
      await this.page.waitForTimeout(1000);
    }
  }

  async _handleMissingTextArea(proposalContent) {
    logger.info('No se encontró el textarea, buscando botón de aplicar/enviar propuesta');
    
    const applyButton = this.page.locator('[data-testid="apply-project-button"], .btn-primary:has-text("Enviar propuesta"), .btn:has-text("Enviar propuesta"), button:has-text("Aplicar")').first();
    
    if (await applyButton.count() > 0) {
      logger.info('Haciendo clic en botón de aplicar/enviar propuesta');
      await applyButton.click();
      await this.page.waitForTimeout(3000);
      
      const proposalTextAreaAfterClick = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"], textarea[name="message"], textarea[placeholder*="propuesta"], textarea[placeholder*="mensaje"]').first();
      
      if (await proposalTextAreaAfterClick.count() === 0) {
        throw new Error('No se encontró el campo de texto para la propuesta');
      }
      
      await proposalTextAreaAfterClick.fill(proposalContent);
      await this.page.waitForTimeout(1000);
    } else {
      throw new Error('No se encontró el botón para enviar propuesta ni el campo de texto');
    }
  }

  async _submitCustomProposal() {
    const finalSubmitButton = this.page.locator(`
      .wk-submit-block input[type="submit"][value="Enviar"],
      .wk-submit-block input[type="submit"].btn-primary,
      input[type="submit"][value="Enviar"].btn.btn-primary,
      .wk-submit-block input.btn-primary[type="submit"]
    `).first();
    
    if (await finalSubmitButton.count() === 0) {
      throw new Error('No se encontró el botón final de envío');
    }

    logger.info('Haciendo clic en el botón final de envío');
    await finalSubmitButton.click();
    await this.page.waitForTimeout(5000);
    
    await this._verifySubmissionSuccess();
  }

  // ===========================================
  // CLEANUP AND UTILITIES
  // ===========================================

  async cleanup() {
    try {
      await this.closeBrowser();
      this.isLoggedIn = false;
    } catch (error) {
      logger.errorWithStack('Error en cleanup de WorkanaService', error);
    }
  }
}

module.exports = WorkanaService;