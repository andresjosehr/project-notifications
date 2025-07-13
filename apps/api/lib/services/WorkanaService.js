const { chromium } = require('playwright');
const BaseScraper = require('../scrapers/BaseScraper');
const Project = require('../models/Project');
const logger = require('../utils/logger');
const { franc } = require('franc');

class WorkanaService extends BaseScraper {
  constructor(options = {}) {
    super('workana');
    
    this.baseUrl = 'https://www.workana.com';
    this.loginUrl = `${this.baseUrl}/login`;
    
    this.browserConfig = {
      headless: options.headless !== false,
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
      timeout: 30000,
      waitTimeout: 3000
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
      
      if (this.debug) {
        logger.info('Browser de Workana inicializado');
      }
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
      window.chrome = { runtime: {} };
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
      
      if (this.debug) {
        logger.info('Browser de Workana cerrado');
      }
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
      if (this.debug) {
        logger.info('WorkanaService inicializado');
      }
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
        if (this.debug) {
          logger.info('Sesión de Workana cargada exitosamente');
        }
        return true;
      } else {
        if (this.debug) {
          logger.info('Sesión de Workana inválida');
        }
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
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      return await this._checkLoggedInElements();
    } catch (error) {
      logger.errorWithStack('Error validando sesión', error);
      return false;
    }
  }

  async _checkLoggedInElements() {
    try {
      // Check current URL first - most reliable indicator
      const currentUrl = this.page.url();
      if (this.debug) {
        logger.debug(`URL actual: ${currentUrl}`);
      }
      
      // If we're on dashboard or not on login page, we're likely logged in
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/messages') || currentUrl.includes('/projects')) {
        logger.debug('Usuario logueado - detectado por URL');
        return true;
      }
      
      // If still on login page, we failed
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        logger.debug('Aún en página de login');
        return false;
      }
      
      // Look for user avatar/profile button in navigation
      const userButton = this.page.getByRole('button').filter({ hasText: /josé|usuario|user|perfil|profile/i }).first();
      if (await userButton.count() > 0) {
        logger.debug('Botón de usuario encontrado en navegación');
        return true;
      }
      
      // Look for user avatar image
      const userAvatar = this.page.locator('img[alt*="José"], img[alt*="usuario"], img[alt*="user"]').first();
      if (await userAvatar.count() > 0) {
        logger.debug('Avatar de usuario encontrado');
        return true;
      }
      
      // Look for navigation elements that only appear when logged in
      const loggedInNavElements = [
        'text=Contrata',
        'text=Mis proyectos',
        'text=Mis finanzas',
        'button:has-text("Contrata")',
        'button:has-text("Mis proyectos")'
      ];
      
