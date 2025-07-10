const express = require('express');
const NotificationApp = require('./app');
const WorkanaService = require('./services/WorkanaService');
const UserController = require('./controllers/UserController');
const authMiddleware = require('./middleware/authMiddleware');
const logger = require('./utils/logger');
const config = require('./config');
const path = require('path');
const DateUtils = require('./utils/dateUtils');

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
    // Redirect root to login page
    this.app.get('/', (req, res) => {
      res.redirect('/login.html');
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

    // Login endpoint (not protected)
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Email y contraseña son requeridos' 
          });
        }

        const result = await authMiddleware.login(email, password);
        res.json(result);
      } catch (error) {
        logger.errorWithStack('Error en login endpoint', error);
        res.status(401).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Generate access token for build-bid endpoint (protected, admin only)
    this.app.post('/api/auth/generate-access-token', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { projectId, platform, userId } = req.body;
        
        if (!projectId || !platform || !userId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId, platform y userId' 
          });
        }

        const token = await authMiddleware.generateAccessToken(projectId, platform, userId);
        
        res.json({
          success: true,
          message: 'Access token generado exitosamente',
          data: {
            token,
            url: `${req.protocol}://${req.get('host')}/build-bid/${projectId}/${platform}?token=${token}`,
            expiresIn: '24h'
          }
        });
      } catch (error) {
        logger.errorWithStack('Error generando access token', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Workana scraping endpoint (protected)
    this.app.post('/api/workana/scrape', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const options = {
          notifications: req.body.notifications !== false,
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

    // Upwork scraping endpoint (protected)
    this.app.post('/api/upwork/scrape', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const options = {
          notifications: req.body.notifications !== false,
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

    // Workana login endpoint (protected)
    this.app.post('/api/workana/login', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Workana proposal endpoint (protected)
    this.app.post('/api/workana/proposal', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { projectId, userId, autoLogin = true, username, password } = req.body;
        
        if (!projectId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requiere projectId' 
          });
        }

        let result;
        
        // Si se especifica un userId, usar sendProposalByUserId
        if (userId) {
          result = await this.workanaService.sendProposalByUserId(projectId, userId, req.body);
        } else {
          // Comportamiento original para compatibilidad
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

          result = await this.workanaService.sendProposal(projectId, req.body);
        }
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta enviada correctamente',
            data: {
              projectId,
              projectTitle: result.projectTitle,
              userEmail: result.userEmail,
              userId: result.userId
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

    // Generate proposal endpoint (protected) - For proposal review flow
    this.app.post('/api/proposal/generate', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { projectId, userId, platform = 'workana' } = req.body;
        
        if (!projectId || !userId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId y userId' 
          });
        }

        // Generate proposal without sending it
        const result = await this.workanaService.generateProposalOnly(projectId, userId, req.body);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta generada exitosamente',
            data: {
              projectId,
              userId,
              proposal: result.proposal,
              projectTitle: result.projectTitle,
              userEmail: result.userEmail,
              platform
            }
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: result.error || 'Error generando propuesta' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error generando propuesta', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Send proposal with custom content endpoint (protected)
    this.app.post('/api/proposal/send', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { projectId, userId, proposalContent, sendNotification = true } = req.body;
        
        if (!projectId || !userId || !proposalContent) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId, userId y proposalContent' 
          });
        }

        // Send proposal with custom content
        const result = await this.workanaService.sendProposalWithCustomContent(
          projectId, 
          userId, 
          proposalContent,
          { ...req.body, sendNotification }
        );
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta enviada correctamente',
            data: {
              projectId,
              userId,
              projectTitle: result.projectTitle,
              userEmail: result.userEmail,
              proposalSent: true
            }
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: result.error || 'Error enviando propuesta' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error enviando propuesta personalizada', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get project by ID endpoint (protected)
    this.app.get('/api/project/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!id) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requiere ID del proyecto' 
          });
        }

        const project = await this.notificationApp.getProjectById(id);
        
        if (project) {
          res.json({
            success: true,
            data: project
          });
        } else {
          res.status(404).json({ 
            success: false, 
            error: 'Proyecto no encontrado' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error obteniendo proyecto', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get user by ID endpoint (protected)
    this.app.get('/api/user/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!id) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requiere ID del usuario' 
          });
        }

        const user = await this.notificationApp.getUserById(id);
        
        if (user) {
          res.json({
            success: true,
            data: user
          });
        } else {
          res.status(404).json({ 
            success: false, 
            error: 'Usuario no encontrado' 
          });
        }
      } catch (error) {
        logger.errorWithStack('Error obteniendo usuario', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Statistics endpoint (protected)
    this.app.get('/api/stats', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Recent projects endpoint (protected)
    this.app.get('/api/projects/recent', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Search projects endpoint (protected)
    this.app.get('/api/projects/search', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Single cycle endpoint (protected)
    this.app.post('/api/scrape/single', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const options = {
          parallel: req.body.parallel !== false,
          notifications: req.body.notifications !== false,
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

    // Generate proposal endpoint (protected)
    this.app.post('/api/proposal/generate', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // System status endpoint (protected)
    this.app.get('/api/status', authMiddleware.authenticate, authMiddleware.requireAdmin, (req, res) => {
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

    // Cleanup endpoint (protected)
    this.app.post('/api/cleanup', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Build-bid endpoint for URL-based proposal triggering (no protection)
    this.app.get('/build-bid/:id/:platform', async (req, res) => {
      try {
        const { id: projectId, platform } = req.params;
        const { userId } = req.query;
        
        if (!projectId || !platform || !userId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Se requieren projectId, platform y userId' 
          });
        }

        // Only support Workana for now
        if (platform !== 'workana') {
          return res.status(400).json({ 
            success: false, 
            error: 'Solo se soporta la plataforma Workana actualmente' 
          });
        }

        // Send the proposal using the user from the access token
        const result = await this.workanaService.sendProposalByUserId(projectId, userId);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Propuesta enviada exitosamente',
            data: {
              projectId,
              platform,
              userId: userId,
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
    // Get all users (protected)
    this.app.get('/api/users', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getAllUsers.bind(UserController));
    
    // Get active users only (protected)
    this.app.get('/api/users/active', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getActiveUsers.bind(UserController));
    
    // Get user statistics (protected)
    this.app.get('/api/users/stats', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getUserStats.bind(UserController));
    
    // Get user by ID (protected)
    this.app.get('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getUserById.bind(UserController));
    
    // Create new user (protected)
    this.app.post('/api/users', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.createUser.bind(UserController));
    
    // Update user (protected)
    this.app.put('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.updateUser.bind(UserController));
    
    // Toggle user active status (protected)
    this.app.patch('/api/users/:id/status', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.toggleUserStatus.bind(UserController));
    
    // Delete user (protected)
    this.app.delete('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.deleteUser.bind(UserController));

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
    // Get all projects with pagination (protected)
    this.app.get('/api/projects', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Get project by ID (protected)
    this.app.get('/api/projects/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
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

    // Serve control panel UI
    this.app.get('/control', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/control.html'));
    });



    // === DAEMON MANAGEMENT ENDPOINTS ===
    
    // Start daemon (protected)
    this.app.post('/api/daemon/start', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');
        
        // Crear directorio de logs si no existe
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Archivos de log y PID
        const logFile = path.join(logsDir, 'workana-daemon.log');
        const pidFile = path.join(logsDir, 'workana-daemon.pid');
        
        // Verificar si ya existe un daemon ejecutándose
        if (fs.existsSync(pidFile)) {
          const existingPid = fs.readFileSync(pidFile, 'utf8').trim();
          try {
            process.kill(existingPid, 0); // Verifica si el proceso existe
            return res.status(400).json({ 
              success: false, 
              error: 'El daemon ya está ejecutándose' 
            });
          } catch (e) {
            // El proceso no existe, eliminar archivo PID
            fs.unlinkSync(pidFile);
          }
        }
        
        // Ejecutar el daemon
        const cliPath = path.join(__dirname, '../cli.js');
        
        // Abrir archivo de log para stdout y stderr
        const logFd = fs.openSync(logFile, 'a');
        
        const daemonProcess = spawn('node', [cliPath, 'workana-daemon', '--interval', '1', '--max-runtime', '24'], {
          detached: true,
          stdio: ['ignore', logFd, logFd]
        });
        
        // Guardar PID
        fs.writeFileSync(pidFile, daemonProcess.pid.toString());
        
        // Desconectar del proceso padre
        daemonProcess.unref();
        
        // Log del inicio
        const timestamp = DateUtils.toVenezuelaString();
        fs.appendFileSync(logFile, `[${timestamp}] Daemon iniciado con PID: ${daemonProcess.pid}\n`);
        
        res.json({
          success: true,
          message: 'Daemon iniciado correctamente',
          data: { pid: daemonProcess.pid }
        });
      } catch (error) {
        logger.errorWithStack('Error en start daemon endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Stop daemon (protected)
    this.app.post('/api/daemon/stop', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const path = require('path');
        const fs = require('fs');
        
        const pidFile = path.join(__dirname, '../logs/workana-daemon.pid');
        
        if (!fs.existsSync(pidFile)) {
          return res.status(400).json({ 
            success: false, 
            error: 'No se encontró daemon ejecutándose' 
          });
        }
        
        const pid = fs.readFileSync(pidFile, 'utf8').trim();
        
        try {
          // Intentar terminar el proceso
          process.kill(pid, 'SIGTERM');
          
          // Esperar un momento y verificar si se terminó
          setTimeout(() => {
            try {
              process.kill(pid, 0); // Verifica si aún existe
              // Si llegamos aquí, el proceso aún existe, forzar terminación
              process.kill(pid, 'SIGKILL');
            } catch (e) {
              // El proceso ya terminó
            }
          }, 2000);
          
          // Eliminar archivo PID
          fs.unlinkSync(pidFile);
          
          // Log de parada
          const logFile = path.join(__dirname, '../logs/workana-daemon.log');
          const timestamp = DateUtils.toVenezuelaString();
          fs.appendFileSync(logFile, `[${timestamp}] Daemon detenido (PID: ${pid})\n`);
          
          res.json({
            success: true,
            message: 'Daemon detenido correctamente',
            data: { stopped: true, pid }
          });
        } catch (error) {
          if (error.code === 'ESRCH') {
            // El proceso ya no existe, limpiar archivo PID
            fs.unlinkSync(pidFile);
            res.json({
              success: true,
              message: 'Daemon ya estaba detenido',
              data: { stopped: true }
            });
          } else {
            throw error;
          }
        }
      } catch (error) {
        logger.errorWithStack('Error en stop daemon endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get daemon status (protected)
    this.app.get('/api/daemon/status', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const path = require('path');
        const fs = require('fs');
        
        const pidFile = path.join(__dirname, '../logs/workana-daemon.pid');
        const logFile = path.join(__dirname, '../logs/workana-daemon.log');
        
        let isRunning = false;
        let pid = null;
        let lastExecution = 'N/A';
        let todayExecutions = 0;
        let recentExecutions = [];
        
        // Verificar si existe archivo PID
        if (fs.existsSync(pidFile)) {
          const pidContent = fs.readFileSync(pidFile, 'utf8').trim();
          
          try {
            // Verificar si el proceso existe
            process.kill(pidContent, 0);
            isRunning = true;
            pid = pidContent;
          } catch (e) {
            // El proceso no existe, limpiar archivo PID
            fs.unlinkSync(pidFile);
          }
        }
        
        // Leer logs para obtener información adicional
        if (fs.existsSync(logFile)) {
          try {
            const logContent = fs.readFileSync(logFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            // Encontrar la última ejecución
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              const match = lastLine.match(/\[(.*?)\]/);
              if (match) {
                lastExecution = new Date(match[1]).toLocaleString();
              }
            }
            
            // Contar ejecuciones de hoy
            const today = DateUtils.getVenezuelaDateString();
            todayExecutions = lines.filter(line => line.includes(today)).length;
            
            // Obtener las últimas 5 ejecuciones
            recentExecutions = lines.slice(-5).map(line => {
              const match = line.match(/\[(.*?)\] (.*)/);
              if (match) {
                return {
                  time: new Date(match[1]).toLocaleString(),
                  message: match[2],
                  success: !match[2].includes('Error')
                };
              }
              return null;
            }).filter(exec => exec !== null);
          } catch (e) {
            logger.warn('Error leyendo logs del daemon', e);
          }
        }
        
        res.json({
          success: true,
          data: {
            active: isRunning,
            running: isRunning,
            pid: pid,
            lastExecution,
            todayExecutions,
            interval: '1 min',
            maxTime: '24h',
            notifications: true,
            recentExecutions
          }
        });
      } catch (error) {
        logger.errorWithStack('Error en daemon status endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // === SYSTEM HEALTH ENDPOINTS ===
    
    // Get system health (protected)
    this.app.get('/api/system/health', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const health = await this.notificationApp.healthCheck();
        
        res.json({
          success: true,
          data: health
        });
      } catch (error) {
        logger.errorWithStack('Error en system health endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get system stats (protected)
    this.app.get('/api/system/stats', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const stats = await this.notificationApp.getStats();
        const health = await this.notificationApp.healthCheck();
        
        // Get daemon status
        const path = require('path');
        const fs = require('fs');
        
        const pidFile = path.join(__dirname, '../logs/workana-daemon.pid');
        let isDaemonRunning = false;
        
        if (fs.existsSync(pidFile)) {
          const pidContent = fs.readFileSync(pidFile, 'utf8').trim();
          try {
            process.kill(pidContent, 0);
            isDaemonRunning = true;
          } catch (e) {
            fs.unlinkSync(pidFile);
          }
        }
        
        res.json({
          success: true,
          data: {
            ...stats,
            daemon: {
              active: isDaemonRunning,
              lastExecution: 'N/A', // Would need to parse logs
              todayExecutions: 0 // Would need to count today's executions
            },
            overall: health.overall
          }
        });
      } catch (error) {
        logger.errorWithStack('Error en system stats endpoint', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // === MANUAL OPERATIONS ENDPOINTS ===
    
    // Run manual scraping (protected)
    this.app.post('/api/operations/scraping', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const options = {
          parallel: req.body.parallel !== false,
          notifications: req.body.notifications !== false,
          ...req.body
        };

        await this.notificationApp.initialize();
        const results = await this.notificationApp.runSingleCycle(options);
        
        res.json({
          success: true,
          message: 'Scraping manual completado',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en scraping manual', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Run cleanup (protected)
    this.app.post('/api/operations/cleanup', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const results = await this.notificationApp.cleanup(req.body);
        
        res.json({
          success: true,
          message: 'Limpieza completada',
          data: results
        });
      } catch (error) {
        logger.errorWithStack('Error en cleanup', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Generate reports (protected)
    this.app.post('/api/operations/reports', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const stats = await this.notificationApp.getStats();
        const health = await this.notificationApp.healthCheck();
        
        const report = {
          timestamp: DateUtils.toVenezuelaString(),
          stats,
          health,
          summary: {
            totalProjects: stats.overall?.total || 0,
            totalUsers: stats.users?.total || 0,
            systemHealthy: health.overall?.healthy || false
          }
        };
        
        res.json({
          success: true,
          message: 'Reporte generado correctamente',
          data: report
        });
      } catch (error) {
        logger.errorWithStack('Error generando reporte', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // === LOGS ENDPOINTS ===
    
    // Get daemon logs (protected)
    this.app.get('/api/logs/daemon', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const logPath = path.join(__dirname, '../logs/workana-daemon.log');
        
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          res.json({
            success: true,
            data: content
          });
        } else {
          res.json({
            success: true,
            data: 'No hay logs disponibles'
          });
        }
      } catch (error) {
        logger.errorWithStack('Error obteniendo logs del daemon', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get app logs (protected)
    this.app.get('/api/logs/app', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const logPath = path.join(__dirname, '../logs/app.log');
        
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          res.json({
            success: true,
            data: content
          });
        } else {
          res.json({
            success: true,
            data: 'No hay logs disponibles'
          });
        }
      } catch (error) {
        logger.errorWithStack('Error obteniendo logs de la aplicación', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get error logs (protected)
    this.app.get('/api/logs/error', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const logPath = path.join(__dirname, '../logs/error.log');
        
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          res.json({
            success: true,
            data: content
          });
        } else {
          res.json({
            success: true,
            data: 'No hay logs de errores'
          });
        }
      } catch (error) {
        logger.errorWithStack('Error obteniendo logs de errores', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Clear logs (protected)
    this.app.post('/api/logs/clear', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const logFiles = [
          path.join(__dirname, '../logs/workana-daemon.log'),
          path.join(__dirname, '../logs/app.log'),
          path.join(__dirname, '../logs/error.log')
        ];
        
        let clearedCount = 0;
        logFiles.forEach(logFile => {
          if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
            clearedCount++;
          }
        });
        
        res.json({
          success: true,
          message: `${clearedCount} archivos de log limpiados`,
          data: { clearedCount }
        });
      } catch (error) {
        logger.errorWithStack('Error limpiando logs', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
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