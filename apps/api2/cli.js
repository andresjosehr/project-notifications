#!/usr/bin/env node

const { Command } = require('commander');
const WorkanaService = require('./lib/services/WorkanaService');
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
      const scraper = new WorkanaService();
      const projects = await scraper.scrapeProjectsList();
      
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

// Comando para enviar propuesta a Workana
program
  .command('send-proposal')
  .description('Enviar propuesta a Workana usando datos de sesión proporcionados por Laravel')
  .requiredOption('--project-id <id>', 'ID del proyecto en Workana')
  .requiredOption('--user-id <id>', 'ID del usuario que enviará la propuesta')
  .option('--session-data <json>', 'Datos de sesión en formato JSON (cookies, localStorage, etc.)')
  .option('--username <email>', 'Email del usuario de Workana')
  .option('--password <password>', 'Contraseña del usuario de Workana')
  .option('--proposal-content <text>', 'Contenido personalizado de la propuesta')
  .option('--auto-login', 'Intentar auto-login si no hay sesión activa', false)
  .option('--headless', 'Ejecutar en modo headless', true)
  .option('--debug', 'Modo debug con más logs', false)
  .action(async (options) => {
    try {
      const startTime = Date.now();
      
      // Validar parámetros requeridos
      if (!options.projectId) {
        throw new Error('Se requiere projectId');
      }

      if (!options.userId) {
        throw new Error('Se requiere userId');
      }

      // Parsear datos de sesión si se proporcionan
      let sessionData = null;
      if (options.sessionData) {
        try {
          sessionData = JSON.parse(options.sessionData);
        } catch (parseError) {
          throw new Error(`Error parseando session-data: ${parseError.message}`);
        }
      }

      // Crear instancia del servicio de Workana
      const workanaService = new WorkanaService({
        headless: options.headless,
        debug: options.debug
      });

      // Configurar datos de usuario para la propuesta
      const proposalOptions = {
        userId: parseInt(options.userId),
        username: options.username,
        password: options.password,
        autoLogin: options.autoLogin,
        customProposal: options.proposalContent,
        sessionData: sessionData
      };

      // Enviar propuesta usando sendProposalByUserId
      const result = await workanaService.sendProposalByUserId(
        options.projectId, 
        parseInt(options.userId), 
        proposalOptions
      );

      const duration = Date.now() - startTime;

      // Crear respuesta estructurada
      const response = {
        success: result.success,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        duration: duration,
        projectId: options.projectId,
        userId: options.userId,
        data: {
          projectId: result.projectId,
          userId: result.userId,
          userEmail: result.userEmail,
          projectTitle: result.title,
          message: result.message,
          proposalText: result.proposalText
        },
        error: result.error ? {
          message: result.error,
          type: 'ProposalError'
        } : null
      };

      // Imprimir resultado en formato JSON
      console.log(JSON.stringify(response, null, 2));

      // Cerrar el navegador
      await workanaService.close();

      process.exit(result.success ? 0 : 1);

    } catch (error) {
      logger.errorWithStack('Error enviando propuesta a Workana', error);

      const errorResponse = {
        success: false,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        projectId: options.projectId,
        userId: options.userId,
        error: {
          message: error.message,
          type: error.constructor.name
        },
        data: null
      };

      console.log(JSON.stringify(errorResponse, null, 2));

      if (options.debug) {
        console.error(`❌ Error: ${error.message}`);
      }

      process.exit(1);
    }
  });

// Comando simple para enviar propuesta con sesión y texto
program
  .command('sendProposal')
  .description('Enviar propuesta simple con sesión y texto')
  .argument('<session>', 'Datos de sesión en formato JSON')
  .argument('<proposalText>', 'Texto de la propuesta')
  .action(async (session, proposalText) => {
    try {
      const startTime = Date.now();
      
      // Parsear datos de sesión
      let sessionData;
      try {
        sessionData = JSON.parse(session);
      } catch (parseError) {
        throw new Error(`Error parseando session: ${parseError.message}`);
      }

      // Crear instancia del servicio de Workana
      const workanaService = new WorkanaService({
        headless: false,
        debug: false
      });

      // Enviar propuesta usando el método simplificado
      const result = await workanaService.sendProposalByUserId(sessionData, proposalText);

      const duration = Date.now() - startTime;

      // Crear respuesta estructurada
      const response = {
        success: result.success,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        duration: duration,
        message: result.message,
        error: result.error ? {
          message: result.error,
          type: 'ProposalError'
        } : null
      };

      // Imprimir resultado en formato JSON
      console.log(JSON.stringify(response, null, 2));

      // Cerrar el navegador
      await workanaService.close();

      process.exit(result.success ? 0 : 1);

    } catch (error) {
      logger.errorWithStack('Error enviando propuesta', error);

      const errorResponse = {
        success: false,
        platform: 'workana',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          type: error.constructor.name
        }
      };

      console.log(JSON.stringify(errorResponse, null, 2));

      process.exit(1);
    }
  });

// Comando para login y obtener sesión
program
  .command('login')
  .description('Iniciar sesión en Workana y obtener datos de sesión')
  .argument('<username>', 'Email del usuario de Workana')
  .argument('<password>', 'Contraseña del usuario de Workana')
  .option('--headless [value]', 'Ejecutar en modo headless', 'true')
  .option('--debug', 'Modo debug con más logs', false)
  .action(async (username, password, options) => {
    try {
      const startTime = Date.now();
      
      // Validar parámetros requeridos
      if (!username || !password) {
        throw new Error('Se requieren username y password');
      }

      // Crear instancia del servicio de Workana
      const workanaService = new WorkanaService({
        headless: false, // options.headless === 'true' || options.headless === true,
        debug: options.debug
      });

      // Configurar credenciales en variables de entorno temporalmente
      process.env.WORKANA_USERNAME = username;
      process.env.WORKANA_PASSWORD = password;

      // Realizar login
      const loginResult = await workanaService.login(username, password);
      
      if (!loginResult.success) {
        throw new Error(`Error en login: ${loginResult.error}`);
      }

      // Obtener datos de sesión
      const sessionResult = await workanaService.saveSession(1); // userId = 1 para el CLI
      
      if (!sessionResult.success) {
        throw new Error(`Error guardando sesión: ${sessionResult.error}`);
      }

      const duration = Date.now() - startTime;

      // Crear respuesta estructurada
      const response = {
        success: true,
        sessionData: sessionResult.sessionData
      };

      // Imprimir resultado en formato JSON
      console.log(JSON.stringify(response, null, 2));

      // Cerrar el navegador
      await workanaService.close();

      process.exit(0);

    } catch (error) {
      logger.errorWithStack('Error en login de Workana', error);

      const errorResponse = {
        success: false,
        error: error.message
      };

      console.log(JSON.stringify(errorResponse, null, 2));

      if (options.debug) {
        console.error(`❌ Error: ${error.message}`);
      }

      process.exit(1);
    }
  });

program.parse(); 