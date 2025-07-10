const mysql = require('mysql2/promise');
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
        connectionLimit: config.database.connectionLimit || 10,
        acquireTimeout: config.database.acquireTimeout || 30000,
        timeout: config.database.timeout || 30000,
        charset: 'utf8mb4',
        // Configuraciones para prevenir "Packets out of order"
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        // Timeouts específicos para evitar conexiones colgadas
        socketTimeout: 30000,
        // Configurar keep-alive
        keepAliveInitialDelay: 60000, // 1 minuto
        enableKeepAlive: true,
        // Configurar tiempo de inactividad
        idleTimeout: 300000, // 5 minutos
        // Configuración de reconexión automática
        reconnect: true,
        reconnectTimeout: 2000,
        maxReconnects: 3
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

  async query(sql, params = []) {
    // Verificar si el sistema está cerrándose
    if (process.env.SHUTTING_DOWN === 'true') {
      throw new Error('Sistema cerrándose - no se permiten nuevas consultas');
    }
    
    if (!this.pool) {
      throw new Error('Pool de conexiones no disponible');
    }
    
    try {
      const [results] = await this.pool.execute(sql, params);
      logger.debug('Consulta SQL ejecutada', { sql, params, rowCount: results.length });
      return results;
    } catch (error) {
      logger.errorWithStack('Error en consulta SQL', error);
      
      // No reintentar si el sistema está cerrándose
      if (process.env.SHUTTING_DOWN === 'true') {
        throw new Error('Sistema cerrándose - no se permiten reintentos');
      }
      
      // Reintentar si es un error de protocolo
      if (error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT') {
        logger.warn('Reintentando consulta después de error de protocolo');
        
        // Esperar un poco antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar nuevamente si el sistema está cerrándose antes del reintento
        if (process.env.SHUTTING_DOWN === 'true') {
          throw new Error('Sistema cerrándose - cancelando reintento');
        }
        
        try {
          const [results] = await this.pool.execute(sql, params);
          logger.info('Consulta ejecutada exitosamente después de reintento');
          return results;
        } catch (retryError) {
          logger.errorWithStack('Error en reintento de consulta', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  async transaction(callback) {
    // Verificar si el sistema está cerrándose
    if (process.env.SHUTTING_DOWN === 'true') {
      throw new Error('Sistema cerrándose - no se permiten nuevas transacciones');
    }
    
    if (!this.pool) {
      throw new Error('Pool de conexiones no disponible');
    }
    
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      logger.dbLog('Transacción iniciada');
      
      const result = await callback(connection);
      
      await connection.commit();
      logger.dbLog('Transacción completada exitosamente');
      
      return result;
    } catch (error) {
      await connection.rollback();
      logger.errorWithStack('Error en transacción, rollback ejecutado', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      try {
        // Marcar el pool como cerrándose
        process.env.SHUTTING_DOWN = 'true';
        
        // Dar tiempo a las consultas en curso
        logger.shutdownLog('Esperando a que terminen las consultas en curso...');
        await new Promise(resolve => setTimeout(resolve, config.errorHandling.gracefulShutdown.databaseTimeout));
        
        // Cerrar el pool
        await this.pool.end();
        logger.shutdownLog('Pool de conexiones cerrado correctamente');
        this.pool = null;
      } catch (error) {
        logger.errorWithStack('Error cerrando pool de conexiones', error);
        // Forzar cierre del pool si hay error
        if (this.pool) {
          try {
            this.pool.destroy();
            logger.shutdownLog('Pool de conexiones destruido forzosamente');
          } catch (destroyError) {
            logger.errorWithStack('Error destruyendo pool', destroyError);
          }
          this.pool = null;
        }
        throw error;
      }
    }
  }
}

module.exports = new DatabaseConnection(); 