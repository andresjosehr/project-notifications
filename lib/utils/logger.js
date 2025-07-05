const config = require('../config');

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = this.levels[process.env.LOG_LEVEL] || this.levels.INFO;
  }

  _log(level, message, data = null) {
    if (this.levels[level] > this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
      environment: config.app.environment
    };

    const formattedMessage = this._formatMessage(logEntry);
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage);
        break;
      case 'WARN':
        console.warn(formattedMessage);
        break;
      case 'DEBUG':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  _formatMessage(logEntry) {
    const { timestamp, level, message, data } = logEntry;
    let formatted = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      formatted += ` | ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  error(message, data = null) {
    this._log('ERROR', message, data);
  }

  warn(message, data = null) {
    this._log('WARN', message, data);
  }

  info(message, data = null) {
    this._log('INFO', message, data);
  }

  debug(message, data = null) {
    this._log('DEBUG', message, data);
  }

  // Métodos específicos para diferentes contextos
  scraperLog(platform, action, data = null) {
    this.info(`[${platform.toUpperCase()}] ${action}`, data);
  }

  aiLog(action, data = null) {
    this.info(`[AI] ${action}`, data);
  }

  telegramLog(action, data = null) {
    this.info(`[TELEGRAM] ${action}`, data);
  }

  dbLog(action, data = null) {
    this.info(`[DATABASE] ${action}`, data);
  }

  // Método para logging de errores con stack trace
  errorWithStack(message, error) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code })
    };
    
    this.error(message, errorData);
  }
}

module.exports = new Logger(); 