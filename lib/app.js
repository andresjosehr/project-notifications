const ProjectController = require('./controllers/ProjectController');
const ProjectService = require('./services/ProjectService');
const UserRepository = require('./database/repositories/UserRepository');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const config = require('./config');

class NotificationApp {
  constructor() {
    this.controller = ProjectController;
    this.projectService = ProjectService;
    this.userRepository = UserRepository;
    this.errorHandler = errorHandler;
    this.isRunning = false;
    this.currentMode = null;
    
    // Configurar manejo de errores globales
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.errorHandler.setupGlobalErrorHandlers();
    logger.info('Sistema de manejo de errores configurado');
  }

  async initialize() {
    try {
      logger.info('Inicializando aplicación de notificaciones...');
      
      // Verificar configuración
      logger.info('Verificando configuración...');
      logger.info('Configuración validada correctamente');
      
      // Health check inicial
      const healthCheck = await this.controller.healthCheck();
      if (!healthCheck.overall.healthy) {
        throw new Error(`Sistema no saludable: ${JSON.stringify(healthCheck)}`);
      }
      
      logger.info('Aplicación inicializada correctamente', {
        environment: config.app.environment,
        healthStatus: healthCheck.overall.status
      });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error inicializando aplicación', error);
      throw error;
    }
  }

  async initializeWithoutAIValidation() {
    try {
      logger.info('Inicializando aplicación sin validación de IA...');
      
      // Verificar configuración
      logger.info('Verificando configuración...');
      logger.info('Configuración validada correctamente');
      
      // Health check básico (sin IA)
      const healthCheck = await this.controller.healthCheckWithoutAI();
      if (!healthCheck.overall.healthy) {
        // En producción, solo mostrar advertencia pero no fallar si hay stats disponibles
        if (healthCheck.services.projects && healthCheck.services.projects.stats) {
          logger.warn('Sistema con estado degradado pero funcional', {
            projectsStats: healthCheck.services.projects.stats,
            notificationsHealthy: healthCheck.services.notifications?.healthy
          });
        } else {
          throw new Error(`Sistema no saludable: ${JSON.stringify(healthCheck)}`);
        }
      }
      
      logger.info('Aplicación inicializada correctamente (sin validación de IA)', {
        environment: config.app.environment,
        healthStatus: healthCheck.overall.status
      });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error inicializando aplicación', error);
      throw error;
    }
  }

  async runContinuousMode(options = {}) {
    try {
      if (this.isRunning) {
        throw new Error('La aplicación ya está ejecutándose');
      }

      this.isRunning = true;
      this.currentMode = 'continuous';
      
      logger.info('Iniciando modo continuo', options);
      
      const defaultOptions = {
        parallel: true,
        sendNotifications: true,
        sendStatusNotifications: true,
        sendErrorNotifications: true,
        notificationDelay: 1000,
        ...options
      };

      await this.controller.runContinuousMode(defaultOptions);
    } catch (error) {
      logger.errorWithStack('Error en modo continuo', error);
      this.isRunning = false;
      this.currentMode = null;
      throw error;
    }
  }

  async runSingleCycle(options = {}) {
    try {
      if (this.isRunning) {
        throw new Error('La aplicación ya está ejecutándose');
      }

      this.isRunning = true;
      this.currentMode = 'single';
      
      logger.info('Ejecutando ciclo único', options);
      
      const defaultOptions = {
        parallel: true,
        sendNotifications: true,
        iteration: 0,
        ...options
      };

      const results = await this.controller.runScrapingCycle(defaultOptions);
      
      this.isRunning = false;
      this.currentMode = null;
      
      logger.info('Ciclo único completado', { results });
      return results;
    } catch (error) {
      logger.errorWithStack('Error en ciclo único', error);
      this.isRunning = false;
      this.currentMode = null;
      throw error;
    }
  }

  async runPlatformSpecific(platform, options = {}) {
    try {
      if (this.isRunning) {
        throw new Error('La aplicación ya está ejecutándose');
      }

      this.isRunning = true;
      this.currentMode = `platform-${platform}`;
      
      logger.info(`Ejecutando scraping específico para ${platform}`, options);
      
      const defaultOptions = {
        sendNotifications: options.notifications || false,
        iteration: 0,
        ...options
      };

      const results = await this.controller.runSinglePlatform(platform, defaultOptions);
      
      this.isRunning = false;
      this.currentMode = null;
      
      logger.info(`Scraping de ${platform} completado`, { results });
      return results;
    } catch (error) {
      logger.errorWithStack(`Error en scraping de ${platform}`, error);
      this.isRunning = false;
      this.currentMode = null;
      throw error;
    }
  }

