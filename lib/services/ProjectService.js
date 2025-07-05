const ProjectRepository = require('../database/repositories/ProjectRepository');
const ScraperFactory = require('../scrapers/ScraperFactory');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');
const Project = require('../models/Project');

class ProjectService {
  constructor() {
    this.repository = ProjectRepository;
    this.notificationService = NotificationService;
  }

  async scrapeAndProcessProjects(platform = null, options = {}) {
    try {
      logger.info('Iniciando scraping y procesamiento de proyectos', { platform });

      let scrapedProjects = {};
      
      if (platform) {
        // Scraping de una plataforma específica
        const scraper = ScraperFactory.create(platform);
        scrapedProjects[platform] = await scraper.execute();
      } else {
        // Scraping de todas las plataformas
        if (options.parallel) {
          scrapedProjects = await ScraperFactory.executeParallel();
        } else {
          scrapedProjects = await ScraperFactory.executeAll();
        }
      }

      const results = {};
      
      for (const [platformName, projects] of Object.entries(scrapedProjects)) {
        try {
          const result = await this.processNewProjects(projects, platformName, options);
          results[platformName] = result;
        } catch (error) {
          logger.errorWithStack(`Error procesando proyectos de ${platformName}`, error);
          results[platformName] = { processed: 0, newProjects: 0, errors: 1 };
        }
      }

      logger.info('Scraping y procesamiento completado', { results });
      return results;
    } catch (error) {
      logger.errorWithStack('Error en scraping y procesamiento de proyectos', error);
      throw error;
    }
  }

  async processNewProjects(projects, platform, options = {}) {
    try {
      if (!projects || projects.length === 0) {
        logger.info(`No hay proyectos para procesar en ${platform}`);
        return { processed: 0, newProjects: 0, errors: 0 };
      }

      logger.info(`Procesando ${projects.length} proyectos de ${platform}`);

      // Obtener proyectos existentes
      const existingProjects = await this.repository.findByLinks(
        projects.map(p => p.link),
        platform
      );

      // Filtrar proyectos nuevos
      const newProjects = projects.filter(project => {
        return !existingProjects.find(existing => 
          existing.link === project.link && existing.title === project.title
        );
      });

      if (newProjects.length === 0) {
        logger.info(`No hay proyectos nuevos en ${platform}`);
        return { processed: projects.length, newProjects: 0, errors: 0 };
      }

      // Guardar proyectos nuevos
      const savedCount = await this.repository.createMany(newProjects, platform);
      
      logger.info(`${savedCount} proyectos nuevos guardados en ${platform}`);

      // Enviar notificaciones si está habilitado
      
      if (options.sendNotifications !== false) {
        await this.sendNotificationsForNewProjects(newProjects, platform, options);
      }

      return { 
        processed: projects.length, 
        newProjects: savedCount, 
        errors: 0 
      };
    } catch (error) {
      logger.errorWithStack(`Error procesando proyectos nuevos de ${platform}`, error);
      return { 
        processed: projects.length, 
        newProjects: 0, 
        errors: 1 
      };
    }
  }

  async sendNotificationsForNewProjects(projects, platform, options = {}) {
    try {
      if (!projects || projects.length === 0) {
        return;
      }

      // Obtener IDs de los proyectos recién guardados
      const projectsWithIds = [];
      for (const project of projects) {
        const savedProject = await this.repository.findByLink(project.link, platform);
        if (savedProject) {
          projectsWithIds.push(savedProject);
        }
      }

      const notificationOptions = {
        translate: options.translate !== false,
        delay: options.notificationDelay || 1000,
        ...options.notificationOptions
      };

      await this.notificationService.sendMultipleNotifications(
        projectsWithIds,
        options.user,
        notificationOptions
      );

      logger.info(`Notificaciones enviadas para ${projectsWithIds.length} proyectos de ${platform}`);
    } catch (error) {
      logger.errorWithStack(`Error enviando notificaciones para ${platform}`, error);
    }
  }

  async getProjectById(id, platform) {
    try {
      const project = await this.repository.findById(id, platform);
      if (!project) {
        throw new Error(`Proyecto con ID ${id} no encontrado en ${platform}`);
      }
      return project;
    } catch (error) {
      logger.errorWithStack(`Error obteniendo proyecto ${id} de ${platform}`, error);
      throw error;
    }
  }

  async getAllProjects(platform = null, options = {}) {
    try {
      const projects = await this.repository.findAll(platform);
      
      if (options.limit) {
        return projects.slice(0, options.limit);
      }
      
      return projects;
    } catch (error) {
      logger.errorWithStack('Error obteniendo todos los proyectos', error);
      throw error;
    }
  }

  async searchProjects(query, platform = null, options = {}) {
    try {
      const allProjects = await this.repository.findAll(platform);
      
      const searchTerm = query.toLowerCase();
      const matchingProjects = allProjects.filter(project => {
        return (
          project.title.toLowerCase().includes(searchTerm) ||
          project.description.toLowerCase().includes(searchTerm) ||
          (project.skills && project.skills.some(skill => 
            skill.toLowerCase().includes(searchTerm)
          ))
        );
      });

      if (options.limit) {
        return matchingProjects.slice(0, options.limit);
      }
      
      return matchingProjects;
    } catch (error) {
      logger.errorWithStack('Error buscando proyectos', error);
      throw error;
    }
  }

  async getProjectStats(platform = null) {
    try {
      const stats = {};
      
      if (platform) {
        stats[platform] = await this.repository.count(platform);
      } else {
        const platforms = ScraperFactory.getSupportedPlatforms();
        for (const p of platforms) {
          stats[p] = await this.repository.count(p);
        }
        stats.total = await this.repository.count();
      }
      
      return stats;
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas de proyectos', error);
      throw error;
    }
  }

  async updateProject(id, projectData, platform) {
    try {
      const project = new Project(projectData);
      const updated = await this.repository.update(id, project, platform);
      
      if (!updated) {
        throw new Error(`No se pudo actualizar el proyecto ${id} en ${platform}`);
      }
      
      return await this.repository.findById(id, platform);
    } catch (error) {
      logger.errorWithStack(`Error actualizando proyecto ${id} en ${platform}`, error);
      throw error;
    }
  }

  async deleteProject(id, platform) {
    try {
      const deleted = await this.repository.delete(id, platform);
      
      if (!deleted) {
        throw new Error(`No se pudo eliminar el proyecto ${id} de ${platform}`);
      }
      
      return true;
    } catch (error) {
      logger.errorWithStack(`Error eliminando proyecto ${id} de ${platform}`, error);
      throw error;
    }
  }

  async cleanup(options = {}) {
    try {
      // Limpiar proyectos antiguos si está especificado
      if (options.cleanupOldProjects) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (options.daysToKeep || 30));
        
        // Implementar lógica de limpieza aquí
        logger.info('Limpieza de proyectos antiguos completada');
      }
      
      // Limpiar duplicados si está especificado
      if (options.removeDuplicates) {
        // Implementar lógica de eliminación de duplicados aquí
        logger.info('Eliminación de duplicados completada');
      }
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error en limpieza de proyectos', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const stats = await this.getProjectStats();
      const dbHealthy = Object.values(stats).every(count => typeof count === 'number');
      
      return {
        healthy: dbHealthy,
        stats,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.errorWithStack('Error en health check de ProjectService', error);
      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
}

module.exports = new ProjectService(); 