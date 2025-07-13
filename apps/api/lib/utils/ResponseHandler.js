/**
 * Standard response handler for CLI commands
 * Provides consistent response format for Laravel commands
 */
class ResponseHandler {
  
  /**
   * Create a success response
   * @param {Object} options - Response options
   * @param {string} options.platform - Platform name (e.g., 'workana')
   * @param {string} options.operation - Operation performed (e.g., 'scrape', 'login', 'send_proposal')
   * @param {Object} options.data - Response data
   * @param {string} options.message - Success message
   * @param {number} options.duration - Operation duration in ms
   * @returns {Object} Standardized success response
   */
  static success({ platform, operation, data = {}, message = 'Operation completed successfully', duration = null }) {
    const response = {
      success: true,
      platform,
      operation,
      timestamp: new Date().toISOString(),
      message,
      data
    };

    if (duration !== null) {
      response.duration = Math.round(duration);
    }

    return response;
  }

  /**
   * Create an error response
   * @param {Object} options - Response options
   * @param {string} options.platform - Platform name (e.g., 'workana')
   * @param {string} options.operation - Operation attempted (e.g., 'scrape', 'login', 'send_proposal')
   * @param {string|Error} options.error - Error message or Error object
   * @param {Object} options.data - Additional error data
   * @returns {Object} Standardized error response
   */
  static error({ platform, operation, error, data = {} }) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorType = error instanceof Error ? error.constructor.name : 'Error';

    return {
      success: false,
      platform,
      operation,
      timestamp: new Date().toISOString(),
      error: {
        message: errorMessage,
        type: errorType
      },
      data
    };
  }

  /**
   * Create a scraping success response
   * @param {string} platform - Platform name
   * @param {Array} projects - Array of scraped projects
   * @param {number} duration - Operation duration in ms
   * @returns {Object} Standardized scraping response
   */
  static scrapeSuccess(platform, projects, duration) {
    return this.success({
      platform,
      operation: 'scrape',
      message: `Scraping completed: ${projects.length} projects found`,
      duration,
      data: {
        stats: {
          total: projects.length,
          processed: projects.length,
          errors: 0
        },
        projects: projects.map(project => project.toJSON ? project.toJSON() : project)
      }
    });
  }

  /**
   * Create a login success response
   * @param {string} platform - Platform name
   * @param {Object} sessionData - Session data
   * @param {number} duration - Operation duration in ms
   * @returns {Object} Standardized login response
   */
  static loginSuccess(platform, sessionData, duration) {
    return this.success({
      platform,
      operation: 'login',
      message: 'Login successful',
      duration,
      data: {
        sessionData
      }
    });
  }

  /**
   * Create a proposal submission success response
   * @param {string} platform - Platform name
   * @param {string} projectLink - Project link where proposal was sent
   * @param {number} duration - Operation duration in ms
   * @returns {Object} Standardized proposal response
   */
  static proposalSuccess(platform, projectLink, duration) {
    return this.success({
      platform,
      operation: 'send_proposal',
      message: 'Proposal sent successfully',
      duration,
      data: {
        projectLink
      }
    });
  }

  /**
   * Output response to console as JSON
   * @param {Object} response - Response object
   */
  static output(response) {
    console.log(JSON.stringify(response, null, 2));
  }

  /**
   * Exit process with appropriate code
   * @param {Object} response - Response object
   */
  static exit(response) {
    this.output(response);
    process.exit(response.success ? 0 : 1);
  }
}

module.exports = ResponseHandler;