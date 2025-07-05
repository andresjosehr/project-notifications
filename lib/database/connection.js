const mysql = require('mysql');
const config = require('../config');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.connect();
  }

  connect() {
    try {
      this.pool = mysql.createPool({
        ...config.database,
        multipleStatements: true,
        reconnect: true,
        connectionLimit: config.database.connectionLimit,
        acquireTimeout: config.database.acquireTimeout,
        timeout: config.database.timeout,
        charset: 'utf8mb4'
      });

      this.pool.on('connection', (connection) => {
        logger.dbLog('Nueva conexión establecida', { connectionId: connection.threadId });
      });

      this.pool.on('error', (error) => {
        logger.errorWithStack('Error en pool de conexiones', error);
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
          this.connect();
        }
      });

      logger.dbLog('Pool de conexiones inicializado correctamente');
    } catch (error) {
      logger.errorWithStack('Error al inicializar pool de conexiones', error);
      throw error;
    }
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (error, results, fields) => {
        if (error) {
          logger.errorWithStack('Error en consulta SQL', error);
          reject(error);
        } else {
          logger.debug('Consulta SQL ejecutada', { sql, params, rowCount: results.length });
          resolve(results);
        }
      });
    });
  }

  async transaction(callback) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((error, connection) => {
        if (error) {
          logger.errorWithStack('Error obteniendo conexión para transacción', error);
          return reject(error);
        }

        connection.beginTransaction(async (error) => {
          if (error) {
            connection.release();
            logger.errorWithStack('Error iniciando transacción', error);
            return reject(error);
          }

          try {
            const result = await callback(connection);
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  logger.errorWithStack('Error en commit de transacción', error);
                  reject(error);
                });
              } else {
                connection.release();
                logger.dbLog('Transacción completada exitosamente');
                resolve(result);
              }
            });
          } catch (error) {
            connection.rollback(() => {
              connection.release();
              logger.errorWithStack('Error en transacción, rollback ejecutado', error);
              reject(error);
            });
          }
        });
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.pool) {
        this.pool.end((error) => {
          if (error) {
            logger.errorWithStack('Error cerrando pool de conexiones', error);
            reject(error);
          } else {
            logger.dbLog('Pool de conexiones cerrado correctamente');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new DatabaseConnection(); 