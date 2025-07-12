const express = require('express');
const cors = require('cors');
const ScraperFactory = require('./lib/scrapers/ScraperFactory');
const WorkanaService = require('./lib/services/WorkanaService');
const logger = require('./lib/utils/logger');
const config = require('./lib/config');

const app = express();
const port = process.env.SCRAPER_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Node.js Scraper API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Scraping endpoints
app.post('/scrape', async (req, res) => {
  try {
    logger.info('Iniciando scraping de todas las plataformas');
    
    const options = req.body;
    const results = await ScraperFactory.executeParallel();
    
    logger.info('Scraping completado', { results });
    
    res.json({
      success: true,
      message: 'Scraping completado',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.errorWithStack('Error en scraping general', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/scrape/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const options = req.body;
    
    logger.info(`Iniciando scraping de ${platform}`);
    
    const scraper = ScraperFactory.create(platform);
    const results = await scraper.execute();
    
    logger.info(`Scraping de ${platform} completado`, { count: results.length });
    
    res.json({
      success: true,
      message: `Scraping de ${platform} completado`,
      data: { [platform]: results },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.errorWithStack(`Error en scraping de ${req.params.platform}`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Workana service endpoints
app.post('/workana/login', async (req, res) => {
  try {
    const { email, password, user_id } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password son requeridos'
      });
    }
    
    logger.info('Iniciando login en Workana', { email });
    
    const workanaService = new WorkanaService();
    const result = await workanaService.login(email, password, user_id);
    
    logger.info('Login en Workana completado');
    
    res.json({
      success: true,
      message: 'Login completado exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.errorWithStack('Error en login de Workana', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/workana/proposal', async (req, res) => {
  try {
    const { project_id, proposal_content, user_id, email, password } = req.body;
    
    if (!project_id || !proposal_content) {
      return res.status(400).json({
        success: false,
        error: 'project_id y proposal_content son requeridos'
      });
    }
    
    logger.info('Enviando propuesta a Workana', { project_id });
    
    const workanaService = new WorkanaService();
    const result = await workanaService.sendProposal({
      projectId: project_id,
      proposalContent: proposal_content,
      userId: user_id,
      email,
      password
    });
    
    logger.info('Propuesta enviada exitosamente', { project_id });
    
    res.json({
      success: true,
      message: 'Propuesta enviada exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.errorWithStack('Error enviando propuesta a Workana', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    // Basic stats about the scraper service
    const stats = {
      service: 'Node.js Scraper API',
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      supported_platforms: ['workana', 'upwork'],
      endpoints: {
        health: 'GET /health',
        scrape_all: 'POST /scrape',
        scrape_platform: 'POST /scrape/:platform',
        workana_login: 'POST /workana/login',
        workana_proposal: 'POST /workana/proposal',
        stats: 'GET /stats'
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.errorWithStack('Error obteniendo estadísticas', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  logger.errorWithStack('Error no manejado en API de scraping', error);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  logger.info(`🚀 API de Scraping Node.js ejecutándose en puerto ${port}`);
  logger.info('Endpoints disponibles:');
  logger.info('  - GET /health - Health check');
  logger.info('  - POST /scrape - Scraping de todas las plataformas');
  logger.info('  - POST /scrape/:platform - Scraping de plataforma específica');
  logger.info('  - POST /workana/login - Login en Workana');
  logger.info('  - POST /workana/proposal - Enviar propuesta a Workana');
  logger.info('  - GET /stats - Estadísticas del servicio');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

module.exports = app;