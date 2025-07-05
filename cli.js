#!/usr/bin/env node

const { Command } = require('commander');
const NotificationApp = require('./lib/app');
const WorkanaService = require('./lib/services/WorkanaService');
const logger = require('./lib/utils/logger');

const program = new Command();

program
  .name('freelance-notifications')
  .description('Sistema de notificaciones para proyectos freelance')
  .version('2.0.0');

// Comando para scraping de Workana
program
  .command('workana-scrape')
  .description('Ejecutar scraping de proyectos de Workana')
  .option('-n, --notifications', 'Enviar notificaciones de nuevos proyectos', true)
  .option('-t, --translate', 'Traducir proyectos', true)
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      logger.info('Iniciando scraping de Workana...');
      const results = await app.runPlatformSpecific('workana', options);
      
      console.log('✅ Scraping de Workana completado');
      console.log(`📊 Proyectos procesados: ${results.workana.processed || 0}`);
      console.log(`📊 Proyectos nuevos: ${results.workana.newProjects || 0}`);
      console.log(`📊 Errores: ${results.workana.errors || 0}`);
    } catch (error) {
      logger.errorWithStack('Error en scraping de Workana', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para scraping de Upwork
program
  .command('upwork-scrape')
  .description('Ejecutar scraping de proyectos de Upwork')
  .option('-n, --notifications', 'Enviar notificaciones de nuevos proyectos', true)
  .option('-t, --translate', 'Traducir proyectos', true)
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      logger.info('Iniciando scraping de Upwork...');
      const results = await app.runPlatformSpecific('upwork', options);
      
      console.log('✅ Scraping de Upwork completado');
      console.log(`📊 Proyectos encontrados: ${results.newProjects || 0}`);
      console.log(`🔔 Notificaciones enviadas: ${results.notifications || 0}`);
    } catch (error) {
      logger.errorWithStack('Error en scraping de Upwork', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para login en Workana
program
  .command('workana-login')
  .description('Iniciar sesión en Workana y guardar las cookies')
  .option('-u, --username <username>', 'Usuario de Workana')
  .option('-p, --password <password>', 'Contraseña de Workana')
  .action(async (options) => {
    try {
      const workanaService = new WorkanaService();
      
      logger.info('Iniciando sesión en Workana...');
      const result = await workanaService.login(options.username, options.password);
      
      if (result.success) {
        console.log('✅ Sesión de Workana iniciada y guardada correctamente');
        console.log(`👤 Usuario: ${result.user || 'N/A'}`);
      } else {
        console.error('❌ Error iniciando sesión:', result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.errorWithStack('Error en login de Workana', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para enviar propuesta en Workana
program
  .command('workana-proposal')
  .description('Enviar propuesta a un proyecto de Workana')
  .requiredOption('-i, --project-id <projectId>', 'ID del proyecto')
  .option('-a, --auto-login', 'Iniciar sesión automáticamente si no hay sesión activa', true)
  .option('-u, --username <username>', 'Usuario de Workana (para auto-login)')
  .option('-p, --password <password>', 'Contraseña de Workana (para auto-login)')
  .action(async (options) => {
    try {
      const workanaService = new WorkanaService();
      
      logger.info(`Enviando propuesta para proyecto ${options.projectId}...`);
      
      // Verificar si hay sesión activa
      const hasActiveSession = await workanaService.hasActiveSession();
      
      if (!hasActiveSession && options.autoLogin) {
        if (!options.username || !options.password) {
          throw new Error('Se requieren credenciales para auto-login');
        }
        
        console.log('🔐 No hay sesión activa, iniciando sesión automáticamente...');
        const loginResult = await workanaService.login(options.username, options.password);
        
        if (!loginResult.success) {
          throw new Error(`Error en auto-login: ${loginResult.error}`);
        }
        console.log('✅ Sesión iniciada correctamente');
      }
      
      const result = await workanaService.sendProposal(options.projectId, options);
      
      if (result.success) {
        console.log('✅ Propuesta enviada correctamente');
        console.log(`📝 Proyecto: ${result.projectTitle || options.projectId}`);
      } else {
        console.error('❌ Error enviando propuesta:', result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.errorWithStack('Error enviando propuesta', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para mostrar estadísticas
program
  .command('stats')
  .description('Mostrar estadísticas de proyectos')
  .option('-p, --platform <platform>', 'Plataforma específica (workana/upwork)')
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      const stats = await app.getStats(options.platform);
      
      console.log('📊 Estadísticas de Proyectos');
      console.log('================================');
      
      if (stats.workana) {
        console.log(`\n🟢 Workana:`);
        console.log(`  Total proyectos: ${stats.workana.total}`);
        console.log(`  Nuevos hoy: ${stats.workana.today}`);
        console.log(`  Esta semana: ${stats.workana.week}`);
      }
      
      if (stats.upwork) {
        console.log(`\n🔵 Upwork:`);
        console.log(`  Total proyectos: ${stats.upwork.total}`);
        console.log(`  Nuevos hoy: ${stats.upwork.today}`);
        console.log(`  Esta semana: ${stats.upwork.week}`);
      }
      
      if (stats.overall) {
        console.log(`\n📈 General:`);
        console.log(`  Total proyectos: ${stats.overall.total}`);
        console.log(`  Propuestas generadas: ${stats.overall.proposals}`);
        console.log(`  Notificaciones enviadas: ${stats.overall.notifications}`);
      }
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para ver proyectos recientes
program
  .command('recent')
  .description('Mostrar proyectos recientes')
  .option('-p, --platform <platform>', 'Plataforma específica (workana/upwork)')
  .option('-l, --limit <limit>', 'Límite de proyectos a mostrar', '10')
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      const projects = await app.getRecentProjects(options.platform, parseInt(options.limit));
      
      console.log(`📋 Proyectos Recientes (${projects.length})`);
      console.log('================================');
      
      projects.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.title}`);
        console.log(`   💰 Presupuesto: ${project.budget || 'N/A'}`);
        console.log(`   🏷️  Plataforma: ${project.platform}`);
        console.log(`   📅 Fecha: ${project.created_at}`);
        console.log(`   🔗 URL: ${project.url}`);
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos recientes', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para búsqueda de proyectos
program
  .command('search')
  .description('Buscar proyectos por término')
  .requiredOption('-q, --query <query>', 'Término de búsqueda')
  .option('-p, --platform <platform>', 'Plataforma específica (workana/upwork)')
  .option('-l, --limit <limit>', 'Límite de resultados', '10')
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      const results = await app.searchProjects(options.query, options.platform, {
        limit: parseInt(options.limit)
      });
      
      console.log(`🔍 Resultados de búsqueda para "${options.query}" (${results.length})`);
      console.log('================================');
      
      results.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.title}`);
        console.log(`   💰 Presupuesto: ${project.budget || 'N/A'}`);
        console.log(`   🏷️  Plataforma: ${project.platform}`);
        console.log(`   📅 Fecha: ${project.created_at}`);
        console.log(`   🔗 URL: ${project.url}`);
      });
    } catch (error) {
      logger.errorWithStack('Error buscando proyectos', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para health check
program
  .command('health')
  .description('Verificar estado del sistema')
  .action(async () => {
    try {
      const app = new NotificationApp();
      const health = await app.healthCheck();
      
      console.log('🏥 Estado del Sistema');
      console.log('================================');
      
      console.log(`Status general: ${health.overall.healthy ? '✅ Saludable' : '❌ Con problemas'}`);
      
      if (health.database) {
        console.log(`Base de datos: ${health.database.connected ? '✅ Conectada' : '❌ Desconectada'}`);
      }
      
      if (health.ai) {
        console.log(`Servicio AI: ${health.ai.available ? '✅ Disponible' : '❌ No disponible'}`);
      }
      
      if (health.telegram) {
        console.log(`Telegram: ${health.telegram.available ? '✅ Disponible' : '❌ No disponible'}`);
      }
      
      if (health.scrapers) {
        console.log(`Scrapers: ${health.scrapers.workana ? '✅' : '❌'} Workana | ${health.scrapers.upwork ? '✅' : '❌'} Upwork`);
      }
      
      if (!health.overall.healthy) {
        console.log('\n❌ Problemas detectados:');
        health.issues?.forEach(issue => {
          console.log(`  - ${issue}`);
        });
        process.exit(1);
      }
    } catch (error) {
      logger.errorWithStack('Error en health check', error);
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

// Comando para modo continuo (existing)
program
  .command('continuous')
  .description('Ejecutar en modo continuo')
  .option('-p, --parallel', 'Ejecutar plataformas en paralelo', true)
  .option('-n, --notifications', 'Enviar notificaciones', true)
  .option('-t, --translate', 'Traducir proyectos', true)
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      logger.info('Iniciando modo continuo...');
      await app.runContinuousMode(options);
    } catch (error) {
      logger.errorWithStack('Error en modo continuo', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Comando para ciclo único (existing)
program
  .command('single')
  .description('Ejecutar un ciclo único de scraping')
  .option('-p, --parallel', 'Ejecutar plataformas en paralelo', true)
  .option('-n, --notifications', 'Enviar notificaciones', true)
  .option('-t, --translate', 'Traducir proyectos', true)
  .action(async (options) => {
    try {
      const app = new NotificationApp();
      await app.initialize();
      
      logger.info('Ejecutando ciclo único...');
      const results = await app.runSingleCycle(options);
      
      console.log('✅ Ciclo completado');
      console.log(`📊 Resultados: ${JSON.stringify(results, null, 2)}`);
    } catch (error) {
      logger.errorWithStack('Error en ciclo único', error);
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();