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
        // Configuraciones válidas para MySQL2
        idleTimeout: 300000, // 5 minutos
        // Configuración de keep-alive (usando las opciones correctas)
        keepAliveInitialDelay: 60000,
        enableKeepAlive: true
      });

      this.pool.on('connection', (connection) => {
        logger.dbLog('Nueva conexión establecida', { connectionId: connection.threadId });
      });

      this.pool.on('error', (error) => {
        logger.errorWithStack('Error en pool de conexiones - CONTINUANDO', error);
        
        // Para errores de protocolo, simplemente logear - NO hacer nada
        if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
            error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
            error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
          logger.warn('Error de protocolo detectado - IGNORANDO y continuando');
          // NO hacer nada - dejar que el pool se recupere solo
          // NO llamar a reconnect() - mantener el pool funcionando
        }
      });

      logger.dbLog('Pool de conexiones inicializado correctamente');
    } catch (error) {
      logger.errorWithStack('Error al inicializar pool de conexiones', error);
      throw error;
    }
  }

  reconnect() {
    logger.info('Iniciando reconexión del pool de base de datos');
    
    if (this.pool) {
      // Intentar cerrar el pool existente de forma segura
      try {
        this.pool.end(() => {
          logger.dbLog('Pool anterior cerrado para reconexión');
          this.pool = null;
          setTimeout(() => {
            this.connect();
          }, 2000); // Esperar un poco más antes de reconectar
        });
      } catch (error) {
        logger.errorWithStack('Error cerrando pool para reconexión', error);
        // Si hay error cerrando, forzar destrucción
        try {
          this.pool.destroy();
        } catch (destroyError) {
          logger.errorWithStack('Error destruyendo pool', destroyError);
        }
        this.pool = null;
        setTimeout(() => {
          this.connect();
        }, 2000);
      }
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
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
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
        
        // Reintentar para errores recuperables
        if (retryCount < maxRetries && (
            error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
            error.code === 'PROTOCOL_CONNECTION_LOST' ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'POOL_CLOSED' ||
            error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY'
          )) {
          retryCount++;
          logger.warn(`Reintentando consulta (${retryCount}/${maxRetries}) después de error de protocolo`);
          
          // Esperar un poco antes de reintentar (backoff exponencial)
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Verificar nuevamente si el sistema está cerrándose antes del reintento
          if (process.env.SHUTTING_DOWN === 'true') {
            throw new Error('Sistema cerrándose - cancelando reintento');
          }
          
          // Si el pool está cerrado, intentar recrearlo
          if (error.code === 'POOL_CLOSED' && !this.pool) {
            logger.info('Recreando pool de conexiones cerrado');
            this.connect();
          }
          
          continue; // Reintentar
        }
        
        // Si llegamos aquí, o no es un error recuperable o agotamos los reintentos
        throw error;
      }
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
    // SOLO permitir cierre si es absolutamente necesario
    if (process.env.FORCE_SHUTDOWN !== 'true') {
      logger.warn('Intento de cierre de pool bloqueado - sistema debe continuar funcionando');
      return;
    }
    
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