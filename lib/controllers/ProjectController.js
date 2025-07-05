const ProjectService = require('../services/ProjectService');
const AIService = require('../services/AIService');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');
const config = require('../config');

class ProjectController {
  constructor() {
    this.projectService = ProjectService;
    this.aiService = AIService;
    this.notificationService = NotificationService;
  }

  async runScrapingCycle(options = {}) {
    try {
      const iteration = options.iteration || 0;
      const platforms = options.platforms || ['upwork', 'workana'];
      
      logger.info(`Iniciando ciclo de scraping #${iteration}`, { platforms });

      const results = await this.projectService.scrapeAndProcessProjects(
        null, // Todas las plataformas
        {
          parallel: options.parallel !== false,
          sendNotifications: options.sendNotifications !== false,
          translate: options.translate !== false,
          iteration,
          user: options.user,
          notificationDelay: options.notificationDelay || 1000,
          ...options
        }
      );

      // Enviar resumen de estadísticas
      if (options.sendStatusNotifications) {
        await this.sendCycleSummary(results, iteration);
      }

      logger.info(`Ciclo de scraping #${iteration} completado`, { results });
      return results;
    } catch (error) {
      logger.errorWithStack(`Error en ciclo de scraping #${options.iteration || 0}`, error);
      
      // Enviar notificación de error
      if (options.sendErrorNotifications) {
        await this.notificationService.sendErrorNotification(
          error,
          `Ciclo de scraping #${options.iteration || 0}`,
          options.user
        );
      }
      
      throw error;
    }
  }

  async runContinuousMode(options = {}) {
    try {
      const minWait = config.scraping.waitBetweenRequests.min;
      const maxWait = config.scraping.waitBetweenRequests.max;
      
      logger.info('Iniciando modo continuo', { minWait, maxWait });

      let iteration = 0;
      
      while (true) {
        try {
          await this.runScrapingCycle({
            ...options,
            iteration
          });
          
          // Calcular tiempo de espera aleatorio
          const waitTime = Math.floor(Math.random() * (maxWait - minWait)) + minWait;
          
          logger.info(`Esperando ${waitTime} segundos antes del próximo ciclo`);
          
          // Esperar con contador visual
          for (let i = 0; i < waitTime; i++) {
            if (i % 10 === 0) { // Log cada 10 segundos
              logger.debug(`Esperando... ${i}/${waitTime}s`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          iteration++;
        } catch (error) {
          logger.errorWithStack(`Error en iteración ${iteration}`, error);
          
          // Esperar más tiempo en caso de error
          const errorWaitTime = Math.max(60, waitTime);
          logger.info(`Esperando ${errorWaitTime} segundos después del error`);
          
          await new Promise(resolve => setTimeout(resolve, errorWaitTime * 1000));
          iteration++;
        }
      }
    } catch (error) {
      logger.errorWithStack('Error en modo continuo', error);
      throw error;
    }
  }

  async runSinglePlatform(platform, options = {}) {
    try {
      logger.info(`Ejecutando scraping para ${platform}`, options);

      const results = await this.projectService.scrapeAndProcessProjects(
        platform,
        {
          sendNotifications: options.sendNotifications !== false,
          translate: options.translate !== false,
          iteration: options.iteration || 0,
          user: options.user,
          ...options
        }
      );

      logger.info(`Scraping de ${platform} completado`, { results });
      return results;
    } catch (error) {
      logger.errorWithStack(`Error en scraping de ${platform}`, error);
      throw error;
    }
  }

  async buildProposalForProject(projectId, platform, options = {}) {
    try {
      logger.info(`Generando propuesta para proyecto ${projectId} de ${platform}`);

      const project = await this.projectService.getProjectById(projectId, platform);
      
      if (!project) {
        throw new Error(`Proyecto ${projectId} no encontrado en ${platform}`);
      }

      const proposal = await this.aiService.buildProposal(project.description, options);
      
      logger.info(`Propuesta generada para proyecto ${projectId}`, { 
        proposalLength: proposal.length 
      });

      return {
        project,
        proposal,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.errorWithStack(`Error generando propuesta para proyecto ${projectId}`, error);
      throw error;
    }
  }

  async getProjectStats(platform = null) {
    try {
      const stats = await this.projectService.getProjectStats(platform);
      
      return {
        stats,
        generatedAt: new Date().toISOString(),
        platform: platform || 'all'
      };
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas', error);
      throw error;
    }
  }

  async searchProjects(query, platform = null, options = {}) {
    try {
      const projects = await this.projectService.searchProjects(query, platform, options);
      
      return {
        query,
        platform: platform || 'all',
        results: projects,
        count: projects.length,
        searchedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.errorWithStack('Error buscando proyectos', error);
      throw error;
    }
  }

  async getRecentProjects(platform = null, limit = 10) {
    try {
      const projects = await this.projectService.getAllProjects(platform, { limit });
      
      return {
        projects,
        platform: platform || 'all',
        limit,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos recientes', error);
      throw error;
    }
  }

  async sendCycleSummary(results, iteration) {
    try {
      const summary = {
        iteration,
        timestamp: new Date().toISOString(),
        results
      };

      const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
      const totalNew = Object.values(results).reduce((sum, r) => sum + r.newProjects, 0);
      const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

      await this.notificationService.sendStatusNotification(
        `Ciclo #${iteration} completado`,
        {
          totalProcessed,
          totalNew,
          totalErrors,
          platforms: Object.keys(results)
        }
      );
    } catch (error) {
      logger.errorWithStack('Error enviando resumen de ciclo', error);
    }
  }

  async healthCheck() {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        services: {}
      };

      // Health check de servicios
      results.services.projects = await this.projectService.healthCheck();
      results.services.ai = await this.aiService.healthCheck();
      results.services.notifications = await this.notificationService.healthCheck();

      // Health check general
      const allHealthy = Object.values(results.services).every(service => service.healthy);
      
      results.overall = {
        healthy: allHealthy,
        status: allHealthy ? 'OK' : 'DEGRADED'
      };

      return results;
    } catch (error) {
      logger.errorWithStack('Error en health check general', error);
      return {
        timestamp: new Date().toISOString(),
        overall: {
          healthy: false,
          status: 'ERROR',
          error: error.message
        }
      };
    }
  }

  async cleanup(options = {}) {
    try {
      logger.info('Iniciando limpieza del sistema', options);

      await this.projectService.cleanup(options);
      
      logger.info('Limpieza completada');
      return { success: true, cleanedAt: new Date().toISOString() };
    } catch (error) {
      logger.errorWithStack('Error en limpieza del sistema', error);
      throw error;
    }
  }

  async emergencyStop() {
    try {
      logger.warn('Ejecutando parada de emergencia');
      
      // Aquí se implementaría la lógica de parada de emergencia
      // Por ejemplo, cerrar conexiones, guardar estado, etc.
      
      return { success: true, stoppedAt: new Date().toISOString() };
    } catch (error) {
      logger.errorWithStack('Error en parada de emergencia', error);
      throw error;
    }
  }
}

module.exports = new ProjectController(); 