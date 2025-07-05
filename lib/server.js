const express = require('express');
const NotificationApp = require('./app');
const WorkanaService = require('./services/WorkanaService');
const UserController = require('./controllers/UserController');
const logger = require('./utils/logger');
const config = require('./config');
const path = require('path');

class ApiServer {
  constructor() {
    this.app = express();
    this.notificationApp = new NotificationApp();
    this.workanaService = new WorkanaService();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
      next();
    });
  }

  setupRoutes() {
    // Redirect root to users page
    this.app.get('/', (req, res) => {
      res.redirect('/users');
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.notificationApp.healthCheck();
        res.json(health);
      } catch (error) {
        logger.errorWithStack('Error en health check endpoint', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Workana scraping endpoint
    this.app.post('/api/workana/scrape', async (req, res) => {
      try {
        const options = {
          notifications: req.body.notifications !== false,
          translate: req.body.translate !== false,
          ...req.body
        };

        await this.notificationApp.initialize();
        const results = await this.notificationApp.runPlatformSpecific('workana', options);
        
        res.json({
          success: true,
          message: 'Scraping de Workana completado',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en scraping de Workana', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Upwork scraping endpoint
    this.app.post('/api/upwork/scrape', async (req, res) => {
      try {
        const options = {
          notifications: req.body.notifications !== false,
          translate: req.body.translate !== false,
          ...req.body
        };

        await this.notificationApp.initialize();
        const results = await this.notificationApp.runPlatformSpecific('upwork', options);
        
        res.json({
          success: true,
          message: 'Scraping de Upwork completado',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en scraping de Upwork', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Workana login endpoint
    this.app.post('/api/workana/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren username y password' 
          });
        }

        const result = await this.workanaService.login(username, password);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Sesión de Workana iniciada correctamente',
            data: {
              user: result.user,
              sessionSaved: true
            }
          });
        } else {
          res.status(401).json({ 
            success: false, 
            error: result.error || 'Error iniciando sesión' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error en login de Workana', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Workana proposal endpoint
    this.app.post('/api/workana/proposal', async (req, res) => {
      try {
        const { projectId, autoLogin = true, username, password } = req.body;
        
        if (!projectId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requiere projectId' 
          });
        }

        // Verificar si hay sesión activa
        const hasActiveSession = await this.workanaService.hasActiveSession();
        
        if (!hasActiveSession && autoLogin) {
          if (!username || !password) {
            return res.status(400).json({ 
              success: false, 
              error: 'Se requieren credenciales para auto-login' 
            });
          }
          
          const loginResult = await this.workanaService.login(username, password);
          
          if (!loginResult.success) {
            return res.status(401).json({ 
              success: false, 
              error: `Error en auto-login: ${loginResult.error}` 
            });
          }
        }

        const result = await this.workanaService.sendProposal(projectId, req.body);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta enviada correctamente',
            data: {
              projectId,
              projectTitle: result.projectTitle
            }
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: result.error || 'Error enviando propuesta' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error enviando propuesta', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Statistics endpoint
    this.app.get('/api/stats', async (req, res) => {
      try {
        const platform = req.query.platform || null;
        
        const stats = await this.notificationApp.getStats(platform);
        
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

    // Recent projects endpoint
    this.app.get('/api/projects/recent', async (req, res) => {
      try {
        const platform = req.query.platform || null;
        const limit = parseInt(req.query.limit) || 10;
        
        const projects = await this.notificationApp.getRecentProjects(platform, limit);
        
        res.json({
          success: true,
          data: projects
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo proyectos recientes', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Search projects endpoint
    this.app.get('/api/projects/search', async (req, res) => {
      try {
        const { query, platform, limit = 10 } = req.query;
        
        if (!query) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requiere parámetro query' 
          });
        }

        const results = await this.notificationApp.searchProjects(query, platform, {
          limit: parseInt(limit)
        });
        
        res.json({
          success: true,
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error buscando proyectos', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Single cycle endpoint
    this.app.post('/api/scrape/single', async (req, res) => {
      try {
        const options = {
          parallel: req.body.parallel !== false,
          notifications: req.body.notifications !== false,
          translate: req.body.translate !== false,
          ...req.body
        };

        await this.notificationApp.initialize();
        const results = await this.notificationApp.runSingleCycle(options);
        
        res.json({
          success: true,
          message: 'Ciclo único completado',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en ciclo único', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Generate proposal endpoint
    this.app.post('/api/proposal/generate', async (req, res) => {
      try {
        const { projectId, platform } = req.body;
        
        if (!projectId || !platform) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId y platform' 
          });
        }

        await this.notificationApp.initialize();
        const result = await this.notificationApp.generateProposal(projectId, platform, req.body);
        
        res.json({
          success: true,
          message: 'Propuesta generada correctamente',
          data: result
        });
      } catch (error) {
        logger.errorWithStack('Error generando propuesta', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // System status endpoint
    this.app.get('/api/status', (req, res) => {
      try {
        const status = this.notificationApp.getStatus();
        res.json({
          success: true,
          data: status
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo estado del sistema', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Cleanup endpoint
    this.app.post('/api/cleanup', async (req, res) => {
      try {
        const results = await this.notificationApp.cleanup(req.body);
        
        res.json({
          success: true,
          message: 'Limpieza completada',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en limpieza', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Build-bid endpoint for URL-based proposal triggering
    this.app.get('/build-bid/:id/:platform', async (req, res) => {
      try {
        const { id: projectId, platform } = req.params;
        const { userId } = req.query;
        
        if (!projectId || !platform) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId y platform' 
          });
        }

        // Only support Workana for now
        if (platform !== 'workana') {
          return res.status(400).json({ 
            success: false, 
            error: 'Solo se soporta la plataforma Workana actualmente' 
          });
        }

        // Determine which user to use for sending the proposal
        let targetUserId = userId;
        
        if (!targetUserId) {
          // If no userId specified, use the first active user
          const UserRepository = require('./database/repositories/UserRepository');
          const activeUsers = await UserRepository.findActive();
          
          if (activeUsers.length === 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'No hay usuarios activos disponibles' 
            });
          }
          
          targetUserId = activeUsers[0].id;
        }

        // Send the proposal using the specified user
        const result = await this.workanaService.sendProposalByUserId(projectId, targetUserId);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta enviada exitosamente',
            data: {
              projectId,
              platform,
              userId: targetUserId,
              projectTitle: result.projectTitle
            }
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: result.error || 'Error enviando propuesta' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error en build-bid endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // === USER MANAGEMENT ROUTES ===
    // Get all users
    this.app.get('/api/users', UserController.getAllUsers.bind(UserController));
    
    // Get active users only
    this.app.get('/api/users/active', UserController.getActiveUsers.bind(UserController));
    
    // Get user statistics
    this.app.get('/api/users/stats', UserController.getUserStats.bind(UserController));
    
    // Get user by ID
    this.app.get('/api/users/:id', UserController.getUserById.bind(UserController));
    
    // Create new user
    this.app.post('/api/users', UserController.createUser.bind(UserController));
    
    // Update user
    this.app.put('/api/users/:id', UserController.updateUser.bind(UserController));
    
    // Toggle user active status
    this.app.patch('/api/users/:id/status', UserController.toggleUserStatus.bind(UserController));
    
    // Delete user
    this.app.delete('/api/users/:id', UserController.deleteUser.bind(UserController));

    // Serve user management UI
    this.app.get('/users', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/users.html'));
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.errorWithStack('Error no manejado en API', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    });

    // === PROJECT MANAGEMENT ROUTES ===
    // Get all projects with pagination
    this.app.get('/api/projects', async (req, res) => {
      try {
        const {
          page = 1,
          limit = 20,
          search,
          platform,
          budget,
          date,
          sort = 'created_at',
          order = 'desc'
        } = req.query;

        const ProjectRepository = require('./database/repositories/ProjectRepository');
        
        const filters = {};
        if (search) filters.search = search;
        if (platform) filters.platform = platform;
        if (budget) filters.budget = budget;
        if (date) filters.date = date;

        const projects = await ProjectRepository.findWithPagination(
          parseInt(page),
          parseInt(limit),
          filters,
          sort,
          order
        );
        
        res.json({
          success: true,
          data: projects
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo proyectos', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get project by ID
    this.app.get('/api/projects/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        const ProjectRepository = require('./database/repositories/ProjectRepository');
        
        const project = await ProjectRepository.findById(parseInt(id));
        
        if (!project) {
          return res.status(404).json({ 
            success: false, 
            error: 'Proyecto no encontrado' 
          });
        }
        
        res.json({
          success: true,
          data: project
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo proyecto', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Serve projects management UI
    this.app.get('/projects', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/projects.html'));
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ 
        success: false, 
        error: 'Endpoint no encontrado' 
      });
    });
  }

  async start(port = 3000) {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, (error) => {
        if (error) {
          logger.errorWithStack('Error iniciando servidor', error);
          reject(error);
        } else {
          logger.info(`🚀 Servidor API iniciado en puerto ${port}`);
          console.log(`🚀 Servidor API iniciado en puerto ${port}`);
          console.log(`📋 Endpoints disponibles:`);
          console.log(`   GET  /health                    - Health check`);
          console.log(`   GET  /api/status                - Estado del sistema`);
          console.log(`   GET  /api/stats                 - Estadísticas`);
          console.log(`   GET  /api/projects/recent       - Proyectos recientes`);
          console.log(`   GET  /api/projects/search       - Buscar proyectos`);
          console.log(`   POST /api/workana/scrape        - Scraping de Workana`);
          console.log(`   POST /api/upwork/scrape         - Scraping de Upwork`);
          console.log(`   POST /api/workana/login         - Login en Workana`);
          console.log(`   POST /api/workana/proposal      - Enviar propuesta Workana`);
          console.log(`   POST /api/scrape/single         - Ciclo único`);
          console.log(`   POST /api/proposal/generate     - Generar propuesta`);
          console.log(`   POST /api/cleanup               - Limpiar datos`);
          console.log(`   GET  /build-bid/:id/:platform   - Enviar propuesta por URL`);
          console.log(`   `);
          console.log(`👥 Gestión de Usuarios:`);
          console.log(`   GET  /api/users                 - Obtener todos los usuarios`);
          console.log(`   GET  /api/users/active          - Obtener usuarios activos`);
          console.log(`   GET  /api/users/stats           - Estadísticas de usuarios`);
          console.log(`   GET  /api/users/:id             - Obtener usuario por ID`);
          console.log(`   POST /api/users                 - Crear nuevo usuario`);
          console.log(`   PUT  /api/users/:id             - Actualizar usuario`);
          console.log(`   PATCH /api/users/:id/status     - Cambiar estado de usuario`);
          console.log(`   DELETE /api/users/:id           - Eliminar usuario`);
          console.log(`   GET  /users                     - Interfaz web de gestión`);
          resolve(server);
        }
      });
    });
  }
}

async function startServer(port = 3000) {
  const server = new ApiServer();
  return await server.start(port);
}

module.exports = { ApiServer, startServer };