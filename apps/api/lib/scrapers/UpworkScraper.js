const BaseScraper = require('./BaseScraper');
const Project = require('../models/Project');
const logger = require('../utils/logger');

class UpworkScraper extends BaseScraper {
  constructor() {
    super('upwork');
  }

  getUrl() {
    return 'https://www.upwork.com/nx/search/jobs/?per_page=50&q=web&sort=recency';
  }

  getProjectSelector() {
    return '.job-tile';
  }

  async scrapeProjects() {
    try {
      await this.page.waitForSelector(this.getProjectSelector());
      
      const projects = await this.page.$$eval(this.getProjectSelector(), (elements) => {
        return elements.map((element) => {
          try {
            const title = element.querySelector('.up-n-link')?.innerText || '';
            const description = element.querySelector('.text-body-sm .air3-line-clamp.is-clamped')?.innerText || '';
            let info = element.querySelector('.job-tile-info-list');
            
            if (info) {
              info = Array.from(info.querySelectorAll('li')).map((li) => {
                return li.innerText;
              }).join('\n');
            } else {
              info = '';
            }
            
            const skills = Array.from(element.querySelectorAll('.air3-token-container')).map((skill) => skill?.innerText || '').filter(Boolean);
            
            const link = element.querySelector('.up-n-link')?.href || '';
            
            return {
              title,
              description,
              info,
              skills,
              link,
              platform: 'upwork'
            };
          } catch (error) {
            console.error('Error parsing individual project:', error);
            return null;
          }
        }).filter(Boolean);
      });

      const projectInstances = projects.map(projectData => new Project(projectData));
      
      logger.scraperLog(this.platform, `${projectInstances.length} proyectos extraídos`);
      
      return projectInstances;
    } catch (error) {
      logger.errorWithStack(`Error scrapeando proyectos de ${this.platform}`, error);
      throw error;
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
      // Comportamiento específico para Upwork
      await super.simulateHumanBehavior();
      
      // Esperar a que se carguen los proyectos
      const projectsFound = await this.waitForProjects();
      
      if (projectsFound) {
        // Scroll más específico para Upwork
        const scrollActions = 5;
        for (let i = 0; i < scrollActions; i++) {
          const scrollDownAmount = this.getRandomInt(100, 1000);
          await this.page.mouse.wheel(0, scrollDownAmount);
          
          const randomWait = this.getRandomInt(1000, 10000);
          await this.page.waitForTimeout(randomWait);
          
          const scrollUpAmount = this.getRandomInt(10, 1000);
          await this.page.mouse.wheel(0, -scrollUpAmount);
        }
        
        logger.scraperLog(this.platform, 'Comportamiento humano específico de Upwork completado');
      }
      
    } catch (error) {
      logger.errorWithStack(`Error en simulación de comportamiento humano para ${this.platform}`, error);
      throw error;
    }
  }

  cleanProjectData(projectData) {
    // Limpieza específica para datos de Upwork
    return {
      ...projectData,
      title: projectData.title?.trim() || '',
      description: projectData.description?.trim() || '',
      link: projectData.link?.split('?')[0] || '', // Remover query params
      info: projectData.info?.replace(/\r\n|\n/g, '\n') || '',
      skills: projectData.skills?.filter(skill => skill && skill.trim()) || []
    };
  }

  async execute() {
    try {
      logger.scraperLog(this.platform, 'Iniciando proceso de scraping');
      
      await this.initialize();
      await this.navigateTo(this.getUrl());
      await this.simulateHumanBehavior();
      // await this.takeScreenshot(`${this.platform}-scraping`);
      
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
}

module.exports = UpworkScraper; 