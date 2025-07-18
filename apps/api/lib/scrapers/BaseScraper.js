const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const config = require('../config');
const logger = require('../utils/logger');

class BaseScraper {
  constructor(platform) {
    if (this.constructor === BaseScraper) {
      throw new Error('BaseScraper es una clase abstracta y no puede ser instanciada directamente');
    }
    
    this.platform = platform;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async initialize() {
    try {
      // Check if subclass has its own initBrowser method
      if (this.initBrowser && typeof this.initBrowser === 'function') {
        await this.initBrowser();
        return;
      }
      
      // Default initialization for basic scrapers
      chromium.use(stealth);
      
      this.browser = await chromium.launch({
        headless: config.scraping.headless,
        timeout: config.scraping.timeout
      });
      
      this.context = await this.browser.newContext({
        userAgent: config.scraping.userAgent
      });
      
      this.page = await this.context.newPage();
      
      // Browser initialized
    } catch (error) {
      logger.errorWithStack(`Error inicializando navegador para ${this.platform}`, error);
      throw error;
    }
  }

  async navigateTo(url) {
    try {
      // Check if subclass has its own navigateTo method
      if (this.constructor.prototype.hasOwnProperty('navigateTo') && this.constructor !== BaseScraper) {
        // If subclass overrides this method, let it handle navigation
        return;
      }
      
      await this.page.goto(url);
      await this.page.waitForLoadState('networkidle');
      // Navigated to URL
    } catch (error) {
      logger.errorWithStack(`Error navegando a ${url}`, error);
      throw error;
    }
  }

  async takeScreenshot(filename) {
    try {
      const path = `${filename}-${Date.now()}.png`;
      await this.page.screenshot({ path });
      // Screenshot taken
      return path;
    } catch (error) {
      logger.errorWithStack(`Error tomando screenshot`, error);
      throw error;
    }
  }

  async simulateHumanBehavior() {
    try {
      const scrollActions = Math.floor(Math.random() * 3) + 3; // 3-5 acciones
      
      for (let i = 0; i < scrollActions; i++) {
        const scrollDown = this.getRandomInt(100, 800);
        await this.page.mouse.wheel(0, scrollDown);
        
        const waitTime = this.getRandomInt(500, 2000);
        await this.page.waitForTimeout(waitTime);
        
        const scrollUp = this.getRandomInt(50, 200);
        await this.page.mouse.wheel(0, -scrollUp);
      }
      
      // Human behavior simulated
    } catch (error) {
      logger.errorWithStack(`Error simulando comportamiento humano`, error);
      throw error;
    }
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async close() {
    try {
      // Check if subclass has its own close method with specific logic
      if (this.constructor.prototype.hasOwnProperty('close') && this.constructor !== BaseScraper) {
        // Let subclass handle its own cleanup
        return;
      }
      
      if (this.browser) {
        await this.browser.close();
        // Browser closed
      }
    } catch (error) {
      logger.errorWithStack(`Error cerrando navegador`, error);
    }
  }

  // Métodos abstractos que deben ser implementados por las clases hijas
  async scrapeProjects() {
    throw new Error('El método scrapeProjects debe ser implementado por la clase hija');
  }

  getUrl() {
    throw new Error('El método getUrl debe ser implementado por la clase hija');
  }

  parseProject() {
    throw new Error('El método parseProject debe ser implementado por la clase hija');
  }

  getProjectSelector() {
    throw new Error('El método getProjectSelector debe ser implementado por la clase hija');
  }

  // Método plantilla
  async execute() {
    try {
      await this.initialize();
      await this.navigateTo(this.getUrl());
      await this.simulateHumanBehavior();
      
      const projects = await this.scrapeProjects();
      
      await this.close();
      
      return projects;
    } catch (error) {
      logger.errorWithStack(`Error ejecutando scraper de ${this.platform}`, error);
      await this.close();
      throw error;
    }
  }
}

module.exports = BaseScraper; 