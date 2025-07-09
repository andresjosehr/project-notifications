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
        charset: 'utf8mb4',
        // Configuraciones para prevenir "Packets out of order"
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        // Timeouts específicos para evitar conexiones colgadas
        socketTimeout: 60000,
        // Configurar keep-alive
        keepAliveInitialDelay: 300000, // 5 minutos
        enableKeepAlive: true,
        // Configurar reintentos
        reconnectAttempts: 3,
        reconnectTimeout: 2000
      });

      this.pool.on('connection', (connection) => {
        logger.dbLog('Nueva conexión establecida', { connectionId: connection.threadId });
      });

      this.pool.on('error', (error) => {
        logger.errorWithStack('Error en pool de conexiones', error);
        if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
            error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
            error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
          logger.warn('Reconectando pool de conexiones debido a error de protocolo');
          this.reconnect();
        }
      });

      logger.dbLog('Pool de conexiones inicializado correctamente');
    } catch (error) {
      logger.errorWithStack('Error al inicializar pool de conexiones', error);
      throw error;
    }
  }

  reconnect() {
    if (this.pool) {
      this.pool.end(() => {
        logger.dbLog('Pool anterior cerrado para reconexión');
        setTimeout(() => {
          this.connect();
        }, 1000);
      });
    } else {
      this.connect();
    }
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.pool) {
        return reject(new Error('Pool de conexiones no disponible'));
      }
      
      this.pool.query(sql, params, (error, results, fields) => {
        if (error) {
          logger.errorWithStack('Error en consulta SQL', error);
          // Reintentar si es un error de protocolo
          if (error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
              error.code === 'PROTOCOL_CONNECTION_LOST') {
            logger.warn('Reintentando consulta después de error de protocolo');
            this.reconnect();
            setTimeout(() => {
              this.query(sql, params).then(resolve).catch(reject);
            }, 2000);
            return;
          }
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