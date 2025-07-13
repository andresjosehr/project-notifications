require('dotenv').config();

class Config {
  constructor() {
    // Configuración simplificada para scraper
  }

  get scraping() {
    return {
      headless: process.env.SCRAPING_HEADLESS !== 'false',
      timeout: parseInt(process.env.SCRAPING_TIMEOUT) || 30000,
      userAgent: process.env.SCRAPING_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
  }

  get app() {
    return {
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new Config(); 