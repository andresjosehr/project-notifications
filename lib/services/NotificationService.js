const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const UserRepository = require('../database/repositories/UserRepository');
const DateUtils = require('../utils/dateUtils');

class NotificationService {
  constructor() {
    this.apiUrl = config.telegram.apiUrl;
    this.defaultUser = config.telegram.defaultUser;
    this.defaultTimeout = 10000;
  }

  encodeForUrl(text) {
    // Proper URL encoding using encodeURIComponent
    // Preserve line breaks for Telegram formatting
    return encodeURIComponent(text);
  }

  async isUserActive(telegramUser) {
    try {
      if (!telegramUser) {
        return false;
      }
      
      const users = await UserRepository.findActive();
      const activeUser = users.find(user => user.telegramUser === telegramUser);
      
      return !!activeUser;
    } catch (error) {
      logger.errorWithStack('Error verificando estado de usuario', error);
      return false;
    }
  }

  async sendTelegram(message, user = null, options = {}) {
    try {
      const targetUser = user || this.defaultUser;
      
      // Verificar si el usuario está activo
      const isActive = await this.isUserActive(targetUser);
      if (!isActive) {
        logger.warn('Usuario inactivo, no se enviará notificación', { user: targetUser });
        return { success: false, error: 'Usuario inactivo' };
      }
      const encodedMessage = this.encodeForUrl(message);
      const encodedUser = encodeURIComponent(targetUser);
      const url = `${this.apiUrl}?user=${encodedUser}&text=${encodedMessage}`;

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
      
      let message = `🚀 *${platform}*\n\n`;
      
      // Agregar información específica según la plataforma
      if (project.platform === 'workana') {
        message += `💰 *Precio:* ${project.price}\n\n`;
      } else if (project.platform === 'upwork') {
        message += `ℹ️ *Info:* ${project.info}\n\n`;
      }
      
      message += `📋 *Título:*\n${project.title}\n\n`;
      message += `📝 *Descripción:*\n${project.description}\n\n`;
      message += `🔗 *Enlace del proyecto:*\n${project.link}\n\n`;
      
      // Agregar enlaces de propuesta con userId específico
      if (project.id) {
        let proposalUrl = `${config.app.apiUrl}/build-bid/${project.id}/${project.platform}`;
        // Only add port if it's not standard HTTP/HTTPS ports (80/443) and not null/empty
        if (config.app.port && config.app.port !== 80 && config.app.port !== 443) {
          proposalUrl = `${config.app.apiUrl}:${config.app.port}/build-bid/${project.id}/${project.platform}`;
        }
        
        // Si hay un usuario específico, obtener su ID para incluirlo en la URL
        if (user) {
          try {
            const users = await UserRepository.findActive();
            const userData = users.find(u => u.telegramUser === user);
            if (userData) {
              proposalUrl += `?userId=${userData.id}`;
            }
          } catch (error) {
            logger.warn('Error obteniendo ID de usuario para URL de propuesta', error);
          }
        }
        
        message += `📄 *Generar propuesta:*\n${proposalUrl}`;
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


  async sendMultipleNotifications(projects, user = null, options = {}) {
    const results = [];
    
    // Si no se especifica usuario, obtener todos los usuarios activos
    let targetUsers = [];
    if (user) {
      targetUsers = [user];
    } else {
      try {
        const activeUsers = await UserRepository.findActive();
        targetUsers = activeUsers.map(u => u.telegramUser);
      } catch (error) {
        logger.errorWithStack('Error obteniendo usuarios activos', error);
        targetUsers = [this.defaultUser];
      }
    }
    
    for (const project of projects) {
      for (const targetUser of targetUsers) {
        try {
          const result = await this.sendProjectNotification(project, targetUser, options);
          
          results.push({ 
            projectId: project.id, 
            platform: project.platform,
            user: targetUser,
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
            user: targetUser,
            success: false,
            error: error.message
          });
        }
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
                     `Timestamp: ${DateUtils.toVenezuelaString()}`;

      const targetUser = user || this.defaultUser;
      const result = await this.sendTelegram(message, targetUser);
      
      logger.telegramLog('Notificación de error enviada', { 
        context,
        user: targetUser,
        success: result.success
      });

      return result;
    } catch (err) {
      logger.errorWithStack('Error enviando notificación de error', err);
      return { success: false, error: err.message };
    }
  }

  // Método comentado: No enviar notificaciones de estado/información
  // async sendStatusNotification(status, details = {}, user = null) {
  //   try {
  //     let detailsText = '';
  //     try {
  //       detailsText = JSON.stringify(details, null, 2);
  //     } catch (jsonError) {
  //       detailsText = 'Error al serializar detalles';
  //     }
      
  //     const message = `📊 ESTADO DEL SISTEMA 📊\n\n` +
  //                    `Status: ${status}\n\n` +
  //                    `Detalles: ${detailsText}\n\n` +
  //                    `Timestamp: ${new Date().toISOString()}`;

  //     const result = await this.sendTelegram(message, user);
      
  //     logger.telegramLog('Notificación de estado enviada', { 
  //       status,
  //       success: result.success
  //     });

  //     return result;
  //   } catch (error) {
  //     logger.errorWithStack('Error enviando notificación de estado', error);
  //     return { success: false, error: error.message };
  //   }
  // }

  // Método para verificar el estado del servicio (sin enviar notificación)
  async healthCheck() {
    try {
      // Solo verificar que el servicio esté configurado correctamente
      // Sin enviar notificación de test
      const isConfigured = !!(this.apiUrl && this.defaultUser);
      
      logger.telegramLog('Health check completado', { 
        success: isConfigured,
        configured: isConfigured
      });

      return { healthy: isConfigured, configured: isConfigured };
    } catch (error) {
      logger.errorWithStack('Error en health check de notificaciones', error);
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new NotificationService(); 