const { chromium } = require('playwright');
const BaseScraper = require('../scrapers/BaseScraper');
const Project = require('../models/Project');
const logger = require('../utils/logger');
// const { franc } = require('franc'); // Temporarily disabled due to ESM issue

class WorkanaService extends BaseScraper {
  // ===========================================
  // HTML SELECTORS & CSS CLASSES
  // ===========================================
  
  static SELECTORS = {
    // Project selectors
    PROJECT_ITEM: '.project-item',
    PROJECT_TITLE: '.project-title span span',
    PROJECT_TITLE_LINK: '.project-title a',
    PROJECT_DESCRIPTION: '.project-details p',
    PROJECT_BUDGET: '.budget span span',
    PROJECT_SKILLS: '.skills .skill h3',
    PROJECT_VIEW_MORE: '.project-details p a[href="#"]',
    
    // Client info selectors
    CLIENT_NAME: '.author-info a span',
    CLIENT_COUNTRY: '.project-author .country .country-name a, .country .country-name a, .country-name a',
    CLIENT_POPOVER: '.project-author .author-info .js-popover-stay, .author-info .js-popover-stay, .js-popover-stay',
    CLIENT_RATING: '.stars-bg',
    PAYMENT_VERIFIED: '.payment-verified, .payment .payment-verified',
    
    // Project features
    FEATURED_PROJECT: '.project-item-featured',
    MAX_PROJECT_LABEL: '.label-max',
    
    // Login form selectors
    LOGIN_FORM: 'form, .login-form',
    EMAIL_INPUT: 'input[type="email"], input[type="text"]',
    
    // Cookie consent selectors
    COOKIE_BUTTONS: [
      'button:has-text("Aceptar")',
      'button:has-text("Accept")',
      'button:has-text("Aceitar")',
      '.cookie-accept',
      '[data-testid="cookie-accept"]',
      '#cookie-accept',
      '.btn-accept-cookies'
    ],
    
    // CAPTCHA selectors
    CAPTCHA_SELECTORS: [
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '[data-testid="captcha"]'
    ],
    
    // Login error selectors
    LOGIN_ERRORS: [
      'text=Usuario o contraseña incorrectos',
      'text=Invalid credentials',
      'text=Credenciales inválidas'
    ],
    
    // Logged in navigation elements
    LOGGED_IN_NAV: [
      'text=Contrata',
      'text=Mis proyectos',
      'text=Mis finanzas',
      'button:has-text("Contrata")',
      'button:has-text("Mis proyectos")'
    ],
    
    // Proposal form selectors
    PROPOSAL_TEXT_AREA: 'textarea, .proposal-text, [data-testid="proposal-text"]',
    PROPOSAL_SUBMIT_BUTTON: `
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
    `,
    
    // Success message selectors
    SUCCESS_MESSAGES: [
      '.success-message',
      '.alert-success',
      '[data-testid="success-message"]',
      'div:has-text("Propuesta enviada")',
      'div:has-text("Proposal sent")'
    ]
  };

  static URLS = {
    BASE: 'https://www.workana.com',
    LOGIN: 'https://www.workana.com/login',
    JOBS: 'https://www.workana.com/jobs?category=it-programming&language=en%2Ces'
  };

  static TIMEOUTS = {
    DEFAULT: 30000,
    LOGIN_NAVIGATION: 20000,
    ELEMENT_WAIT: 10000,
    SHORT_WAIT: 3000,
    FORM_WAIT: 500,
    PROPOSAL_SUBMIT: 5000
  };

  // ===========================================
  // CONSTRUCTOR & CONFIGURATION
  // ===========================================
  
