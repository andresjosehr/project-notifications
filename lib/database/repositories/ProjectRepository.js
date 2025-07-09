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
      return parseInt(results[0].total) || 0;
    } catch (error) {
      logger.errorWithStack('Error contando proyectos', error);
      throw error;
    }
  }

  async findWithPagination(page = 1, limit = 20, filters = {}, sort = 'created_at', order = 'desc') {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];

      // Build WHERE conditions based on filters
      if (filters.search) {
        whereConditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.platform) {
        this.validatePlatform(filters.platform);
        whereConditions.push('platform = ?');
        params.push(filters.platform.toLowerCase());
      }

      if (filters.budget) {
        if (filters.budget === '0-500') {
          whereConditions.push('(budget >= 0 AND budget <= 500)');
        } else if (filters.budget === '500-1000') {
          whereConditions.push('(budget > 500 AND budget <= 1000)');
        } else if (filters.budget === '1000-5000') {
          whereConditions.push('(budget > 1000 AND budget <= 5000)');
        } else if (filters.budget === '5000+') {
          whereConditions.push('budget > 5000');
        }
      }

      if (filters.date) {
        const now = new Date();
        let dateCondition = '';
        
        if (filters.date === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateCondition = 'created_at >= ?';
          params.push(today);
        } else if (filters.date === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = 'created_at >= ?';
          params.push(weekAgo);
        } else if (filters.date === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateCondition = 'created_at >= ?';
          params.push(monthAgo);
        }
        
        if (dateCondition) {
          whereConditions.push(dateCondition);
        }
      }

      // Build WHERE clause
      let whereClause = '';
      if (whereConditions.length > 0) {
        whereClause = ' WHERE ' + whereConditions.join(' AND ');
      }

      // Validate sort field and order
      const validSortFields = ['id', 'title', 'platform', 'budget', 'created_at'];
      if (!validSortFields.includes(sort)) {
        sort = 'created_at';
      }
      
      const validOrders = ['asc', 'desc'];
      if (!validOrders.includes(order.toLowerCase())) {
        order = 'desc';
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}${whereClause}`;
      const countResults = await db.query(countQuery, params);
      const total = countResults[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get paginated results
      const dataQuery = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      
      const dataParams = [...params, limit, offset];
      const results = await db.query(dataQuery, dataParams);
      
      const projects = results.map(row => Project.fromDatabase(row));

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos con paginación', error);
      throw error;
    }
  }

  async findRecent(platform = null, limit = 10) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      let params = [];
      
      if (platform) {
        this.validatePlatform(platform);
        query += ' WHERE platform = ?';
        params.push(platform.toLowerCase());
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const results = await db.query(query, params);
      return results.map(row => Project.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo proyectos recientes', error);
      throw error;
    }
  }

  async search(searchQuery, platform = null, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      let query = `SELECT * FROM ${this.tableName} WHERE (title LIKE ? OR description LIKE ?)`;
      let params = [`%${searchQuery}%`, `%${searchQuery}%`];
      
      if (platform) {
        this.validatePlatform(platform);
        query += ' AND platform = ?';
        params.push(platform.toLowerCase());
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const results = await db.query(query, params);
      return results.map(row => Project.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error buscando proyectos', error);
      throw error;
    }
  }
}

module.exports = new ProjectRepository(); 