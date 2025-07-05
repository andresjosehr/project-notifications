const db = require('../connection');
const Project = require('../../models/Project');
const logger = require('../../utils/logger');

class ProjectRepository {
  constructor() {
    this.tableName = 'projects';
  }

  validatePlatform(platform) {
    if (!['workana', 'upwork'].includes(platform.toLowerCase())) {
      throw new Error(`Plataforma no soportada: ${platform}`);
    }
    return platform.toLowerCase();
  }

  async findAll(platform = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      let params = [];
      
      if (platform) {
        this.validatePlatform(platform);
        query += ' WHERE platform = ?';
        params.push(platform.toLowerCase());
      }
      
      query += ' ORDER BY created_at DESC';

      const results = await db.query(query, params);
      return results.map(row => Project.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo todos los proyectos', error);
      throw error;
    }
  }

  async findById(id, platform = null) {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      let params = [id];
      
      if (platform) {
        this.validatePlatform(platform);
        query += ' AND platform = ?';
        params.push(platform.toLowerCase());
      }
      
      const results = await db.query(query, params);
      
      if (results.length === 0) {
        return null;
      }

      return Project.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyecto por ID', error);
      throw error;
    }
  }

  async findByLink(link, platform) {
    try {
      this.validatePlatform(platform);
      const query = `SELECT * FROM ${this.tableName} WHERE link = ? AND platform = ?`;
      const results = await db.query(query, [link, platform.toLowerCase()]);
      
      if (results.length === 0) {
        return null;
      }

      return Project.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyecto por link', error);
      throw error;
    }
  }

  async findByLinks(links, platform) {
    try {
      if (!links || links.length === 0) {
        return [];
      }

      this.validatePlatform(platform);
      const placeholders = links.map(() => '?').join(',');
      const query = `SELECT * FROM ${this.tableName} WHERE link IN (${placeholders}) AND platform = ?`;
      const params = [...links, platform.toLowerCase()];
      const results = await db.query(query, params);
      
      return results.map(row => Project.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos por links', error);
      throw error;
    }
  }

  async create(project, platform) {
    try {
      const validation = project.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de proyecto inválidos: ${validation.errors.join(', ')}`);
      }

      this.validatePlatform(platform);
      const data = project.toDatabaseInsert();
      data.platform = platform.toLowerCase();
      
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(data);

      const query = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`;
      const result = await db.query(query, values);
      
      logger.dbLog(`Proyecto creado en ${platform}`, { id: result.insertId, title: project.title });
      
      return result.insertId;
    } catch (error) {
      logger.errorWithStack('Error creando proyecto', error);
      throw error;
    }
  }

  async createMany(projects, platform) {
    try {
      if (!projects || projects.length === 0) {
        return [];
      }

      this.validatePlatform(platform);
      const validProjects = [];
      
      for (const project of projects) {
        const validation = project.validate();
        if (validation.isValid) {
          validProjects.push(project);
        } else {
          logger.warn(`Proyecto inválido omitido: ${validation.errors.join(', ')}`, { project: project.toJSON() });
        }
      }

      if (validProjects.length === 0) {
        return [];
      }

      const firstProject = validProjects[0].toDatabaseInsert();
      firstProject.platform = platform.toLowerCase();
      const fields = Object.keys(firstProject);
      const placeholders = `(${fields.map(() => '?').join(',')})`;
      const values = [];

      for (const project of validProjects) {
        const data = project.toDatabaseInsert();
        data.platform = platform.toLowerCase();
        values.push(...Object.values(data));
      }

      const query = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES ${validProjects.map(() => placeholders).join(',')}`;
      const result = await db.query(query, values);
      
      logger.dbLog(`${validProjects.length} proyectos creados en ${platform}`, { affectedRows: result.affectedRows });
      
      return result.affectedRows;
    } catch (error) {
      logger.errorWithStack('Error creando múltiples proyectos', error);
      throw error;
    }
  }

  async update(id, project, platform) {
    try {
      const validation = project.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de proyecto inválidos: ${validation.errors.join(', ')}`);
      }

      this.validatePlatform(platform);
      const data = project.toDatabaseInsert();
      data.platform = platform.toLowerCase();
      
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(data), id, platform.toLowerCase()];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? AND platform = ?`;
      const result = await db.query(query, values);
      
      logger.dbLog(`Proyecto actualizado en ${platform}`, { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando proyecto', error);
      throw error;
    }
  }

  async delete(id, platform) {
    try {
      this.validatePlatform(platform);
      const query = `DELETE FROM ${this.tableName} WHERE id = ? AND platform = ?`;
      const result = await db.query(query, [id, platform.toLowerCase()]);
      
      logger.dbLog(`Proyecto eliminado de ${platform}`, { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error eliminando proyecto', error);
      throw error;
    }
  }

  async count(platform = null) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      let params = [];
      
      if (platform) {
        this.validatePlatform(platform);
        query += ' WHERE platform = ?';
        params.push(platform.toLowerCase());
      }

      const results = await db.query(query, params);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando proyectos', error);
      throw error;
    }
  }
}

module.exports = new ProjectRepository(); 