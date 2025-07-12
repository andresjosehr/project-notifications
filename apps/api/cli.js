#!/usr/bin/env node

const { Command } = require('commander');
const WorkanaScraper = require('./lib/scrapers/WorkanaScraper');
const logger = require('./lib/utils/logger');

const program = new Command();

program
  .name('workana-scraper')
  .description('Scraper de Workana para Laravel')
  .version('1.0.0');

// Comando para scraping de Workana
program
  .command('scrape-workana')
  .description('Ejecutar scraping de Workana y devolver JSON')
  .option('-q, --quiet', 'Modo silencioso (solo errores)', false)
  .action(async (options) => {
    try {
      
      const startTime = Date.now();
      
      // Crear y ejecutar scraper
      const scraper = new WorkanaScraper();
      const projects = await scraper.execute();
      
      const duration = Date.now() - startTime;
      
      // Convertir proyectos a formato JSON
      const projectsJson = projects.map(project => project.toJSON());
      
      // Crear respuesta estructurada
      const response = {
        success: true,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        duration: duration,
        stats: {
          total: projects.length,
          processed: projects.length,
          errors: 0
        },
        projects: projectsJson
      };
      
      // Imprimir resultado en formato JSON
      console.log(JSON.stringify(response, null, 2));
      
      if (!options.quiet) {
        console.error(`✅ Scraping completado en ${duration}ms - ${projects.length} proyectos encontrados`);
      }
      
      process.exit(0);
      
    } catch (error) {
      logger.errorWithStack('Error en scraping de Workana', error);
      
      const errorResponse = {
        success: false,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          type: error.constructor.name
        },
        stats: {
          total: 0,
          processed: 0,
          errors: 1
        },
        projects: []
      };
      
      console.log(JSON.stringify(errorResponse, null, 2));
      
      if (!options.quiet) {
        console.error(`❌ Error: ${error.message}`);
      }
      
      process.exit(1);
    }
  });

program.parse(); 