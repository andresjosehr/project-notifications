const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const logger = require('../utils/logger');
const config = require('../config');

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
      await this.page.setUserAgent(config.scraping.userAgent);
      
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
      await this.page.goto(`${this.baseUrl}/dashboard`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Verificar si estamos en login o dashboard
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('login')) {
        return false;
      }
      
      // Verificar si existe algún elemento característico del dashboard
      const dashboardElement = await this.page.locator('[data-testid="dashboard"], .dashboard, #dashboard').first();
      const profileElement = await this.page.locator('[data-testid="user-menu"], .user-menu, .profile-menu').first();
      
      return (await dashboardElement.count() > 0) || (await profileElement.count() > 0);
    } catch (error) {
      logger.errorWithStack('Error validando sesión', error);
      return false;
    }
  }

  async login(username, password) {
    try {
      if (!username || !password) {
        throw new Error('Se requieren username y password');
      }
      
      await this.initBrowser();
      
      logger.info('Iniciando sesión en Workana...');
      
      // Ir a la página de login
      await this.page.goto(this.loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
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
      await usernameField.fill(username);
      await this.page.waitForTimeout(1000);
      
      await passwordField.fill(password);
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
      
      // Construir URL del proyecto
      const projectUrl = `${this.baseUrl}/projects/${projectId}`;
      
      // Ir a la página del proyecto
      await this.page.goto(projectUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Verificar que estamos en la página correcta
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Sesión expirada, se requiere login');
      }
      
      // Obtener título del proyecto
      let projectTitle = null;
      try {
        const titleElement = await this.page.locator('h1, .project-title, [data-testid="project-title"]').first();
        if (await titleElement.count() > 0) {
          projectTitle = await titleElement.textContent();
        }
      } catch (error) {
        logger.warn('No se pudo obtener título del proyecto', error);
      }
      
      // Buscar botón de enviar propuesta
      const proposalButton = this.page.locator('button:has-text("Enviar propuesta"), button:has-text("Send proposal"), .send-proposal-btn, [data-testid="send-proposal"]').first();
      
      if (await proposalButton.count() === 0) {
        throw new Error('No se encontró el botón de enviar propuesta');
      }
      
      await proposalButton.click();
      await this.page.waitForTimeout(2000);
      
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
      
      // Buscar y hacer clic en el botón de enviar
      const sendButton = this.page.locator('button:has-text("Enviar"), button:has-text("Send"), .send-btn, [data-testid="send-proposal-btn"]').first();
      
      if (await sendButton.count() === 0) {
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
        projectTitle,
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

  async getProjects(options = {}) {
    try {
      const hasSession = await this.hasActiveSession();
      if (!hasSession) {
        throw new Error('No hay sesión activa en Workana');
      }
      
      const projectsUrl = `${this.baseUrl}/projects`;
      await this.page.goto(projectsUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Extraer información de proyectos
      const projects = await this.page.evaluate(() => {
        const projectElements = document.querySelectorAll('.project-item, .project-card, [data-testid="project"]');
        const projects = [];
        
        projectElements.forEach(element => {
          const titleElement = element.querySelector('h3, .project-title, [data-testid="project-title"]');
          const urlElement = element.querySelector('a');
          const budgetElement = element.querySelector('.budget, .price, [data-testid="budget"]');
          
          if (titleElement && urlElement) {
            projects.push({
              title: titleElement.textContent.trim(),
              url: urlElement.href,
              budget: budgetElement ? budgetElement.textContent.trim() : null,
              id: urlElement.href.split('/').pop()
            });
          }
        });
        
        return projects;
      });
      
      return projects;
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos de Workana', error);
      throw error;
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