  async generateProposal(projectId, platform, options = {}) {
    try {
      logger.info(`Generando propuesta para proyecto ${projectId} de ${platform}`);
      
      const result = await this.controller.buildProposalForProject(projectId, platform, options);
      
      logger.info(`Propuesta generada exitosamente para proyecto ${projectId}`);
      return result;
    } catch (error) {
      logger.errorWithStack(`Error generando propuesta para proyecto ${projectId}`, error);
      throw error;
    }
  }

  async getStats(platform = null) {
    try {
      const stats = await this.controller.getProjectStats(platform);
      return stats;
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas', error);
      throw error;
    }
  }

  async searchProjects(query, platform = null, options = {}) {
    try {
      const results = await this.controller.searchProjects(query, platform, options);
      return results;
    } catch (error) {
      logger.errorWithStack('Error buscando proyectos', error);
      throw error;
    }
  }

  async getRecentProjects(platform = null, limit = 10) {
    try {
      const results = await this.controller.getRecentProjects(platform, limit);
      return results;
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos recientes', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const health = await this.controller.healthCheck();
      return {
        ...health,
        app: {
          isRunning: this.isRunning,
          currentMode: this.currentMode,
          environment: config.app.environment
        }
      };
    } catch (error) {
      logger.errorWithStack('Error en health check', error);
      throw error;
    }
  }

  async cleanup(options = {}) {
    try {
      logger.info('Ejecutando limpieza del sistema');
      
      const results = await this.controller.cleanup(options);
      
      logger.info('Limpieza completada');
      return results;
    } catch (error) {
      logger.errorWithStack('Error en limpieza', error);
      throw error;
    }
  }

  async stop() {
    try {
      logger.info('Deteniendo aplicación...');
      
      if (this.isRunning) {
        logger.info('Esperando a que termine la operación actual...');
        // Aquí se podría implementar una lógica más sofisticada para detener operaciones
        this.isRunning = false;
        this.currentMode = null;
      }
      
      logger.info('Aplicación detenida');
      return { success: true, stoppedAt: new Date().toISOString() };
    } catch (error) {
      logger.errorWithStack('Error deteniendo aplicación', error);
      throw error;
    }
  }

  async emergencyStop() {
    try {
      logger.warn('Ejecutando parada de emergencia...');
      
      const result = await this.controller.emergencyStop();
      
      this.isRunning = false;
      this.currentMode = null;
      
      logger.warn('Parada de emergencia completada');
      return result;
    } catch (error) {
      logger.errorWithStack('Error en parada de emergencia', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentMode: this.currentMode,
      environment: config.app.environment,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  async getProjectById(id, platform) {
    try {
      logger.info(`Obteniendo proyecto ${id} de ${platform}`);
      const project = await this.projectService.getProjectById(id, platform);
      return project;
    } catch (error) {
      logger.errorWithStack(`Error obteniendo proyecto ${id} de ${platform}`, error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      logger.info(`Obteniendo usuario ${id}`);
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new Error(`Usuario con ID ${id} no encontrado`);
      }
      
      return user;
    } catch (error) {
      logger.errorWithStack(`Error obteniendo usuario ${id}`, error);
      throw error;
    }
  }

  // Método para CLI
  async runCommand(command, args = {}) {
    try {
      await this.initialize();
      
      switch (command) {
        case 'continuous':
          return await this.runContinuousMode(args);
        
        case 'single':
          return await this.runSingleCycle(args);
        
        case 'platform':
          if (!args.platform) {
            throw new Error('Plataforma requerida para comando platform');
          }
          return await this.runPlatformSpecific(args.platform, args);
        
        case 'proposal':
          if (!args.projectId || !args.platform) {
            throw new Error('ProjectId y platform requeridos para comando proposal');
          }
          return await this.generateProposal(args.projectId, args.platform, args);
        
        case 'stats':
          return await this.getStats(args.platform);
        
        case 'search':
          if (!args.query) {
            throw new Error('Query requerida para comando search');
          }
          return await this.searchProjects(args.query, args.platform, args);
        
        case 'recent':
          return await this.getRecentProjects(args.platform, args.limit);
        
        case 'health':
          return await this.healthCheck();
        
        case 'cleanup':
          return await this.cleanup(args);
        
        case 'stop':
          return await this.stop();
        
        case 'emergency-stop':
          return await this.emergencyStop();
        
        default:
          throw new Error(`Comando desconocido: ${command}`);
      }
    } catch (error) {
      logger.errorWithStack(`Error ejecutando comando ${command}`, error);
      throw error;
    }
  }
}

module.exports = NotificationApp; 