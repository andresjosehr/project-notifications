const db = require('../connection');
const User = require('../../models/User');
const logger = require('../../utils/logger');

class UserRepository {
  constructor() {
    this.tableName = 'users';
  }

  async findAll() {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
      const results = await db.query(query);
      return results.map(row => User.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo todos los usuarios', error);
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

      return User.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuario por ID', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE email = ?`;
      const results = await db.query(query, [email]);
      
      if (results.length === 0) {
        return null;
      }

      return User.fromDatabase(results[0]);
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuario por email', error);
      throw error;
    }
  }

  async findActive() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE is_active = TRUE ORDER BY created_at DESC`;
      const results = await db.query(query);
      return results.map(row => User.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuarios activos', error);
      throw error;
    }
  }

  async findWithValidSession() {
    try {
      const query = `
        SELECT u.* FROM ${this.tableName} u
        INNER JOIN external_credentials ec ON u.id = ec.user_id
        WHERE u.is_active = TRUE 
        AND ec.is_active = 1
        AND ec.session_data IS NOT NULL 
        AND ec.session_expires_at > NOW()
        ORDER BY u.created_at DESC
      `;
      const results = await db.query(query);
      return results.map(row => User.fromDatabase(row));
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuarios con sesión válida', error);
      throw error;
    }
  }

  async create(user) {
    try {
      const validation = user.validate();
      if (!validation.isValid) {
        throw new Error(`Datos de usuario inválidos: ${validation.errors.join(', ')}`);
      }

      const data = user.toDatabaseInsert();
      
      // Encriptar contraseña del sistema si existe
      if (data.password) {
        const bcrypt = require('bcrypt');
        data.password = await bcrypt.hash(data.password, 10);
      }
      
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(data);

      const query = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`;
      const result = await db.query(query, values);
      
      logger.dbLog('Usuario creado', { id: result.insertId });
      
      return result.insertId;
    } catch (error) {
      logger.errorWithStack('Error creando usuario', error);
      throw error;
    }
  }

  async update(id, user) {
    try {
      const validation = user.validateForUpdate();
      if (!validation.isValid) {
        throw new Error(`Datos de usuario inválidos: ${validation.errors.join(', ')}`);
      }

      // Obtener el usuario original para comparar cambios
      const originalUser = await this.findById(id);
      if (!originalUser) {
        throw new Error('Usuario no encontrado');
      }

      const data = user.toDatabasePartialUpdate(originalUser);
      
      // Encriptar contraseña si se está actualizando
      if (data.password) {
        const bcrypt = require('bcrypt');
        data.password = await bcrypt.hash(data.password, 10);
      }
      
      // Si no hay campos para actualizar, retornar true
      if (Object.keys(data).length === 1 && data.updated_at) {
        logger.dbLog('No hay cambios para actualizar', { id });
        return true;
      }

      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = await db.query(query, values);
      
      logger.dbLog('Usuario actualizado', { id, affectedRows: result.affectedRows, updatedFields: fields });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando usuario', error);
      throw error;
    }
  }

  async updateSession(id, sessionData, expiresAt) {
    try {
      // Actualizar sesión en external_credentials
      const query = `
        UPDATE external_credentials 
        SET session_data = ?, session_expires_at = ?, updated_at = NOW()
        WHERE user_id = ? AND platform = 'workana'
      `;
      const result = await db.query(query, [sessionData, expiresAt, id]);
      
      logger.dbLog('Sesión de usuario actualizada', { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando sesión de usuario', error);
      throw error;
    }
  }

  async clearSession(id) {
    try {
      const query = `
        UPDATE external_credentials 
        SET session_data = NULL, session_expires_at = NULL, updated_at = NOW()
        WHERE user_id = ? AND platform = 'workana'
      `;
      const result = await db.query(query, [id]);
      
      logger.dbLog('Sesión de usuario limpiada', { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error limpiando sesión de usuario', error);
      throw error;
    }
  }

  async setActive(id, isActive) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET is_active = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const result = await db.query(query, [isActive, id]);
      
      logger.dbLog('Estado de usuario actualizado', { id, isActive, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error actualizando estado de usuario', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await db.query(query, [id]);
      
      logger.dbLog('Usuario eliminado', { id, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.errorWithStack('Error eliminando usuario', error);
      throw error;
    }
  }

  async count() {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const results = await db.query(query);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando usuarios', error);
      throw error;
    }
  }

  async countActive() {
    try {
      const query = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE is_active = TRUE`;
      const results = await db.query(query);
      return results[0].total;
    } catch (error) {
      logger.errorWithStack('Error contando usuarios activos', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();