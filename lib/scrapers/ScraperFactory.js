const UpworkScraper = require('./UpworkScraper');
const WorkanaScraper = require('./WorkanaScraper');
const logger = require('../utils/logger');

class ScraperFactory {
  static create(platform) {
    switch (platform.toLowerCase()) {
      case 'upwork':
        logger.info('Creando scraper de Upwork');
        return new UpworkScraper();
      
      case 'workana':
        logger.info('Creando scraper de Workana');
        return new WorkanaScraper();
      
      default:
        throw new Error(`Plataforma no soportada: ${platform}`);
    }
  }

  static getSupportedPlatforms() {
    return ['upwork', 'workana'];
  }

  static createAll() {
    const scrapers = {};
    const platforms = this.getSupportedPlatforms();
    
    platforms.forEach(platform => {
      scrapers[platform] = this.create(platform);
    });
    
    logger.info(`Scrapers creados para plataformas: ${platforms.join(', ')}`);
    
    return scrapers;
  }

  static async executeAll() {
    const scrapers = this.createAll();
    const results = {};
    
    for (const [platform, scraper] of Object.entries(scrapers)) {
      try {
        logger.info(`Ejecutando scraper de ${platform}`);
        results[platform] = await scraper.execute();
        logger.info(`Scraper de ${platform} completado: ${results[platform].length} proyectos`);
      } catch (error) {
        logger.errorWithStack(`Error ejecutando scraper de ${platform}`, error);
        results[platform] = [];
      }
    }
    
    return results;
  }

  static async executeParallel() {
    const scrapers = this.createAll();
    const promises = [];
    
    for (const [platform, scraper] of Object.entries(scrapers)) {
      const promise = scraper.execute()
        .then(projects => ({ platform, projects, success: true }))
        .catch(error => {
          logger.errorWithStack(`Error en scraper de ${platform}`, error);
          return { platform, projects: [], success: false, error };
        });
      
      promises.push(promise);
    }
    
    logger.info('Ejecutando scrapers en paralelo');
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    const totalProjects = results.reduce((sum, r) => sum + r.projects.length, 0);
    
    logger.info(`Scrapers completados: ${successCount}/${results.length} exitosos, ${totalProjects} proyectos total`);
    
    return results.reduce((acc, result) => {
      acc[result.platform] = result.projects;
      return acc;
    }, {});
  }
}

module.exports = ScraperFactory; 