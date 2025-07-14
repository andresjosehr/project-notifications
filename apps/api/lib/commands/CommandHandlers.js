const WorkanaService = require('../services/WorkanaService');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/logger');
const fs = require('fs');

/**
 * Command handlers for CLI operations
 * Contains all business logic for commands
 */
class CommandHandlers {

  /**
   * Handle scrape-workana command
   * @param {Object} options - Command options
   * @returns {Promise<void>}
   */
  static async handleScrapeWorkana(options) {
    const startTime = Date.now();
    
    try {
      const scraper = new WorkanaService();
      const projects = await scraper.scrapeProjectsList();
      
      const duration = Date.now() - startTime;
      const response = ResponseHandler.scrapeSuccess('workana', projects, duration);
      
      ResponseHandler.exit(response);
      
    } catch (error) {
      logger.errorWithStack('Error en scraping de Workana', error);
      
      const errorResponse = ResponseHandler.error({
        platform: 'workana',
        operation: 'scrape',
        error,
        data: {
          stats: {
            total: 0,
            processed: 0,
            errors: 1
          },
          projects: []
        }
      });
      
      // Quiet mode handling - error details in structured response
      
      ResponseHandler.exit(errorResponse);
    }
  }

  /**
   * Handle sendProposal command
   * @param {string} session - Session data (JSON string or file path)
   * @param {string} proposalText - Proposal text
   * @param {string} projectLink - Project link
   * @returns {Promise<void>}
   */
  static async handleSendProposal(session, proposalText, projectLink) {
    const startTime = Date.now();
    
    try {
      // Parse session data
      const sessionData = CommandHandlers._parseSessionData(session);

      // Create WorkanaService instance
      const workanaService = new WorkanaService({
        headless: true,
        debug: false
      });

      // Send proposal
      const result = await workanaService.sendProposal(sessionData, proposalText, projectLink);

      const duration = Date.now() - startTime;

      // Create response based on result
      const response = result.success 
        ? ResponseHandler.proposalSuccess('workana', projectLink, duration)
        : ResponseHandler.error({
            platform: 'workana',
            operation: 'send_proposal',
            error: result.error || 'Unknown error',
            data: { projectLink }
          });

      // Close browser
      await workanaService.close();

      ResponseHandler.exit(response);

    } catch (error) {
      logger.errorWithStack('Error enviando propuesta', error);

      const errorResponse = ResponseHandler.error({
        platform: 'workana',
        operation: 'send_proposal',
        error
      });

      ResponseHandler.exit(errorResponse);
    }
  }

  /**
   * Handle login command
   * @param {string} username - Username/email
   * @param {string} password - Password
   * @param {Object} options - Command options
   * @returns {Promise<void>}
   */
  static async handleLogin(username, password, options) {
    const startTime = Date.now();
    
    try {
      // Validate required parameters
      if (!username || !password) {
        throw new Error('Se requieren username y password');
      }

      // Create WorkanaService instance
      const workanaService = new WorkanaService({
        headless: false, // options.headless === 'true' || options.headless === true,
        debug: options.debug
      });

      // Set credentials in environment temporarily
      process.env.WORKANA_USERNAME = username;
      process.env.WORKANA_PASSWORD = password;

      // Perform login
      const loginResult = await workanaService.login(username, password);
      
      if (!loginResult.success) {
        // Parse specific error types from the error message
        const { errorType, errorMessage } = CommandHandlers._parseLoginError(loginResult.error);
        const enhancedError = new Error(`Error en login: ${errorMessage}`);
        enhancedError.type = errorType;
        enhancedError.originalError = loginResult.error;
        throw enhancedError;
      }

      // Get session data
      const sessionResult = await workanaService.saveSession(1); // userId = 1 for CLI
      
      if (!sessionResult.success) {
        throw new Error(`Error guardando sesión: ${sessionResult.error}`);
      }

      const duration = Date.now() - startTime;

      // Create successful response
      const response = ResponseHandler.loginSuccess('workana', sessionResult.sessionData, duration);

      // Close browser
      await workanaService.close();

      ResponseHandler.exit(response);

    } catch (error) {
      logger.errorWithStack('Error en login de Workana', error);

      // Create enhanced error response with specific error information
      const errorResponse = CommandHandlers._createLoginErrorResponse(error);

      // Debug messages removed to prevent JSON parsing issues
      // Error details are included in the structured response

      ResponseHandler.exit(errorResponse);
    }
  }

  /**
   * Parse session data from JSON string or file path
   * @param {string} session - Session data
   * @returns {Object} Parsed session data
   * @private
   */
  static _parseSessionData(session) {
    try {
      // Check if it's a session file in storage
      if (session.includes('storage/app/sessions/') || session.includes('session_')) {
        if (fs.existsSync(session)) {
          const fileContent = fs.readFileSync(session, 'utf8');
          return JSON.parse(fileContent);
        } else {
          throw new Error(`Archivo de sesión no encontrado: ${session}`);
        }
      } else {
        // Try to parse as direct JSON
        return JSON.parse(session);
      }
    } catch (parseError) {
      throw new Error(`Error parseando session: ${parseError.message}`);
    }
  }

