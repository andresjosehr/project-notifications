#!/usr/bin/env node

const { Command } = require('commander');
const NotificationApp = require('./lib/app');
const WorkanaService = require('./lib/services/WorkanaService');
const logger = require('./lib/utils/logger');

const program = new Command();

program
  .name('freelance-notifications')
  .description('Sistema de notificaciones para proyectos freelance')
  .version('2.1.0');


























// Comando para scraping único de Workana
program
  .command('workana-scrape')
  .description('Ejecutar scraping de Workana una sola vez')
  .option('-n, --notifications', 'Enviar notificaciones de nuevos proyectos', true)
  .option('-q, --quiet', 'Modo silencioso (solo errores)', false)
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initializeWithoutAIValidation();
      
      logger.info('🚀 Iniciando scraping único de Workana');
      
      // Función de ejecución
      const runScraping = async () => {
        try {
          const execStartTime = Date.now();
          const results = await app.runPlatformSpecific('workana', options);
          const duration = Date.now() - execStartTime;
          
          if (!options.quiet) {
            console.log(`✅ [${new Date().toLocaleTimeString()}] Scraping completado en ${duration}ms`);
            console.log(`📊 Procesados: ${results.workana.processed || 0} | Nuevos: ${results.workana.newProjects || 0} | Errores: ${results.workana.errors || 0}`);
          }
          
          logger.info(`Workana scraping único: ${results.workana.processed || 0} procesados, ${results.workana.newProjects || 0} nuevos, ${duration}ms`);
          
        } catch (error) {
          logger.errorWithStack('Error en scraping único de Workana', error);
          if (!options.quiet) {
            console.error(`❌ [${new Date().toLocaleTimeString()}] Error:`, error.message);
          }
          process.exit(1);
        }
      };
      
      // Ejecutar una vez
      await runScraping();
      
      logger.info('✅ Scraping completado');
      process.exit(0);
      
    } catch (error) {
      logger.errorWithStack('Error iniciando scraping único de Workana', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });


// Comando para iniciar servidor API
program
  .command('server')
  .description('Iniciar servidor API con endpoints')
  .option('-p, --port <port>', 'Puerto del servidor', process.env.PORT || '3000')
  .action(async (options) => {
    try {
      const { startServer } = require('./lib/server');
      await startServer(parseInt(options.port));
    } catch (error) {
      logger.errorWithStack('Error iniciando servidor', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();