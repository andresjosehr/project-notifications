const config = require('../config');
const fs = require('fs');
const path = require('path');
const DateUtils = require('./dateUtils');

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = this.levels[process.env.LOG_LEVEL] || this.levels.INFO;
    
    // Configurar archivo de log
    this.logFile = path.join(process.cwd(), 'logs/debug.log');
    this.ensureLogFile();
  }

  ensureLogFile() {
    try {
      if (!fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '', 'utf8');
      }
    } catch (error) {
      console.error('Error creando archivo de log:', error.message);
    }
  }

  _writeToFile(formattedMessage) {
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n', 'utf8');
    } catch (error) {
      console.error('Error escribiendo al archivo de log:', error.message);
    }
  }

  _log(level, message, data = null) {
    if (this.levels[level] > this.currentLevel) {
      return;
    }

    const timestamp = DateUtils.toVenezuelaString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
      environment: config.app.environment
    };

    const formattedMessage = this._formatMessage(logEntry);
    
    // Escribir a archivo
    this._writeToFile(formattedMessage);
  
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

  // Método para verificar si el sistema está cerrándose
  isSystemShuttingDown() {
    return process.env.SHUTTING_DOWN === 'true';
  }

  // Método para logging durante el shutdown
  shutdownLog(message, data = null) {
    if (this.isSystemShuttingDown()) {
      this.warn(`[SHUTDOWN] ${message}`, data);
    } else {
      this.info(`[SHUTDOWN] ${message}`, data);
    }
  }
}

module.exports = new Logger(); 