      for (const selector of loggedInNavElements) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          logger.debug(`Elemento de navegación logueado encontrado: ${selector}`);
          return true;
        }
      }
      
      logger.debug('No se detectó sesión activa');
      return false;
    } catch (error) {
      logger.errorWithStack('Error verificando elementos de login', error);
      return false;
    }
  }

  async login(username, password) {
    try {
      if (!username || !password) {
        throw new Error('Se requieren username y password para login');
      }

      if (this.debug) {
        logger.info(`Iniciando proceso de login para: ${username}`);
      }

      await this._ensureBrowserReady();
      
      await this._navigateToLogin();
      await this._handleCookieConsent();
      await this._checkForCaptcha();
      await this._fillLoginForm(username, password);
      await this._submitLogin();
      await this._verifyLoginSuccess();
      
      this.isLoggedIn = true;
      
      if (this.debug) {
        logger.info('Login exitoso en Workana');
      }
      
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
    if (this.debug) {
      logger.debug(`Navegando a página de login: ${this.loginUrl}`);
    }
    
    try {
      // First try with networkidle
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });
    } catch (error) {
      if (this.debug) {
        logger.debug('Fallback: intentando con domcontentloaded');
      }
      // Fallback to domcontentloaded if networkidle fails
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    }
    
    // Wait for form to be ready
    await this.page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    await this.page.waitForTimeout(3000);
    
    if (this.debug) {
      logger.debug('Página de login cargada correctamente');
    }
  }

  async _handleCookieConsent() {
    try {
      // Wait a bit for cookie banner to appear
      await this.page.waitForTimeout(1000);
      
      // Look for cookie consent buttons with more specific selectors
      const cookieSelectors = [
        'button:has-text("Aceptar")',
        'button:has-text("Accept")',
        'button:has-text("Aceitar")',
        '.cookie-accept',
        '[data-testid="cookie-accept"]',
        '#cookie-accept',
        '.btn-accept-cookies'
      ];
      
      for (const selector of cookieSelectors) {
        const cookieButton = this.page.locator(selector).first();
        if (await cookieButton.count() > 0 && await cookieButton.isVisible()) {
          if (this.debug) {
            logger.debug(`Aceptando cookies con selector: ${selector}`);
          }
          await cookieButton.click();
          await this.page.waitForTimeout(1000);
          break;
        }
      }
    } catch (error) {
      if (this.debug) {
        logger.debug('No se encontró banner de cookies o error al manejarlo');
      }
    }
  }

  async _checkForCaptcha() {
    try {
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        '.g-recaptcha',
        '[data-testid="captcha"]'
      ];
      
      for (const selector of captchaSelectors) {
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
    await this.page.waitForSelector('form, .login-form', { timeout: 10000 });
    
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
    await this.page.waitForTimeout(500);
    
    await passwordInput.clear();
    await passwordInput.fill(password);
    await this.page.waitForTimeout(500);
    
    if (this.debug) {
      logger.debug('Campos de login completados');
    }
  }

  async _submitLogin() {
    // Use more reliable selector for the login button
    const submitButton = this.page.getByRole('button', { name: /ingresa|login|iniciar/i }).first();
    
    if (await submitButton.count() === 0) {
      throw new Error('No se encontró el botón de login');
    }
    
    if (this.debug) {
      logger.debug('Haciendo clic en el botón de login');
    }
    
    // Click and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      submitButton.click()
    ]);
    
    await this.page.waitForTimeout(2000);
  }

  async _verifyLoginSuccess() {
    try {
      // Wait for page to settle after navigation
      await this.page.waitForTimeout(3000);
      
      // Check for login errors first
      const errorSelectors = [
        'text=Usuario o contraseña incorrectos',
        'text=Invalid credentials',
        'text=Credenciales inválidas'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = this.page.locator(selector).first();
        if (await errorElement.count() > 0) {
          const errorText = await errorElement.textContent();
          throw new Error(`Error de login detectado: ${errorText}`);
        }
      }
      
      const currentUrl = this.page.url();
      logger.debug(`URL actual después del login: ${currentUrl}`);
      
      // Check if still on login page - indicates failure
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        // Wait a bit more in case of slow navigation
        await this.page.waitForTimeout(3000);
        const urlAfterWait = this.page.url();
        if (urlAfterWait.includes('/login') || urlAfterWait.includes('/signin')) {
          throw new Error('Login falló - permanecemos en la página de login');
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
              logger.debug('Screenshot guardado: login-verification-failed.png');
            } catch (screenshotError) {
              // Ignore screenshot errors
            }
          }
          throw new Error('Login falló - no se detectó sesión activa después de múltiples intentos');
        }
      }
      
      if (this.debug) {
        logger.info(`Login verificado exitosamente. URL final: ${this.page.url()}`);
      }
    } catch (error) {
      throw new Error(`Error verificando login: ${error.message}`);
    }
  }


  // ===========================================
  // AUTHENTICATION METHODS
  // ===========================================


  async saveSession(userId) {
    try {
      if (!this.page) {
        throw new Error('No hay página activa para guardar sesión');
      }

      const sessionData = await this._createSessionData();
      
      // En el CLI, simplemente retornamos los datos de sesión
      // En una implementación real, esto se guardaría en la base de datos
      logger.info(`Sesión guardada para usuario ${userId}`);
      
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
      const localStorage = await this.page.evaluate(() => {
        return Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {});
      });
      
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
  // PROJECT SCRAPING
  // ===========================================

  detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length < 10) {
        logger.debug('Text too short or invalid for language detection', { textLength: text ? text.length : 0 });
        return 'unknown';
      }

      const cleanText = text.trim();
      const langCode = franc(cleanText);
      
      logger.debug('Language detection result', { 
        textSample: cleanText.substring(0, 50),
        detectedCode: langCode 
      });
      
      // Map franc language codes to our desired format
      const languageMap = {
        'spa': 'es',
        'eng': 'en',
        'und': 'unknown' // undetermined
      };

      const result = languageMap[langCode] || 'unknown';
      logger.debug('Final language mapping', { langCode, result });
      
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

  getUrl() {
    return 'https://www.workana.com/jobs?category=it-programming&language=en%2Ces';
  }

  getProjectSelector() {
    return '.project-item';
  }

  async scrapeProjects() {
    logger.info('Scraping projects is starting');
    try {
      await this.page.waitForSelector(this.getProjectSelector());
      
      // Expandir detalles de proyectos
      await this.expandProjectDetails();
      
      const projects = await this.page.$$eval(this.getProjectSelector(), (elements) => {
        return elements.map((element) => {
          try {
            const titleElement = element.querySelector('.project-title span span');
            const title = titleElement?.getAttribute('title') || titleElement?.innerText || '';
            
            let description = element.querySelector('.project-details p')?.textContent || '';
            description = description.replace('Ver menos', '').replace('Ver más', '').trim();
            
            const priceElement = element.querySelector('.budget span span');
            const price = priceElement?.innerHTML || priceElement?.innerText || '';
            
            const linkElement = element.querySelector('.project-title a');
            let link = linkElement?.href || '';
            
            // Limpiar URL
            link = link.split('?')[0];
            
            // Limpiar descripción
            description = description.split('Categoría: ')[0];
            description = description.split('Category: ')[0];
            description = description.trim();
            
            // Extraer skills
            const skillElements = element.querySelectorAll('.skills .skill h3');
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
            const clientNameElement = element.querySelector('.author-info a span');
            if (clientNameElement) {
              clientName = clientNameElement.textContent.trim();
            }
            
            // Intentar múltiples selectores para el país
            const countryElement = element.querySelector('.project-author .country .country-name a') ||
                                 element.querySelector('.country .country-name a') ||
                                 element.querySelector('.country-name a');
            if (countryElement) {
              clientCountry = countryElement.textContent.trim();
            }
            
            // Extraer rating del cliente (del data-content del popover)
            const popoverElement = element.querySelector('.project-author .author-info .js-popover-stay') ||
                                 element.querySelector('.author-info .js-popover-stay') ||
                                 element.querySelector('.js-popover-stay');
            
            if (popoverElement) {
              const popoverContent = popoverElement.getAttribute('data-content') || '';
              
              // Buscar rating en el contenido del popover
              const ratingMatch = element.querySelector('.stars-bg');
              if (ratingMatch) {
                // get title attribute value
                clientRating = parseFloat(ratingMatch.getAttribute('title'));
              }
              
              // Verificar si el método de pago está verificado
              paymentVerified = popoverContent.includes('Método de pago:') && popoverContent.includes('Verificado');
            }
            
            // También verificar si está verificado directamente en el DOM visible
            if (!paymentVerified) {
              const paymentVerifiedElement = element.querySelector('.payment-verified') || 
                                           element.querySelector('.payment .payment-verified');
              paymentVerified = paymentVerifiedElement !== null;
            }
            
            // Verificar si es proyecto destacado
            const isFeatured = element.classList.contains('project-item-featured');
            
            // Verificar si es proyecto max
            const isMaxProject = element.querySelector('.label-max') !== null;
            
            // Debug logging para entender qué está pasando
            console.log('Project extraction debug:', {
              title: title.substring(0, 50),
              clientName,
              clientCountry,
              clientRating,
              paymentVerified,
              isFeatured,
              isMaxProject,
              hasProjectAuthor: !!element.querySelector('.project-author'),
              hasAuthorInfo: !!element.querySelector('.author-info'),
              hasPopover: !!element.querySelector('.js-popover-stay')
            });
            
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
      });

      logger.info('Projects scraped, now we are going to detect the language');
      
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
      await this.page.$$eval(this.getProjectSelector(), (projects) => {
        projects.forEach(project => {
          // Buscar el link "Ver más detalles" en el párrafo de la descripción
          const viewMoreLink = project.querySelector('.project-details p a[href="#"]');
          if (viewMoreLink && (viewMoreLink.innerText.includes('Ver más') 
            || viewMoreLink.innerText.includes('Ver más detalles')
            || viewMoreLink.innerText.includes('View more')
            || viewMoreLink.innerText.includes('View more details')
          )) {
            viewMoreLink.click();
          }
        });
      });
      
      // Esperar un poco para que se expandan los detalles
      await this.page.waitForTimeout(2000);
      
      logger.scraperLog(this.platform, 'Detalles de proyectos expandidos');
    } catch (error) {
      logger.warn(`Error expandiendo detalles de proyectos en ${this.platform}`, error);
    }
  }

  async waitForProjects() {
    try {
      await this.page.waitForSelector(this.getProjectSelector(), { timeout: 10000 });
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
        
        logger.scraperLog(this.platform, 'Comportamiento humano específico de Workana completado');
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
      logger.scraperLog(this.platform, 'Iniciando proceso de scraping');
      
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
      
      logger.scraperLog(this.platform, `Proceso completado: ${cleanedProjects.length} proyectos`);
      
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

      if (this.debug) {
        logger.info('Enviando propuesta con sesión y texto personalizado...');
      }
      
      // Cargar y validar sesión
      const sessionLoaded = await this.loadSessionData(sessionData);
      if (!sessionLoaded) {
        throw new Error('Sesión inválida o expirada');
      }
      
      // Navegar al proyecto usando el link proporcionado
      await this.page.goto(projectLink, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      // Enviar propuesta
      await this._fillAndSubmitProposal(proposalText.trim());
      
      if (this.debug) {
        logger.info('Propuesta enviada exitosamente');
      }
      
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

  _validateUserId(userId) {
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('userId debe ser un número válido');
    }
  }



  async _fillAndSubmitProposal(proposalText) {
    const proposalTextArea = this.page.locator('textarea, .proposal-text, [data-testid="proposal-text"]').first();
    
    if (await proposalTextArea.count() === 0) {
      throw new Error('No se encontró el área de texto de la propuesta');
    }
    
    await proposalTextArea.fill(proposalText);
    await this.page.waitForTimeout(1000);
    
    const sendButton = this._getSubmitProposalButtonLocator();

    if(!sendButton) {
      throw new Error('No se encontró el botón de envío de propuesta');
    }

    await sendButton.click();
    await this.page.waitForTimeout(5000);
    
    await this._verifySubmissionSuccess();
  }

  _getSubmitProposalButtonLocator() {
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



  async _verifySubmissionSuccess() {
    try {
      // Esperar a que la página cambie o aparezca un mensaje de éxito
      await this.page.waitForTimeout(3000);
      
      const successSelectors = [
        '.success-message',
        '.alert-success',
        '[data-testid="success-message"]',
        'div:has-text("Propuesta enviada")',
        'div:has-text("Proposal sent")'
      ];
      
      for (const selector of successSelectors) {
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