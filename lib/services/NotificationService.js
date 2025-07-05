const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.apiUrl = config.telegram.apiUrl;
    this.defaultUser = config.telegram.defaultUser;
    this.defaultTimeout = 10000;
  }

  encodeForUrl(text) {
    return text.replace(/\r\n|\n/g, '%0A');
  }

  async sendTelegram(message, user = null, options = {}) {
    try {
      const targetUser = user || this.defaultUser;
      const encodedMessage = this.encodeForUrl(message);
      const url = `${this.apiUrl}?user=${targetUser}&text=${encodedMessage}`;

      logger.telegramLog('Enviando notificación', { 
        user: targetUser,
        messageLength: message.length,
        url: url.substring(0, 100) + '...' 
      });

      const response = await axios.get(url, {
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          "accept": "application/json, text/plain, */*",
          "sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Microsoft Edge\";v=\"104\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "x-requested-with": "XMLHttpRequest"
        }
      });

      if (response.status !== 200) {
        throw new Error(`Telegram API respondió con status ${response.status}: ${response.data}`);
      }

      logger.telegramLog('Notificación enviada exitosamente', { 
        user: targetUser,
        status: response.status,
        responseData: response.data
      });

      return { success: true, response: response.data };
    } catch (error) {
      logger.errorWithStack('Error enviando notificación de Telegram', error);
      return { success: false, error: error.message };
    }
  }

  async sendProjectNotification(project, user = null, options = {}) {
    try {
      const platform = project.platform.toUpperCase();
      
      let message = `${platform}\n\n`;
      
      // Agregar información específica según la plataforma
      if (project.platform === 'workana') {
        message += `${project.price}\n`;
      } else if (project.platform === 'upwork') {
        message += `${project.info}\n`;
      }
      
      message += `${project.title}\n\n`;
      message += `${project.description}\n\n`;
      message += `${project.link}\n\n`;
      
      // Agregar enlaces de propuesta
      if (project.id) {
        message += `Propuesta: ${config.app.apiUrl}/build-bid/${project.id}/${project.platform}`;
      }

      const result = await this.sendTelegram(message, user, options);
      
      logger.telegramLog('Notificación de proyecto enviada', { 
        projectId: project.id,
        platform: project.platform,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.errorWithStack('Error enviando notificación de proyecto', error);
      return { success: false, error: error.message };
    }
  }

  async sendTranslatedProjectNotification(project, user = null, options = {}) {
    try {
      const AIService = require('./AIService');
      
      const platform = project.platform.toUpperCase();
      
      let originalMessage = `${platform}\n\n`;
      
      // Agregar información específica según la plataforma
      if (project.platform === 'workana') {
        originalMessage += `${project.price}\n`;
      } else if (project.platform === 'upwork') {
        originalMessage += `${project.info}\n`;
      }
      
      originalMessage += `${project.title}\n\n`;
      originalMessage += `${project.description}`;

      // Traducir el mensaje si es necesario
      let translatedMessage = originalMessage;
      if (options.translate !== false) {
        try {
          translatedMessage = await AIService.translateToSpanish(originalMessage);
        } catch (error) {
          logger.warn('Error en traducción, usando mensaje original', error);
          translatedMessage = originalMessage;
        }
      }

      // Agregar enlaces
      translatedMessage += `\n\n${project.link}\n\n`;
      
      if (project.id) {
        translatedMessage += `Propuesta: ${config.app.apiUrl}/build-bid/${project.id}/${project.platform}`;
      }

      const result = await this.sendTelegram(translatedMessage, user, options);
      
      logger.telegramLog('Notificación de proyecto traducida enviada', { 
        projectId: project.id,
        platform: project.platform,
        success: result.success,
        wasTranslated: options.translate !== false
      });

      return result;
    } catch (error) {
      logger.errorWithStack('Error enviando notificación de proyecto traducida', error);
      return { success: false, error: error.message };
    }
  }

  async sendMultipleNotifications(projects, user = null, options = {}) {
    const results = [];
    
    for (const project of projects) {
      try {
        const result = options.translate 
          ? await this.sendTranslatedProjectNotification(project, user, options)
          : await this.sendProjectNotification(project, user, options);
        
        results.push({ 
          projectId: project.id, 
          platform: project.platform,
          success: result.success,
          error: result.error
        });

        // Delay entre notificaciones para evitar spam
        if (options.delay && options.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      } catch (error) {
        logger.errorWithStack(`Error enviando notificación múltiple para proyecto ${project.id}`, error);
        results.push({ 
          projectId: project.id, 
          platform: project.platform,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.telegramLog(`Notificaciones múltiples completadas`, { 
      total: results.length,
      successful: successCount,
      failed: results.length - successCount
    });

    return results;
  }

  async sendErrorNotification(error, context = '', user = null) {
    try {
      const message = `🚨 ERROR EN SISTEMA DE NOTIFICACIONES 🚨\n\n` +
                     `Contexto: ${context}\n\n` +
                     `Error: ${error.message}\n\n` +
                     `Timestamp: ${new Date().toISOString()}`;

      const result = await this.sendTelegram(message, user);
      
      logger.telegramLog('Notificación de error enviada', { 
        context,
        success: result.success
      });

      return result;
    } catch (err) {
      logger.errorWithStack('Error enviando notificación de error', err);
      return { success: false, error: err.message };
    }
  }

  async sendStatusNotification(status, details = {}, user = null) {
    try {
      const message = `📊 ESTADO DEL SISTEMA 📊\n\n` +
                     `Status: ${status}\n\n` +
                     `Detalles: ${JSON.stringify(details, null, 2)}\n\n` +
                     `Timestamp: ${new Date().toISOString()}`;

      const result = await this.sendTelegram(message, user);
      
      logger.telegramLog('Notificación de estado enviada', { 
        status,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.errorWithStack('Error enviando notificación de estado', error);
      return { success: false, error: error.message };
    }
  }

  // Método para verificar el estado del servicio
  async healthCheck(user = null) {
    try {
      const testMessage = 'Test de conectividad - Sistema de notificaciones funcionando correctamente';
      const result = await this.sendTelegram(testMessage, user);
      
      logger.telegramLog('Health check completado', { 
        success: result.success
      });

      return { healthy: result.success, response: result };
    } catch (error) {
      logger.errorWithStack('Error en health check de notificaciones', error);
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new NotificationService(); 