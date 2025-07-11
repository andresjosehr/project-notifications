const logger = require('../utils/logger');
const NotificationService = require('../services/NotificationService');
const DateUtils = require('../utils/dateUtils');
const config = require('../config');

class ErrorHandler {
  constructor() {
    this.notificationService = NotificationService;
    this.isShuttingDown = false;
    this.connectionRecoveryTimer = null;
  }

  // Manejo de errores para operaciones asíncronas
  asyncErrorHandler(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, fn.name);
        throw error;
      }
    };
  }

  // Manejo centralizado de errores - NUNCA cerrar el sistema
  handleError(error, context = 'Unknown') {
    // Clasificar tipo de error
    const errorType = this.classifyError(error);
    
    // Log del error
    logger.errorWithStack(`Error en ${context} - SISTEMA CONTINUA FUNCIONANDO`, error);
    
    // Determinar severidad
    const severity = this.determineErrorSeverity(error);
    
    // Registrar métricas del error
    this.recordErrorMetrics(error, context, severity);
    
    // Para errores de base de datos, programar recuperación
    if (error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY' ||
        error.code === 'POOL_CLOSED') {
      this.scheduleConnectionRecovery();
    }
    
    // NO enviar notificaciones críticas que puedan usar DB
    // Solo log para debugging
    
    return {
      type: errorType,
      severity,
      message: error.message,
      context,
      timestamp: DateUtils.toVenezuelaString()
    };
  }

  classifyError(error) {
    // Errores de red
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return 'network';
    }
    
    // Errores de base de datos
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
        error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
      return 'database';
    }
    
    // Errores de scraping
    if (error.message.includes('selector') || error.message.includes('timeout')) {
      return 'scraping';
    }
    
    // Errores de IA
    if (error.message.includes('API') && error.message.includes('AI')) {
      return 'ai';
    }
    
    // Errores de validación
    if (error.message.includes('validation') || error.message.includes('required')) {
      return 'validation';
    }
    
    // Errores de autenticación
    if (error.code === 401 || error.message.includes('unauthorized')) {
      return 'authentication';
    }
    
    // Error genérico
    return 'generic';
  }

  determineErrorSeverity(error) {
    // Errores críticos
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
      return 'critical';
    }
    
    // Errores de alta severidad
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return 'high';
    }
    
    // Errores de severidad media
    if (error.code === 'ENOTFOUND' || error.message.includes('not found')) {
      return 'medium';
    }
    
    // Errores de baja severidad
    return 'low';
  }

  recordErrorMetrics(error, context, severity) {
    // Aquí se podrían registrar métricas en un sistema de monitoreo
    logger.debug('Error metrics recorded', {
      error: error.message,
      context,
      severity,
      timestamp: DateUtils.toVenezuelaString()
    });
  }

  async sendCriticalErrorNotification(error, context) {
    try {
      // Evitar notificaciones si el sistema está cerrándose o hay errores de DB
      if (process.env.SHUTTING_DOWN === 'true' || this.isShuttingDown) {
        logger.warn('Sistema cerrándose - omitiendo notificación crítica');
        return;
      }
      
      // Evitar notificaciones si es un error de base de datos
      if (error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY' ||
          error.code === 'POOL_CLOSED') {
        logger.warn('Error de base de datos detectado - omitiendo notificación para evitar recursión');
        return;
      }
      
      await this.notificationService.sendErrorNotification(error, context);
    } catch (notificationError) {
      logger.errorWithStack('Error enviando notificación crítica', notificationError);
    }
  }

  // Wrapper para funciones que pueden fallar
  withErrorHandling(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorInfo = this.handleError(error, context);
        
        // Para errores críticos, relanzar
        if (errorInfo.severity === 'critical') {
          throw error;
        }
        
        // Para otros errores, devolver resultado de error
        return {
          success: false,
          error: errorInfo,
          result: null
        };
      }
    };
  }

  // Manejo de errores específicos por tipo
  async handleDatabaseError(error, context) {
    logger.errorWithStack(`Database error in ${context}`, error);
    
    // No intentar reconectar si el sistema está cerrándose
    if (process.env.SHUTTING_DOWN === 'true') {
      logger.info('Sistema cerrándose - no se intentará reconectar');
      return this.handleError(error, context);
    }
    
    // Intentar reconectar si es necesario
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
        error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
      logger.info('Attempting to reconnect to database...');
      try {
        const db = require('../database/connection');
        db.reconnect();
      } catch (reconnectError) {
        logger.errorWithStack('Error durante reconexión de base de datos', reconnectError);
      }
    }
    
    return this.handleError(error, context);
  }

  async handleScrapingError(error, context) {
    logger.errorWithStack(`Scraping error in ${context}`, error);
    
    // Tomar screenshot para debugging si es posible
    if (error.page && typeof error.page.screenshot === 'function') {
      try {
        await error.page.screenshot({ path: `error-${Date.now()}.png` });
      } catch (screenshotError) {
        logger.warn('Could not take error screenshot', screenshotError);
      }
    }
    
    return this.handleError(error, context);
  }

  async handleAIError(error, context) {
    logger.errorWithStack(`AI error in ${context}`, error);
    
    // Verificar si es un error de rate limiting
    if (error.message.includes('rate limit')) {
      logger.warn('AI rate limit reached, implementing backoff...');
      // Implementar backoff aquí
    }
    
    return this.handleError(error, context);
  }

  // Manejo de errores no capturados
  setupGlobalErrorHandlers() {
    // Manejo de promesas rechazadas no capturadas - NUNCA cerrar el sistema
    process.on('unhandledRejection', (reason) => {
      logger.errorWithStack('Unhandled Rejection - CONTINUANDO EJECUCIÓN', reason);
      
      // Para TODOS los errores, simplemente logear y continuar
      if (reason && reason.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
        logger.warn('Error de base de datos detectado - CONTINUANDO SIN CERRAR');
        this.scheduleConnectionRecovery();
        return; // NO cerrar el sistema
      }
      
      // Manejar el error sin cerrar
      this.handleError(reason, 'unhandledRejection');
      // NO llamar gracefulShutdown() - mantener el sistema funcionando
    });
    
    // Manejo de excepciones no capturadas - NUNCA cerrar el sistema
    process.on('uncaughtException', (error) => {
      logger.errorWithStack('Uncaught Exception - CONTINUANDO EJECUCIÓN', error);
      
      // Para errores de base de datos, simplemente logear y continuar
      if (error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' || 
          error.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY' ||
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.code === 'POOL_CLOSED') {
        logger.warn('Error de protocolo MySQL detectado - CONTINUANDO SIN CERRAR');
        // Intentar recrear la conexión en el siguiente ciclo
        this.scheduleConnectionRecovery();
        return; // NO cerrar el sistema
      }
      
      // Para CUALQUIER otro error, también continuar
      logger.warn('Error no fatal detectado - CONTINUANDO EJECUCIÓN');
      this.handleError(error, 'uncaughtException');
      // NO llamar gracefulShutdown() - mantener el sistema funcionando
    });
    
    // Manejo de señales del sistema - Solo permitir cierre manual
    process.on('SIGTERM', () => {
      logger.shutdownLog('SIGTERM received - IGNORANDO, sistema debe continuar');
      // NO cerrar el sistema automáticamente
    });
    
    process.on('SIGINT', () => {
      logger.shutdownLog('SIGINT received - permitiendo cierre manual...');
      this.gracefulShutdown();
    });
  }

  async gracefulShutdown() {
    return this.gracefulShutdownInternal(true);
  }

  async gracefulShutdownWithoutNotification() {
    return this.gracefulShutdownInternal(false);
  }

  async gracefulShutdownInternal(sendNotification = true) {
    // Evitar múltiples llamadas simultáneas
    if (this.isShuttingDown) {
      logger.shutdownLog('Cierre graceful ya en progreso...');
      return;
    }
    
    this.isShuttingDown = true;
    
    // Marcar que es un cierre forzado
    process.env.FORCE_SHUTDOWN = 'true';
    
    // Timeout global para evitar que el shutdown se cuelgue
    const forceShutdownTimer = setTimeout(() => {
      logger.shutdownLog('Timeout de cierre graceful alcanzado - forzando cierre');
      process.exit(1);
    }, config.errorHandling.gracefulShutdown.timeout);

    try {
      logger.shutdownLog('Iniciando cierre graceful del sistema...');
      
      // Marcar que el sistema está cerrándose para evitar nuevas operaciones
      process.env.SHUTTING_DOWN = 'true';
      
      // Dar tiempo a las operaciones en curso para terminar
      logger.shutdownLog('Esperando a que terminen las operaciones en curso...');
      await new Promise(resolve => setTimeout(resolve, config.errorHandling.gracefulShutdown.operationTimeout));
      
      // Intentar enviar notificación de cierre ANTES de cerrar la base de datos (solo si se solicita)
      if (sendNotification) {
        try {
          const notificationPromise = this.notificationService.sendErrorNotification(
            new Error('Sistema cerrándose - graceful shutdown'),
            'graceful shutdown'
          );
          
          // Timeout para la notificación
          await Promise.race([
            notificationPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout notificación')), 3000)
            )
          ]);
          
          logger.shutdownLog('Notificación de cierre enviada');
        } catch (notificationError) {
          logger.shutdownLog('No se pudo enviar notificación de cierre', { error: notificationError.message });
        }
      } else {
        logger.shutdownLog('Omitiendo notificación de cierre por error de base de datos');
      }
      
      // Cerrar conexiones de base de datos al final
      try {
        const db = require('../database/connection');
        await db.close();
        logger.shutdownLog('Conexiones de base de datos cerradas');
      } catch (dbError) {
        logger.shutdownLog('Error cerrando base de datos', { error: dbError.message });
      }
      
      // Limpiar el timeout ya que terminamos exitosamente
      clearTimeout(forceShutdownTimer);
      
      logger.shutdownLog('Sistema cerrado correctamente');
      process.exit(0);
    } catch (error) {
      logger.errorWithStack('Error durante cierre graceful', error);
      // Limpiar el timeout antes de salir
      clearTimeout(forceShutdownTimer);
      // Forzar cierre en caso de error
      process.exit(1);
    }
  }

  // Retry con backoff exponencial
  async retryWithBackoff(fn, maxRetries = config.errorHandling.retrySettings.maxRetries, baseDelay = config.errorHandling.retrySettings.baseDelay) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), config.errorHandling.retrySettings.maxDelay);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, { error: error.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Programar recuperación de conexión
  scheduleConnectionRecovery() {
    if (this.connectionRecoveryTimer) {
      return; // Ya hay una recuperación programada
    }
    
    logger.info('Programando recuperación de conexión de base de datos en 10 segundos...');
    
    this.connectionRecoveryTimer = setTimeout(async () => {
      try {
        logger.info('Iniciando recuperación de conexión de base de datos...');
        
        // Intentar recrear la conexión
        const db = require('../database/connection');
        if (db.pool) {
          try {
            // Probar la conexión existente
            await db.query('SELECT 1');
            logger.info('Conexión de base de datos restablecida exitosamente');
          } catch (testError) {
            logger.warn('Conexión existente no funciona, recreando...', testError.message);
            db.reconnect();
          }
        } else {
          logger.info('Pool no existe, creando nueva conexión...');
          db.connect();
        }
        
        // Limpiar el timer
        this.connectionRecoveryTimer = null;
        
      } catch (recoveryError) {
        logger.errorWithStack('Error durante recuperación de conexión', recoveryError);
        
        // Limpiar el timer y programar un nuevo intento
        this.connectionRecoveryTimer = null;
        
        // Reintentar en 30 segundos
        setTimeout(() => {
          this.scheduleConnectionRecovery();
        }, 30000);
      }
    }, 10000); // 10 segundos
  }

  // Método para forzar cierre SOLO cuando sea absolutamente necesario
  forceShutdown(reason = 'Manual shutdown') {
    logger.warn(`Cierre forzado solicitado: ${reason}`);
    this.gracefulShutdown();
  }

  // Crear error personalizado
  createCustomError(message, code, context = {}) {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    error.timestamp = DateUtils.toVenezuelaString();
    
    return error;
  }
}

module.exports = new ErrorHandler(); 