  constructor(options = {}) {
    super('workana');
    
    this.baseUrl = WorkanaService.URLS.BASE;
    this.loginUrl = WorkanaService.URLS.LOGIN;
    
    this.browserConfig = {
      headless:  true, // options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };
    
    this.pageConfig = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      timeout: WorkanaService.TIMEOUTS.DEFAULT,
      waitTimeout: WorkanaService.TIMEOUTS.SHORT_WAIT
    };

    this.isLoggedIn = false;
    this.debug = options.debug || false;
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
      
      // Browser initialized
    } catch (error) {
      logger.errorWithStack('Error inicializando browser', error);
      throw error;
    }
  }

  async _configurePage() {
    if (!this.page) return;
    
    // Remove automation indicators
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(window, 'chrome', { 
        value: { runtime: {} },
        writable: true
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'es']
      });
    });
    
    await this.page.setExtraHTTPHeaders({
      'User-Agent': this.pageConfig.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'DNT': '1'
    });
    
    await this.page.setViewportSize(this.pageConfig.viewport);
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      // Browser closed
    } catch (error) {
      logger.errorWithStack('Error cerrando browser', error);
    }
  }

  async _ensureBrowserReady() {
    if (!this.browser || !this.page) {
      await this.initBrowser();
    }
  }

  async initialize() {
    try {
      await this.initBrowser();
      // WorkanaService initialized
    } catch (error) {
      logger.errorWithStack('Error inicializando WorkanaService', error);
      throw error;
    }
  }

  async navigateTo(url) {
    try {
      await this._ensureBrowserReady();
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.pageConfig.timeout 
      });
      await this.page.waitForTimeout(2000);
    } catch (error) {
      logger.errorWithStack('Error navegando a URL', error);
      throw error;
    }
  }

  // ===========================================
  // AUTHENTICATION METHODS
  // ===========================================

  async login(username, password) {
    try {
      if (!username || !password) {
        throw new Error('Se requieren username y password para login');
      }

      // Starting login process

      await this._ensureBrowserReady();
      
      await this._navigateToLogin();
      await this._handleCookieConsent();
      await this._checkForCaptcha();
      await this._fillLoginForm(username, password);
      await this._submitLogin();
      await this._verifyLoginSuccess();
      
      this.isLoggedIn = true;
      
      // Login successful
      
      return {
        success: true,
        message: 'Login exitoso'
      };
    } catch (error) {
      this.isLoggedIn = false;
      logger.errorWithStack('Error en login de Workana', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _navigateToLogin() {
    // Navigating to login page
    
    try {
      // First try with networkidle
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'networkidle',
        timeout: WorkanaService.TIMEOUTS.LOGIN_NAVIGATION
      });
    } catch (error) {
      // Fallback: trying with domcontentloaded
      // Fallback to domcontentloaded if networkidle fails
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    }
    
    // Wait for form to be ready
    await this.page.waitForSelector(WorkanaService.SELECTORS.EMAIL_INPUT, { timeout: WorkanaService.TIMEOUTS.ELEMENT_WAIT });
    await this.page.waitForTimeout(WorkanaService.TIMEOUTS.SHORT_WAIT);
    
    // Login page loaded successfully
  }

  async _handleCookieConsent() {
    try {
      // Wait a bit for cookie banner to appear
      await this.page.waitForTimeout(1000);
      
      // Look for cookie consent buttons with more specific selectors
      for (const selector of WorkanaService.SELECTORS.COOKIE_BUTTONS) {
        const cookieButton = this.page.locator(selector).first();
        if (await cookieButton.count() > 0 && await cookieButton.isVisible()) {
          // Accepting cookies
          await cookieButton.click();
          await this.page.waitForTimeout(1000);
          break;
        }
      }
    } catch (error) {
      // No cookie banner found or error handling it
    }
  }

  async _checkForCaptcha() {
    try {
      for (const selector of WorkanaService.SELECTORS.CAPTCHA_SELECTORS) {
        const captcha = this.page.locator(selector).first();
        if (await captcha.count() > 0) {
          throw new Error('CAPTCHA detectado. No se puede proceder automáticamente.');
        }
      }
    } catch (error) {
      if (error.message.includes('CAPTCHA')) {
        throw error;
      }
    }
  }

  async _fillLoginForm(username, password) {
    // Wait for the form to be fully loaded
    await this.page.waitForSelector(WorkanaService.SELECTORS.LOGIN_FORM, { timeout: WorkanaService.TIMEOUTS.ELEMENT_WAIT });
    
    // Use more specific and reliable selectors based on actual Workana structure
    const emailInput = this.page.getByRole('textbox', { name: /email/i }).first();
    const passwordInput = this.page.getByRole('textbox', { name: /contraseña|password/i }).first();
    
    // Verify fields exist
    if (await emailInput.count() === 0) {
      throw new Error('No se encontró el campo de email');
    }
    if (await passwordInput.count() === 0) {
      throw new Error('No se encontró el campo de contraseña');
    }
    
    // Clear and fill the fields
    await emailInput.clear();
    await emailInput.fill(username);
    await this.page.waitForTimeout(WorkanaService.TIMEOUTS.FORM_WAIT);
    
    await passwordInput.clear();
    await passwordInput.fill(password);
    await this.page.waitForTimeout(WorkanaService.TIMEOUTS.FORM_WAIT);
    
    // Login fields completed
  }

  async _submitLogin() {
    // Use more reliable selector for the login button
    const submitButton = this.page.getByRole('button', { name: /ingresa|login|iniciar/i }).first();
    
    if (await submitButton.count() === 0) {
      throw new Error('No se encontró el botón de login');
    }
    
    // Clicking login button
    
    // Click and wait for navigation
    await Promise.all([
      this.page.waitForURL('**/login', { waitUntil: 'domcontentloaded', timeout: WorkanaService.TIMEOUTS.DEFAULT }),
      submitButton.click()
    ]);
    
    await this.page.waitForTimeout(2000);
  }

  async _verifyLoginSuccess() {
    try {
      // Wait for page to settle after navigation
      await this.page.waitForTimeout(WorkanaService.TIMEOUTS.SHORT_WAIT);
      
      // Check for specific login error scenarios
      const loginError = await this._detectSpecificLoginError();
      if (loginError) {
        throw loginError;
      }
      
      const currentUrl = this.page.url();
      
      // Check if still on login page - indicates failure
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        // Wait a bit more in case of slow navigation
        await this.page.waitForTimeout(3000);
        const urlAfterWait = this.page.url();
        if (urlAfterWait.includes('/login') || urlAfterWait.includes('/signin')) {
          // If still on login page, check for specific errors again
          const retryError = await this._detectSpecificLoginError();
          if (retryError) {
            throw retryError;
          }
          throw new Error('UNKNOWN_LOGIN_ERROR|Login falló - permanecemos en la página de login');
        }
      }
      
      // Verify we're logged in
      const isLoggedIn = await this._checkLoggedInElements();
      if (!isLoggedIn) {
        // One retry after additional wait
        await this.page.waitForTimeout(2000);
        const isLoggedInRetry = await this._checkLoggedInElements();
        if (!isLoggedInRetry) {
          // Take screenshot for debugging if enabled
          if (this.debug) {
            try {
              await this.page.screenshot({ path: 'login-verification-failed.png' });
            } catch (screenshotError) {
              // Ignore screenshot errors
            }
          }
          throw new Error('UNKNOWN_LOGIN_ERROR|Login falló - no se detectó sesión activa después de múltiples intentos');
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  async _detectSpecificLoginError() {
    try {
      // Wait a moment for any error messages to appear
      await this.page.waitForTimeout(1000);
      
      // Get page content to analyze
      const pageContent = await this.page.content();
      
      // Check for invalid credentials error (multiple variations)
      const invalidCredentialsPatterns = [
        'Combinación de email y contraseña inválidos',
        'Usuario o contraseña incorrectos',
        'Invalid credentials',
        'Credenciales inválidas',
        'contraseña inválidos'
      ];
      
      for (const pattern of invalidCredentialsPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error('INVALID_CREDENTIALS|Correo o contraseña incorrectos');
        }
      }
      
      // Check for CAPTCHA required error
      const captchaPatterns = [
        'Completa el CAPTCHA e intenta nuevamente',
        'Complete the CAPTCHA',
        'CAPTCHA requerido',
        'reCAPTCHA'
      ];
      
      for (const pattern of captchaPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error('CAPTCHA_REQUIRED|Se requiere completar CAPTCHA. Demasiados intentos fallidos');
        }
      }
      
      // Check for account blocked/temporarily locked
      const blockedPatterns = [
        'Tu cuenta ha sido bloqueada temporalmente',
        'Account temporarily blocked',
        'Cuenta bloqueada',
        'Account suspended'
      ];
      
      for (const pattern of blockedPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error('ACCOUNT_BLOCKED|Cuenta bloqueada temporalmente por seguridad');
        }
      }
      
      // Check for email not verified
      const verificationPatterns = [
        'Por favor verifica tu correo electrónico',
        'Please verify your email',
        'Email no verificado',
        'Account not verified'
      ];
      
      for (const pattern of verificationPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error('EMAIL_NOT_VERIFIED|Cuenta no verificada. Revisa tu correo electrónico');
        }
      }
      
      // Check for rate limiting/too many attempts
      const rateLimitPatterns = [
        'Demasiados intentos',
        'Too many attempts',
        'Rate limit exceeded',
        'Espera antes de intentar'
      ];
      
      for (const pattern of rateLimitPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error('RATE_LIMITED|Demasiados intentos de login. Espera unos minutos');
        }
      }
      
      // Check for generic server errors
      const serverErrorPatterns = [
        'Ha ocurrido un error',
        'Error del servidor',
        'Servicio no disponible',
        'Internal server error',
        'Service unavailable'
      ];
      
      for (const pattern of serverErrorPatterns) {
        if (pageContent.includes(pattern)) {
          return new Error(`SERVER_ERROR|Error del servidor - ${pattern}`);
        }
      }
      
      // Check for CAPTCHA iframe presence (visual CAPTCHA)
      for (const selector of WorkanaService.SELECTORS.CAPTCHA_SELECTORS) {
        const captcha = this.page.locator(selector).first();
        if (await captcha.count() > 0) {
          return new Error('CAPTCHA_REQUIRED|CAPTCHA detectado en la página');
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async _checkLoggedInElements() {
    try {
      // Check current URL first - most reliable indicator
      const currentUrl = this.page.url();
      
      // If we're on dashboard or not on login page, we're likely logged in
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/messages') || currentUrl.includes('/projects')) {
        return true;
      }
      
      // If still on login page, we failed
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        return false;
      }
      
      // Look for user avatar/profile button in navigation
      const userButton = this.page.getByRole('button').filter({ hasText: /josé|usuario|user|perfil|profile/i }).first();
      if (await userButton.count() > 0) {
        return true;
      }
      
      // Look for user avatar image
      const userAvatar = this.page.locator('img[alt*="José"], img[alt*="usuario"], img[alt*="user"]').first();
      if (await userAvatar.count() > 0) {
        return true;
      }
      
      // Look for navigation elements that only appear when logged in
      for (const selector of WorkanaService.SELECTORS.LOGGED_IN_NAV) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.errorWithStack('Error verificando elementos de login', error);
      return false;
    }
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  async loadSessionData(sessionData) {
    try {
      if (!sessionData || !sessionData.cookies) {
        return false;
      }

      await this._ensureBrowserReady();
      await this.page.context().addCookies(sessionData.cookies);
      
      const isValid = await this.validateSession();
      if (isValid) {
        this.isLoggedIn = true;
        // Workana session loaded successfully
        return true;
      } else {
        // Workana session invalid
        return false;
      }
    } catch (error) {
      logger.errorWithStack('Error cargando sesión', error);
      return false;
    }
  }

  async validateSession() {
    try {
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: WorkanaService.TIMEOUTS.DEFAULT
      });
      
      await this.page.waitForTimeout(2000);
      
      return await this._checkLoggedInElements();
    } catch (error) {
      logger.errorWithStack('Error validando sesión', error);
      return false;
    }
  }

  async saveSession(userId) {
    try {
      if (!this.page) {
        throw new Error('No hay página activa para guardar sesión');
      }

      const sessionData = await this._createSessionData();
      
      // En el CLI, simplemente retornamos los datos de sesión
      // En una implementación real, esto se guardaría en la base de datos
      // Session saved for user
      
      return {
        success: true,
        sessionData: sessionData,
        userId: userId
      };
    } catch (error) {
      logger.errorWithStack('Error guardando sesión', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _createSessionData() {
    try {
      const cookies = await this.page.context().cookies();
      const localStorage = []
      
      return {
        cookies: cookies,
        localStorage: localStorage,
        timestamp: new Date().toISOString(),
        platform: 'workana'
      };
    } catch (error) {
      logger.errorWithStack('Error creando datos de sesión', error);
      throw error;
    }
  }

  _validateUserId(userId) {
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('userId debe ser un número válido');
    }
  }

  // ===========================================
  // PROJECT SCRAPING METHODS
  // ===========================================

  getUrl() {
    return WorkanaService.URLS.JOBS;
  }

  getProjectSelector() {
    return WorkanaService.SELECTORS.PROJECT_ITEM;
  }

  detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length < 10) {
        // Text too short or invalid for language detection
        return 'unknown';
      }

      const cleanText = text.trim();
      
      // Temporary fallback while franc is disabled
      let langCode = 'spa'; // Default to Spanish for Workana
      if (cleanText.match(/\b(the|and|or|with|for|to|of|in|on|at|by|from)\b/gi)) {
        langCode = 'eng';
      }
      
            // Language detection result
      
      // Map franc language codes to our desired format
      const languageMap = {
        'spa': 'es',
        'eng': 'en',
        'und': 'unknown' // undetermined
      };

      const result = languageMap[langCode] || 'unknown';
      // Final language mapping
      
      return result;
    } catch (error) {
      logger.warn('Error detecting language', { 
        error: error.message,
        stack: error.stack,
        textLength: text ? text.length : 0
      });
      return 'unknown';
    }
  }

  async scrapeProjects() {
    // Scraping projects starting
    try {
      await this.page.waitForSelector(this.getProjectSelector());
      
      // Expandir detalles de proyectos
      await this.expandProjectDetails();
      
      const projects = await this.page.$$eval(this.getProjectSelector(), (elements, selectors) => {
        return elements.map((element) => {
          try {
            const titleElement = element.querySelector(selectors.PROJECT_TITLE);
            const title = titleElement?.getAttribute('title') || titleElement?.innerText || '';
            
            let description = element.querySelector(selectors.PROJECT_DESCRIPTION)?.textContent || '';
            description = description.replace('Ver menos', '').replace('Ver más', '').trim();
            
            const priceElement = element.querySelector(selectors.PROJECT_BUDGET);
            const price = priceElement?.innerHTML || priceElement?.innerText || '';
            
            const linkElement = element.querySelector(selectors.PROJECT_TITLE_LINK);
            let link = linkElement?.href || '';
            
            // Limpiar URL
            link = link.split('?')[0];
            
            // Limpiar descripción
            description = description.split('Categoría: ')[0];
            description = description.split('Category: ')[0];
            description = description.trim();
            
            // Extraer skills
            const skillElements = element.querySelectorAll(selectors.PROJECT_SKILLS);
            let skills = Array.from(skillElements).map(skill => skill.textContent.trim()).join(', ')

            // Check if skills is array
            if(Array.isArray(skills)){
              skills = ''
            }
            
            // Extraer información del cliente
            let clientName = '';
            let clientCountry = '';
            let clientRating = 0;
            let paymentVerified = false;
            
            // Intentar múltiples selectores para el nombre del cliente
            const clientNameElement = element.querySelector(selectors.CLIENT_NAME);
            if (clientNameElement) {
              clientName = clientNameElement.textContent.trim();
            }
            
            // Intentar múltiples selectores para el país - usar primer selector que funcione
            const countrySelectors = selectors.CLIENT_COUNTRY.split(', ');
            let countryElement = null;
            for (const selector of countrySelectors) {
              countryElement = element.querySelector(selector);
              if (countryElement) break;
            }
            if (countryElement) {
              clientCountry = countryElement.textContent.trim();
            }
            
            // Extraer rating del cliente (del data-content del popover)
            const popoverSelectors = selectors.CLIENT_POPOVER.split(', ');
            let popoverElement = null;
            for (const selector of popoverSelectors) {
              popoverElement = element.querySelector(selector);
              if (popoverElement) break;
            }
            
            if (popoverElement) {
              const popoverContent = popoverElement.getAttribute('data-content') || '';
              
              // Buscar rating en el contenido del popover
              const ratingMatch = element.querySelector(selectors.CLIENT_RATING);
              if (ratingMatch) {
                // get title attribute value
                clientRating = parseFloat(ratingMatch.getAttribute('title'));
              }
              
              // Verificar si el método de pago está verificado
              paymentVerified = popoverContent.includes('Método de pago:') && popoverContent.includes('Verificado');
            }
            
            // También verificar si está verificado directamente en el DOM visible
            if (!paymentVerified) {
              const paymentVerifiedSelectors = selectors.PAYMENT_VERIFIED.split(', ');
              for (const selector of paymentVerifiedSelectors) {
                const paymentVerifiedElement = element.querySelector(selector);
                if (paymentVerifiedElement) {
                  paymentVerified = true;
                  break;
                }
              }
            }
            
            // Verificar si es proyecto destacado
            const isFeatured = element.classList.contains(selectors.FEATURED_PROJECT.replace('.', ''));
            
            // Verificar si es proyecto max
            const isMaxProject = element.querySelector(selectors.MAX_PROJECT_LABEL) !== null;
            
            return {
              title,
              description,
              price,
              skills,
              link,
              client_name: clientName,
              client_country: clientCountry,
              client_rating: clientRating,
              payment_verified: paymentVerified,
              is_featured: isFeatured,
              is_max_project: isMaxProject,
              platform: 'workana',
              titleAndDescription: title + ' ' + description
            };
          } catch (error) {
            console.error('Error parsing individual project:', error);
            return null;
          }
        }).filter(Boolean);
      }, WorkanaService.SELECTORS);

      // Projects scraped, detecting language
      
      const projectInstances = projects.map(projectData => {
        // Detect language from title and description
        const textForLanguageDetection = projectData.titleAndDescription;
        
        const language = this.detectLanguage(textForLanguageDetection);
        
        // Remove the temporary field and add language
        const finalProjectData = {
          ...projectData,
          language: language
        };
        delete finalProjectData.titleAndDescription;
        
        return new Project(finalProjectData);
      });
            
      return projectInstances;
    } catch (error) {
      logger.errorWithStack(`Error scrapeando proyectos de ${this.platform}`, error);
      throw error;
    }
  }

  async expandProjectDetails() {
    try {
      // Expandir todos los links "Ver más detalles"
      await this.page.$$eval(this.getProjectSelector(), (projects, selector) => {
        projects.forEach(project => {
          // Buscar el link "Ver más detalles" en el párrafo de la descripción
          const viewMoreLink = project.querySelector(selector);
          if (viewMoreLink && (viewMoreLink.innerText.includes('Ver más') 
            || viewMoreLink.innerText.includes('Ver más detalles')
            || viewMoreLink.innerText.includes('View more')
            || viewMoreLink.innerText.includes('View more details')
          )) {
            viewMoreLink.click();
          }
        });
      }, WorkanaService.SELECTORS.PROJECT_VIEW_MORE);
      
      // Esperar un poco para que se expandan los detalles
      await this.page.waitForTimeout(2000);
      
      // Project details expanded
    } catch (error) {
      logger.warn(`Error expandiendo detalles de proyectos en ${this.platform}`, error);
    }
  }

  async waitForProjects() {
    try {
      await this.page.waitForSelector(this.getProjectSelector(), { timeout: WorkanaService.TIMEOUTS.ELEMENT_WAIT });
      return true;
    } catch (error) {
      logger.warn(`No se encontraron proyectos en ${this.platform} o timeout`, error);
      return false;
    }
  }

  async simulateHumanBehavior() {
    try {
      // Comportamiento específico para Workana
      await super.simulateHumanBehavior();
      
      // Esperar a que se carguen los proyectos
      const projectsFound = await this.waitForProjects();
      
      if (projectsFound) {
        // Scroll más suave para Workana
        const scrollActions = 3;
        for (let i = 0; i < scrollActions; i++) {
          const scrollDownAmount = this.getRandomInt(200, 600);
          await this.page.mouse.wheel(0, scrollDownAmount);
          
          const randomWait = this.getRandomInt(2000, 5000);
          await this.page.waitForTimeout(randomWait);
          
          const scrollUpAmount = this.getRandomInt(50, 200);
          await this.page.mouse.wheel(0, -scrollUpAmount);
        }
        
        // Workana-specific human behavior completed
      }
      
    } catch (error) {
      logger.errorWithStack(`Error en simulación de comportamiento humano para ${this.platform}`, error);
      throw error;
    }
  }

  cleanProjectData(projectData) {
    // Limpieza específica para datos de Workana
    return {
      ...projectData,
      title: projectData.title?.trim() || '',
      description: projectData.description?.trim() || '',
      link: projectData.link?.split('?')[0] || '', // Remover query params
      price: projectData.price?.trim() || '',
      skills: Array.isArray(projectData.skills) ? '' : (projectData.skills?.trim() || ''),
      client_name: projectData.clientName?.trim() || '',
      language: projectData.language || 'unknown',
      client_country: projectData.clientCountry?.trim() || '',
      client_rating: projectData.clientRating || 0,
      payment_verified: projectData.paymentVerified || false,
      is_featured: projectData.isFeatured || false,
      is_max_project: projectData.isMaxProject || false,
      info: ''
    };
  }

  async scrapeProjectsList() {
    try {
      // Starting scraping process
      
      await this.initialize();
      await this.navigateTo(this.getUrl());
      await this.simulateHumanBehavior();
      
      const projects = await this.scrapeProjects();
      
      // Limpiar datos de proyectos
      const cleanedProjects = projects.map(project => {
        const cleaned = this.cleanProjectData(project);
        return new Project(cleaned);
      });
      
      await this.close();
      
      // Process completed
      
      return cleanedProjects;
    } catch (error) {
      logger.errorWithStack(`Error ejecutando scraper de ${this.platform}`, error);
      await this.close();
      throw error;
    }
  }

  // ===========================================
  // PROPOSAL MANAGEMENT
  // ===========================================

  async sendProposal(sessionData, proposalText, projectLink) {
    try {
      // Validar que se proporcionen los datos requeridos
      if (!sessionData) {
        throw new Error('Se requieren datos de sesión');
      }
      
      if (!proposalText || typeof proposalText !== 'string' || proposalText.trim().length === 0) {
        throw new Error('Se requiere texto de propuesta válido');
      }

      if (!projectLink || typeof projectLink !== 'string') {
        throw new Error('Se requiere link del proyecto válido');
      }

      // Sending proposal with session and custom text
      
      // Cargar y validar sesión
      const sessionLoaded = await this.loadSessionData(sessionData);
      if (!sessionLoaded) {
        throw new Error('Sesión inválida o expirada');
      }
      
      // Navegar al proyecto usando el link proporcionado
      await this.page.goto(projectLink, { 
        waitUntil: 'domcontentloaded',
        timeout: WorkanaService.TIMEOUTS.DEFAULT
      });
      
      await this.page.waitForTimeout(2000);
      
      // Enviar propuesta
      await this._fillAndSubmitProposal(proposalText.trim());
      
      // Proposal sent successfully
      
      return {
        success: true,
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

  async _fillAndSubmitProposal(proposalText) {
    const proposalTextArea = this.page.locator(WorkanaService.SELECTORS.PROPOSAL_TEXT_AREA).first();
    
    if (await proposalTextArea.count() === 0) {
      throw new Error('No se encontró el área de texto de la propuesta');
    }
    
    await proposalTextArea.fill(proposalText);
    await this.page.waitForTimeout(1000);
    
    const sendButton = this._getSubmitProposalButtonLocator();

    if(await sendButton.count() === 0) {
      throw new Error('No se encontró el botón de envío de propuesta');
    }

    await sendButton.click();
    await this.page.waitForTimeout(WorkanaService.TIMEOUTS.PROPOSAL_SUBMIT);
    
    await this._verifySubmissionSuccess();
  }

  _getSubmitProposalButtonLocator() {
    const button = this.page.locator(WorkanaService.SELECTORS.PROPOSAL_SUBMIT_BUTTON).filter({ hasNotText: 'Buscar' }).filter({ hasNotText: 'Search' }).first();
    return button;
  }

  async _verifySubmissionSuccess() {
    try {
      // Esperar a que la página cambie o aparezca un mensaje de éxito
      await this.page.waitForTimeout(WorkanaService.TIMEOUTS.SHORT_WAIT);
      
      for (const selector of WorkanaService.SELECTORS.SUCCESS_MESSAGES) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          return true;
        }
      }
      
      // Si no encontramos mensaje de éxito, verificar que no estamos en la página de propuesta
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/messages/bid/')) {
        return true; // Asumimos éxito si salimos de la página de propuesta
      }
      
      return true; // Asumimos éxito por defecto
    } catch (error) {
      logger.errorWithStack('Error verificando envío exitoso', error);
      return true; // Asumimos éxito por defecto
    }
  }
}

module.exports = WorkanaService;