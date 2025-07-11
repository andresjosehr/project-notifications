const db = require('../connection');
const ExternalCredential = require('../../models/ExternalCredential');
const logger = require('../../utils/logger');

class ExternalCredentialRepository {
  constructor() {
    this.tableName = 'external_credentials';
  }

  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const results = await db.query(query, [id]);
      
      if (results.length === 0) {
        return null;
      }

      return ExternalCredential.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo credencial externa por ID', error);
      throw error;
    }
  }

  async findByUserIdAndPlatform(userId, platform) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND platform = ? AND is_active = 1`;
      const results = await db.query(query, [userId, platform.toLowerCase()]);
      
      if (results.length === 0) {
        return null;
      }

      return ExternalCredential.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo credencial por usuario y plataforma', error);
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND is_active = 1 ORDER BY platform`;
      const results = await db.query(query, [userId]);
      
      return results.map(row => ExternalCredential.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales por usuario', error);
      throw error;
    }
  }

  async findByPlatform(platform) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE platform = ? AND is_active = 1`;
      const results = await db.query(query, [platform.toLowerCase()]);
      
      return results.map(row => ExternalCredential.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales por plataforma', error);
      throw error;
    }
  }

  async findActiveCredentials() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY user_id, platform`;
      const results = await db.query(query);
      
      return results.map(row => ExternalCredential.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales activas', error);
      throw error;
    }
  }

  async create(credential) {
    try {
      const validation = credential.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de credencial inválidos: ${validation.errors.join(', ')}`);
      }

      const data = credential.toDatabaseInsert();
      
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(data);

      const query = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`;
      const result = await db.query(query, values);
      
      logger.dbLog('Credencial externa creada', { 
        id: result.insertId, 
        userId: credential.userId, 
        platform: credential.platform 
      });
      
      return result.insertId;
    } catch (error) {
      logger.errorWithStack('Error creando credencial externa', error);
      throw error;
    }
  }

  async update(credential) {
    try {
      const validation = credential.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de credencial inválidos: ${validation.errors.join(', ')}`);
      }

      const data = credential.toDatabaseUpdate();
      
      const fields = Object.keys(data).map(field => `${field} = ?`).join(',');
      const values = Object.values(data);
      values.push(credential.id);

      const query = `UPDATE ${this.tableName} SET ${fields} WHERE id = ?`;
      await db.query(query, values);
      
      logger.dbLog('Credencial externa actualizada', { 
        id: credential.id, 
        userId: credential.userId, 
        platform: credential.platform 
      });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error actualizando credencial externa', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      await db.query(query, [id]);
      
      logger.dbLog('Credencial externa eliminada', { id });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error eliminando credencial externa', error);
      throw error;
    }
  }

  async deactivate(id) {
    try {
      const query = `UPDATE ${this.tableName} SET is_active = 0, updated_at = NOW() WHERE id = ?`;
      await db.query(query, [id]);
      
      logger.dbLog('Credencial externa desactivada', { id });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error desactivando credencial externa', error);
      throw error;
    }
  }

  async updateSessionData(id, sessionData, expiresAt) {
    try {
      const query = `UPDATE ${this.tableName} SET session_data = ?, session_expires_at = ?, updated_at = NOW() WHERE id = ?`;
      await db.query(query, [sessionData, expiresAt, id]);
      
      logger.dbLog('Datos de sesión actualizados', { id });
      
      return true;
    } catch (error) {
      logger.errorWithStack('Error actualizando datos de sesión', error);
      throw error;
    }
  }

  async count() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const results = await db.query(query);
      
      return results[0].count;
    } catch (error) {
      logger.errorWithStack('Error contando credenciales externas', error);
      throw error;
    }
  }
}

module.exports = ExternalCredentialRepository; 