  /**
   * Parse login error to extract specific error type and user-friendly message
   * @param {string} errorMessage - Raw error message from login
   * @returns {Object} Object with errorType and errorMessage
   * @private
   */
  static _parseLoginError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') {
      return {
        errorType: 'UNKNOWN_ERROR',
        errorMessage: 'Error desconocido durante el inicio de sesión'
      };
    }

    // Extract error type and message from format: "ERROR_TYPE|Message"
    if (errorMessage.includes('|')) {
      const [errorType, ...messageParts] = errorMessage.split('|');
      return {
        errorType: errorType.trim(),
        errorMessage: messageParts.join('|').trim()
      };
    }

    // Legacy error format - try to categorize
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('credenciales') || lowerMessage.includes('contraseña') || lowerMessage.includes('email')) {
      return {
        errorType: 'INVALID_CREDENTIALS',
        errorMessage: 'Correo o contraseña incorrectos'
      };
    }
    
    if (lowerMessage.includes('captcha')) {
      return {
        errorType: 'CAPTCHA_REQUIRED',
        errorMessage: 'Se requiere completar CAPTCHA. Demasiados intentos fallidos'
      };
    }
    
    if (lowerMessage.includes('bloqueada') || lowerMessage.includes('suspended')) {
      return {
        errorType: 'ACCOUNT_BLOCKED',
        errorMessage: 'Cuenta bloqueada temporalmente por seguridad'
      };
    }
    
    if (lowerMessage.includes('verificar') || lowerMessage.includes('verify')) {
      return {
        errorType: 'EMAIL_NOT_VERIFIED',
        errorMessage: 'Cuenta no verificada. Revisa tu correo electrónico'
      };
    }
    
    return {
      errorType: 'UNKNOWN_ERROR',
      errorMessage: 'Error desconocido durante el inicio de sesión'
    };
  }

  /**
   * Create enhanced error response for login failures
   * @param {Error} error - The login error
   * @returns {Object} Enhanced error response
   * @private
   */
  static _createLoginErrorResponse(error) {
    const { errorType, errorMessage } = CommandHandlers._parseLoginError(error.message);
    
    // Create error object for ResponseHandler
    const enhancedError = new Error(`Error en login: ${errorMessage}`);
    enhancedError.type = errorType;
    enhancedError.category = CommandHandlers._getErrorCategory(errorType);
    enhancedError.userMessage = errorMessage;
    enhancedError.originalError = error.originalError || error.message;

    const baseError = {
      platform: 'workana',
      operation: 'login',
      error: enhancedError,
      data: {
        loginAttemptFailed: true,
        errorType: errorType,
        category: CommandHandlers._getErrorCategory(errorType),
        userMessage: errorMessage,
        canRetry: CommandHandlers._canRetryLogin(errorType),
        suggestions: CommandHandlers._getLoginSuggestions(errorType)
      }
    };

    return ResponseHandler.error(baseError);
  }

  /**
   * Get error category for grouping similar errors
   * @param {string} errorType - The specific error type
   * @returns {string} Error category
   * @private
   */
  static _getErrorCategory(errorType) {
    const categories = {
      'INVALID_CREDENTIALS': 'authentication',
      'CAPTCHA_REQUIRED': 'security',
      'ACCOUNT_BLOCKED': 'security',
      'EMAIL_NOT_VERIFIED': 'verification',
      'RATE_LIMITED': 'security',
      'SERVER_ERROR': 'server',
      'NETWORK_ERROR': 'network',
      'UNKNOWN_ERROR': 'unknown'
    };
    
    return categories[errorType] || 'unknown';
  }

  /**
   * Determine if login can be retried for this error type
   * @param {string} errorType - The specific error type
   * @returns {boolean} Whether retry is possible
   * @private
   */
  static _canRetryLogin(errorType) {
    const retryableErrors = ['SERVER_ERROR', 'NETWORK_ERROR', 'UNKNOWN_ERROR'];
    return retryableErrors.includes(errorType);
  }

  /**
   * Get user-friendly suggestions based on error type
   * @param {string} errorType - The specific error type
   * @returns {Array} Array of suggestion strings
   * @private
   */
  static _getLoginSuggestions(errorType) {
    const suggestions = {
      'INVALID_CREDENTIALS': [
        'Verifica que el correo electrónico esté escrito correctamente',
        'Asegúrate de que la contraseña sea correcta',
        'Si olvidaste tu contraseña, puedes restablecerla en Workana'
      ],
      'CAPTCHA_REQUIRED': [
        'Espera unos minutos antes de intentar nuevamente',
        'Inicia sesión manualmente en el navegador para completar el CAPTCHA',
        'Reduce la frecuencia de intentos de login'
      ],
      'ACCOUNT_BLOCKED': [
        'Contacta al soporte de Workana para desbloquear tu cuenta',
        'Espera el tiempo indicado antes de intentar nuevamente',
        'Revisa si hay notificaciones de seguridad en tu correo'
      ],
      'EMAIL_NOT_VERIFIED': [
        'Revisa tu bandeja de entrada y carpeta de spam',
        'Solicita un nuevo email de verificación en Workana',
        'Contacta al soporte si no recibes el email de verificación'
      ],
      'RATE_LIMITED': [
        'Espera al menos 5-10 minutos antes de intentar nuevamente',
        'Reduce la frecuencia de intentos de login',
        'Considera usar un proxy o VPN diferente si el problema persiste'
      ],
      'SERVER_ERROR': [
        'Intenta nuevamente en unos minutos',
        'Verifica tu conexión a internet',
        'Contacta al soporte si el problema persiste'
      ]
    };
    
    return suggestions[errorType] || [
      'Intenta nuevamente en unos minutos',
      'Verifica tu conexión a internet',
      'Si el problema persiste, contacta al soporte'
    ];
  }
}

module.exports = CommandHandlers;