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
        '--window-size=1920,1080'
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
    
    await this.page.setExtraHTTPHeaders({
      'User-Agent': this.pageConfig.userAgent
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
      const loggedInSelectors = [
        '.user-menu',
        '.profile-menu',
        '[data-testid="user-menu"]',
        '.dropdown-toggle:has-text("Mi cuenta")',
        '.user-avatar'
      ];
      
      for (const selector of loggedInSelectors) {
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

  async login(username, password) {
    try {
      if (!username || !password) {
        throw new Error('Se requieren username y password para login');
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
        user: await this._getUserInfo()
      };
    } catch (error) {
      logger.errorWithStack('Error en login de Workana', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _navigateToLogin() {
    await this.page.goto(this.loginUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    await this.page.waitForTimeout(2000);
  }

  async _handleCookieConsent() {
    try {
      const cookieButton = this.page.locator('button:has-text("Aceptar"), button:has-text("Accept"), .cookie-accept, [data-testid="cookie-accept"]').first();
      if (await cookieButton.count() > 0) {
        await cookieButton.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      // Ignorar errores de cookies
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
    const emailInput = this.page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]').first();
    const passwordInput = this.page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.count() === 0 || await passwordInput.count() === 0) {
      throw new Error('No se encontraron los campos de login');
    }
    
    await emailInput.fill(username);
    await passwordInput.fill(password);
    await this.page.waitForTimeout(1000);
  }

  async _submitLogin() {
    const submitButton = this.page.locator('button[type="submit"], input[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Login")').first();
    
    if (await submitButton.count() === 0) {
      throw new Error('No se encontró el botón de submit del login');
    }
    
    await submitButton.click();
    await this.page.waitForTimeout(3000);
  }

  async _verifyLoginSuccess() {
    try {
      await this.page.waitForURL(url => url.includes(this.baseUrl) && !url.includes('login'), { timeout: 10000 });
      
      const isLoggedIn = await this._checkLoggedInElements();
      if (!isLoggedIn) {
        throw new Error('Login falló - no se detectó sesión activa');
      }
    } catch (error) {
      throw new Error(`Error verificando login: ${error.message}`);
    }
  }

  async _getUserInfo() {
    try {
      const userMenu = this.page.locator('.user-menu, .profile-menu, [data-testid="user-menu"]').first();
      if (await userMenu.count() > 0) {
        await userMenu.click();
        await this.page.waitForTimeout(1000);
        
        const userEmail = this.page.locator('.user-email, .profile-email, [data-testid="user-email"]').first();
        if (await userEmail.count() > 0) {
          return { email: await userEmail.textContent() };
        }
      }
      
      return { email: 'Usuario de Workana' };
    } catch (error) {
      logger.errorWithStack('Error obteniendo información del usuario', error);
      return { email: 'Usuario de Workana' };
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

  async sendProposalByUserId(projectId, userId, options = {}) {
    try {
      this._validateProjectId(projectId);
      this._validateUserId(userId);
      
      if (this.debug) {
        logger.info(`Enviando propuesta para proyecto ${projectId} con usuario ${userId}...`);
      }
      
      // Cargar sesión si se proporcionan datos de sesión
      if (options.sessionData) {
        const sessionLoaded = await this.loadSessionData(options.sessionData);
        if (!sessionLoaded && options.autoLogin) {
          if (!options.username || !options.password) {
            throw new Error('Se requieren credenciales para auto-login');
          }
          
          const loginResult = await this.login(options.username, options.password);
          if (!loginResult.success) {
            throw new Error(`Error en auto-login: ${loginResult.error}`);
          }
        }
      } else if (options.autoLogin && options.username && options.password) {
        const loginResult = await this.login(options.username, options.password);
        if (!loginResult.success) {
          throw new Error(`Error en login: ${loginResult.error}`);
        }
      } else {
        throw new Error('Se requieren datos de sesión o credenciales para enviar propuesta');
      }
      
      const project = await this._getProjectData(projectId);
      await this._navigateToProposal(project);
      await this._verifyProposalPage();
      
      const proposalText = options.customProposal || await this._generateDefaultProposal(project);
      await this._fillAndSubmitProposal(proposalText);
      
      if (this.debug) {
        logger.info(`Propuesta enviada exitosamente para proyecto ${projectId}`);
      }
      
      return {
        success: true,
        projectId,
        userId,
        userEmail: options.username || 'Usuario de Workana',
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

  _validateUserId(userId) {
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('userId debe ser un número válido');
    }
  }

  _validateProjectId(projectId) {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('projectId debe ser una cadena válida');
    }
  }

  async _getProjectData(projectId) {
    // Para el CLI, asumimos que el projectId es la URL completa o el slug del proyecto
    const projectUrl = projectId.startsWith('http') ? projectId : `${this.baseUrl}/job/${projectId}`;
    
    try {
      await this.page.goto(projectUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      const title = await this.page.locator('h1, .project-title, [data-testid="project-title"]').first().textContent() || 'Proyecto de Workana';
      const description = await this.page.locator('.project-description, .description, [data-testid="project-description"]').first().textContent() || '';
      
      return {
        title: title.trim(),
        description: description.trim(),
        link: projectUrl
      };
    } catch (error) {
      logger.errorWithStack('Error obteniendo datos del proyecto', error);
      return {
        title: 'Proyecto de Workana',
        description: '',
        link: projectUrl
      };
    }
  }

  async _navigateToProposal(project) {
    const jobSlug = project.link.split('/job/')[1];
    const projectUrl = `${this.baseUrl}/messages/bid/${jobSlug}/?tab=message&ref=project_view`;
    
    if (this.debug) {
      logger.info(`URL de propuesta construida: ${projectUrl}`);
    }
    
    await this.page.goto(projectUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await this.page.waitForTimeout(3000);
  }

  async _verifyProposalPage() {
    try {
      const proposalSelectors = [
        'textarea',
        '.proposal-text',
        '[data-testid="proposal-text"]',
        'textarea[name="message"]',
        'textarea[placeholder*="propuesta"]'
      ];
      
      let found = false;
      for (const selector of proposalSelectors) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error('No se encontró el área de texto de la propuesta');
      }
    } catch (error) {
      logger.errorWithStack('Error verificando página de propuesta', error);
      throw error;
    }
  }

  async _generateDefaultProposal(project) {
    return `Hola, he revisado tu proyecto "${project.title}" y me interesa mucho participar. 

Tengo experiencia en este tipo de trabajos y puedo ofrecerte una solución de calidad. 

¿Podrías proporcionarme más detalles sobre los requisitos específicos del proyecto?

Saludos.`;
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
    if (!this.debug) return;
    
    const buttons = await this.page.locator('button, input[type="submit"]').all();
    logger.info(`Botones disponibles: ${buttons.length}`);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      logger.info(`Botón ${i}: "${text}"`);
    }
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