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
      
      if (!options.quiet) {
        console.error(`❌ Error: ${error.message}`);
      }
      
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
        headless: false,
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
        throw new Error(`Error en login: ${loginResult.error}`);
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

      const errorResponse = ResponseHandler.error({
        platform: 'workana',
        operation: 'login',
        error
      });

      if (options.debug) {
        console.error(`❌ Error: ${error.message}`);
      }

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
}

module.exports = CommandHandlers;