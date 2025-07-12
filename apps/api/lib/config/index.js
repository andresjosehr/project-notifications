require('dotenv').config();

class Config {
  constructor() {
    this.validateEnvironmentVariables();
  }

  validateEnvironmentVariables() {
    const requiredVars = [
      'DB_HOST',
      'DB_USER', 
      'DB_PASSWORD',
      'DB_DATABASE',
      'GROP_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
    }
  }

  get database() {
    return {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      timeout: parseInt(process.env.DB_TIMEOUT) || 60000
    };
  }

  get ai() {
    return {
      apiKey: process.env.GROP_API_KEY,
      model: process.env.AI_MODEL || 'llama3-70b-8192',
      apiUrl: process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
    };
  }

  get telegram() {
    return {
      apiUrl: process.env.TELEGRAM_API_URL || 'http://api.callmebot.com/text.php',
    };
  }

  get scraping() {
    return {
      headless: process.env.SCRAPING_HEADLESS !== 'false',
      timeout: parseInt(process.env.SCRAPING_TIMEOUT) || 30000,
      waitBetweenRequests: {
        min: parseInt(process.env.SCRAPING_WAIT_MIN) || 60,
        max: parseInt(process.env.SCRAPING_WAIT_MAX) || 90
      },
      userAgent: process.env.SCRAPING_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }

  get app() {
    return {
      environment: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT) || 3000,
      apiUrl: process.env.API_URL || 'https://workana-notifications.andresjosehr.com'
    };
  }

  get jwt() {
    return {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  get errorHandling() {
    return {
      gracefulShutdown: {
        // Tiempo de espera antes de cerrar forzosamente (ms)
        timeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 10000,
        // Tiempo de espera para operaciones en curso (ms)
        operationTimeout: parseInt(process.env.OPERATION_TIMEOUT) || 2000,
        // Tiempo de espera para consultas de base de datos (ms)
        databaseTimeout: parseInt(process.env.DATABASE_SHUTDOWN_TIMEOUT) || 1000
      },
      retrySettings: {
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        baseDelay: parseInt(process.env.RETRY_BASE_DELAY) || 1000,
        maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 30000
      }
    };
  }
}

module.exports = new Config(); 