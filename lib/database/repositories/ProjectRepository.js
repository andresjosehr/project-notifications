const db = require('../connection');
const Project = require('../../models/Project');
const logger = require('../../utils/logger');

class ProjectRepository {
  constructor() {
    this.tableName = 'projects';
    this.workanaTable = 'workana_projects';
    this.upworkTable = 'upwork_projects';
  }

  getTableName(platform) {
    switch (platform.toLowerCase()) {
      case 'workana':
        return this.workanaTable;
      case 'upwork':
        return this.upworkTable;
      default:
        throw new Error(`Plataforma no soportada: ${platform}`);
    }
  }

  async findAll(platform = null) {
    try {
      let query = 'SELECT * FROM ';
      
      if (platform) {
        query += this.getTableName(platform);
      } else {
        // Unión de ambas tablas con campo de plataforma
        query = `
          SELECT *, 'workana' as platform FROM ${this.workanaTable}
          UNION ALL
          SELECT *, 'upwork' as platform FROM ${this.upworkTable}
          ORDER BY created_at DESC
        `;
      }

      const results = await db.query(query);
      return results.map(row => Project.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo todos los proyectos', error);
      throw error;
    }
  }

  async findById(id, platform) {
    try {
      const tableName = this.getTableName(platform);
      const query = `SELECT * FROM ${tableName} WHERE id = ?`;
      const results = await db.query(query, [id]);
      
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
      const tableName = this.getTableName(platform);
      const query = `SELECT * FROM ${tableName} WHERE link = ?`;
      const results = await db.query(query, [link]);
      
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

      const tableName = this.getTableName(platform);
      const placeholders = links.map(() => '?').join(',');
      const query = `SELECT * FROM ${tableName} WHERE link IN (${placeholders})`;
      const results = await db.query(query, links);
      
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

      const tableName = this.getTableName(platform);
      const data = project.toDatabaseInsert();
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(data);

      const query = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES (${placeholders})`;
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

      const tableName = this.getTableName(platform);
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
      const fields = Object.keys(firstProject);
      const placeholders = `(${fields.map(() => '?').join(',')})`;
      const values = [];

      for (const project of validProjects) {
        const data = project.toDatabaseInsert();
        values.push(...Object.values(data));
      }

      const query = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES ${validProjects.map(() => placeholders).join(',')}`;
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

      const tableName = this.getTableName(platform);
      const data = project.toDatabaseInsert();
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
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
      const tableName = this.getTableName(platform);
      const query = `DELETE FROM ${tableName} WHERE id = ?`;
      const result = await db.query(query, [id]);
      
      logger.dbLog(`Proyecto eliminado de ${platform}`, { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error eliminando proyecto', error);
      throw error;
    }
  }

  async count(platform = null) {
    try {
      let query = 'SELECT COUNT(*) as total FROM ';
      
      if (platform) {
        query += this.getTableName(platform);
      } else {
        query = `
          SELECT (
            (SELECT COUNT(*) FROM ${this.workanaTable}) +
            (SELECT COUNT(*) FROM ${this.upworkTable})
          ) as total
        `;
      }

      const results = await db.query(query);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando proyectos', error);
      throw error;
    }
  }
}

module.exports = new ProjectRepository(); 