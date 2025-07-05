const BaseScraper = require('./BaseScraper');
const Project = require('../models/Project');
const logger = require('../utils/logger');

class WorkanaScraper extends BaseScraper {
  constructor() {
    super('workana');
  }

  getUrl() {
    return 'https://www.workana.com/jobs?category=it-programming&language=en%2Ces';
  }

  getProjectSelector() {
    return '.project-item';
  }

  async scrapeProjects() {
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
            
            return {
              title,
              description,
              price,
              link,
              platform: 'workana'
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

  async expandProjectDetails() {
    try {
      await this.page.$$eval(this.getProjectSelector(), (projects) => {
        projects.forEach(project => {
          const viewMore = project.querySelector('.project-details a.link.small');
          if (viewMore && viewMore.innerText.includes('Ver más')) {
            viewMore.click();
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
      // Workana no tiene skills ni info como Upwork
      skills: [],
      info: ''
    };
  }

  async execute() {
    try {
      logger.scraperLog(this.platform, 'Iniciando proceso de scraping');
      
      await this.initialize();
      await this.navigateTo(this.getUrl());
      await this.simulateHumanBehavior();
      await this.takeScreenshot(`${this.platform}-scraping`);
      
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

module.exports = WorkanaScraper; 