const db = require('../connection');
const UserProposal = require('../../models/UserProposal');
const logger = require('../../utils/logger');

class UserProposalRepository {
  constructor() {
    this.tableName = 'user_proposals';
  }

  async findAll() {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
      const results = await db.query(query);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo todas las propuestas de usuario', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const results = await db.query(query, [id]);
      
      if (results.length === 0) {
        return null;
      }

      return UserProposal.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuesta de usuario por ID', error);
      throw error;
    }
  }

  async findByUser(userId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? ORDER BY created_at DESC`;
      const results = await db.query(query, [userId]);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuestas por usuario', error);
      throw error;
    }
  }

  async findByProject(projectId, platform) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE project_id = ? AND project_platform = ? ORDER BY created_at DESC`;
      const results = await db.query(query, [projectId, platform]);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuestas por proyecto', error);
      throw error;
    }
  }

  async findByUserAndProject(userId, projectId, platform) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND project_id = ? AND project_platform = ?`;
      const results = await db.query(query, [userId, projectId, platform]);
      
      if (results.length === 0) {
        return null;
      }

      return UserProposal.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuesta por usuario y proyecto', error);
      throw error;
    }
  }

  async hasUserSentProposal(userId, projectId, platform) {
    try {
      const proposal = await this.findByUserAndProject(userId, projectId, platform);
      return proposal !== null;
    } catch (error) {
      logger.errorWithStack('Error verificando si usuario envió propuesta', error);
      throw error;
    }
  }

  async findByUserAndPlatform(userId, platform) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND project_platform = ? ORDER BY created_at DESC`;
      const results = await db.query(query, [userId, platform]);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuestas por usuario y plataforma', error);
      throw error;
    }
  }

  async findByStatus(status) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`;
      const results = await db.query(query, [status]);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuestas por estado', error);
      throw error;
    }
  }

  async findRecent(limit = 10) {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ?`;
      const results = await db.query(query, [limit]);
      return results.map(row => UserProposal.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo propuestas recientes', error);
      throw error;
    }
  }

  async create(userProposal) {
    try {
      const validation = userProposal.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de propuesta inválidos: ${validation.errors.join(', ')}`);
      }

      const data = userProposal.toDatabaseInsert();
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(data);

      const query = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`;
      const result = await db.query(query, values);
      
      logger.dbLog('Propuesta de usuario creada', { 
        id: result.insertId, 
        userId: userProposal.userId, 
        projectId: userProposal.projectId,
        platform: userProposal.projectPlatform 
      });
      
      return result.insertId;
    } catch (error) {
      logger.errorWithStack('Error creando propuesta de usuario', error);
      throw error;
    }
  }

  async update(id, userProposal) {
    try {
      const validation = userProposal.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de propuesta inválidos: ${validation.errors.join(', ')}`);
      }

      const data = userProposal.toDatabaseUpdate();
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = await db.query(query, values);
      
      logger.dbLog('Propuesta de usuario actualizada', { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando propuesta de usuario', error);
      throw error;
    }
  }

  async updateStatus(id, status) {
    try {
      const query = `UPDATE ${this.tableName} SET status = ?, updated_at = NOW() WHERE id = ?`;
      const result = await db.query(query, [status, id]);
      
      logger.dbLog('Estado de propuesta actualizado', { id, status, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando estado de propuesta', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await db.query(query, [id]);
      
      logger.dbLog('Propuesta de usuario eliminada', { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error eliminando propuesta de usuario', error);
      throw error;
    }
  }

  async deleteByUser(userId) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE user_id = ?`;
      const result = await db.query(query, [userId]);
      
      logger.dbLog('Propuestas de usuario eliminadas', { userId, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error eliminando propuestas por usuario', error);
      throw error;
    }
  }

  async count() {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const results = await db.query(query);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando propuestas', error);
      throw error;
    }
  }

  async countByUser(userId) {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE user_id = ?`;
      const results = await db.query(query, [userId]);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando propuestas por usuario', error);
      throw error;
    }
  }

  async countByPlatform(platform) {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE project_platform = ?`;
      const results = await db.query(query, [platform]);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando propuestas por plataforma', error);
      throw error;
    }
  }

  async countByStatus(status) {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE status = ?`;
      const results = await db.query(query, [status]);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando propuestas por estado', error);
      throw error;
    }
  }

  async getStatsByUser(userId) {
    try {
      const query = `
        SELECT 
          project_platform,
          status,
          COUNT(*) as count
        FROM ${this.tableName} 
        WHERE user_id = ?
        GROUP BY project_platform, status
        ORDER BY project_platform, status
      `;
      const results = await db.query(query, [userId]);
      return results;
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas por usuario', error);
      throw error;
    }
  }

  async getStatsByPlatform(platform) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM ${this.tableName} 
        WHERE project_platform = ?
        GROUP BY status
        ORDER BY status
      `;
      const results = await db.query(query, [platform]);
      return results;
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas por plataforma', error);
      throw error;
    }
  }
}

module.exports = new UserProposalRepository();