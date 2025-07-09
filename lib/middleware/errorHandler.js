const logger = require('../utils/logger');
const NotificationService = require('../services/NotificationService');
const DateUtils = require('../utils/dateUtils');

class ErrorHandler {
  constructor() {
    this.notificationService = NotificationService;
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

  // Manejo centralizado de errores
  handleError(error, context = 'Unknown') {
    // Clasificar tipo de error
    const errorType = this.classifyError(error);
    
    // Log del error
    logger.errorWithStack(`Error en ${context}`, error);
    
    // Determinar severidad
    const severity = this.determineErrorSeverity(error);
    
    // Registrar métricas del error
    this.recordErrorMetrics(error, context, severity);
    
    // Enviar notificación si es crítico
    if (severity === 'critical') {
      this.sendCriticalErrorNotification(error, context);
    }
    
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
    // Manejo de promesas rechazadas no capturadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.errorWithStack('Unhandled Rejection', reason);
      this.handleError(reason, 'unhandledRejection');
    });
    
    // Manejo de excepciones no capturadas
    process.on('uncaughtException', (error) => {
      logger.errorWithStack('Uncaught Exception', error);
      this.handleError(error, 'uncaughtException');
      
      // Intentar cerrar gracefully
      this.gracefulShutdown();
    });
    
    // Manejo de señales del sistema
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      this.gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      this.gracefulShutdown();
    });
  }

  async gracefulShutdown() {
    try {
      logger.info('Iniciando cierre graceful del sistema...');
      
      // Cerrar conexiones de base de datos
      const db = require('../database/connection');
      await db.close();
      
      // Enviar notificación de cierre de sistema crítico
      await this.notificationService.sendErrorNotification(
        new Error('Sistema cerrándose - graceful shutdown'),
        'graceful shutdown'
      );
      
      logger.info('Sistema cerrado correctamente');
      process.exit(0);
    } catch (error) {
      logger.errorWithStack('Error durante cierre graceful', error);
      process.exit(1);
    }
  }

  // Retry con backoff exponencial
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, { error: error.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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