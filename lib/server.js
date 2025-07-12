const express = require('express');
const NotificationApp = require('./app');
const WorkanaService = require('./services/WorkanaService');
const UserController = require('./controllers/UserController');
const ExternalCredentialController = require('./controllers/ExternalCredentialController');
const TokenRepository = require('./database/repositories/TokenRepository');
const authMiddleware = require('./middleware/authMiddleware');
const logger = require('./utils/logger');
const config = require('./config');
const path = require('path');
const DateUtils = require('./utils/dateUtils');
const fs = require('fs').promises;

class ApiServer {
  constructor() {
    this.app = express();
    this.notificationApp = new NotificationApp();
    this.workanaService = new WorkanaService();
    this.tokenRepository = null; // Will be initialized with database connection
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initializeRepositories() {
    if (!this.tokenRepository) {
      // Initialize database connection without requiring full app health
      if (!this.notificationApp.connection) {
        const Database = require('./database/connection');
        this.notificationApp.connection = Database;
      }
      this.tokenRepository = new TokenRepository();
    }
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

  // Función auxiliar para leer archivos de contenido
  async readContentFile(filename) {
    try {
      const filePath = path.join(__dirname, '..', filename);
      const content = await fs.readFile(filePath, 'utf8');
      return content.trim();
    } catch (error) {
      logger.errorWithStack(`Error leyendo archivo ${filename}`, error);
      return null;
    }
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

    // Status endpoint for checking authentication
    this.app.get('/api/status', authMiddleware.authenticate, async (req, res) => {
      try {
        res.json({
          success: true,
          authenticated: true,
          user: {
            id: req.user.id,
            email: req.user.workana_email,
            role: req.user.role
          }
        });
      } catch (error) {
        logger.errorWithStack('Error en status endpoint', error);
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

    // Check if system is initialized (not protected)
    this.app.get('/api/auth/check-initialization', async (req, res) => {
      try {
        const userCount = await this.notificationApp.userRepository.count();
        
        res.json({
          success: true,
          isInitialized: userCount > 0,
          userCount
        });
      } catch (error) {
        logger.errorWithStack('Error verificando inicialización del sistema', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Initial admin registration (not protected)
    this.app.post('/api/auth/register-admin', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        // Verificar que no hay usuarios registrados
        const userCount = await this.notificationApp.userRepository.count();
        if (userCount > 0) {
          return res.status(403).json({ 
            success: false, 
            error: 'El sistema ya está inicializado. No se puede registrar un administrador adicional.' 
          });
        }

        // Validar campos requeridos
        if (!email || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Email y contraseña son requeridos' 
          });
        }

        // Leer contenido de los archivos
        const professionalProfile = await this.readContentFile('profesional-profile.txt');
        const proposalDirectives = await this.readContentFile('proposal-directives.txt');

        // Crear usuario administrador con contenido de los archivos
        const userData = {
          email: email,
          proposal_directives: proposalDirectives || 'Configurar directrices de propuesta',
          professional_profile: professionalProfile || 'Configurar perfil profesional',
          telegram_user: '',
          password: password,
          role: 'ADMIN',
          is_active: true
        };

        const user = new (require('./models/User'))(userData);
        const validation = user.validateForInitialSetup();
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: `Datos inválidos: ${validation.errors.join(', ')}`
          });
        }

        const userId = await this.notificationApp.userRepository.create(user);
        const createdUser = await this.notificationApp.userRepository.findById(userId);

        logger.info('Administrador inicial registrado exitosamente', { 
          userId, 
          email,
          role: 'ADMIN',
          profileLoaded: !!professionalProfile,
          directivesLoaded: !!proposalDirectives
        });

        res.status(201).json({
          success: true,
          message: 'Administrador registrado exitosamente. Ya puedes iniciar sesión.',
          data: {
            id: createdUser.id,
            email: createdUser.email,
            role: createdUser.role
          }
        });
      } catch (error) {
        logger.errorWithStack('Error registrando administrador inicial', error);
        res.status(500).json({ 
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

    // === REGISTRATION TOKEN MANAGEMENT ===
    
    // Generate registration token (protected, admin only)
    this.app.post('/api/tokens/generate', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const token = await this.tokenRepository.generateToken(req.user.id);
        
        res.json({
          success: true,
          message: 'Token de registro generado exitosamente',
          data: {
            ...token,
            registerUrl: `${req.protocol}://${req.get('host')}/register.html?token=${token.token}`
          }
        });
      } catch (error) {
        logger.errorWithStack('Error generando token de registro', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get all tokens (protected, admin only)
    this.app.get('/api/tokens', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        const tokens = await this.tokenRepository.getAllTokens(offset, parseInt(limit));
        
        res.json({
          success: true,
          data: tokens
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo tokens', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get token statistics (protected, admin only)
    this.app.get('/api/tokens/stats', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const stats = await this.tokenRepository.getTokenStats();
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        logger.errorWithStack('Error obteniendo estadísticas de tokens', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Delete token (protected, admin only)
    this.app.delete('/api/tokens/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const { id } = req.params;
        const success = await this.tokenRepository.deleteToken(parseInt(id));
        
        if (success) {
          res.json({
            success: true,
            message: 'Token eliminado exitosamente'
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Token no encontrado'
          });
        }
      } catch (error) {
        logger.errorWithStack('Error eliminando token', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Cleanup old tokens (protected, admin only)
    this.app.post('/api/tokens/cleanup', authMiddleware.authenticate, authMiddleware.requireAdmin, async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const { days = 30 } = req.body;
        const deletedCount = await this.tokenRepository.cleanupOldTokens(days);
        
        res.json({
          success: true,
          message: `${deletedCount} tokens antiguos eliminados`,
          data: { deletedCount }
        });
      } catch (error) {
        logger.errorWithStack('Error limpiando tokens antiguos', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Validate token (public endpoint for registration)
    this.app.get('/api/tokens/validate/:token', async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const { token } = req.params;
        const isValid = await this.tokenRepository.isValidToken(token);
        
        res.json({
          success: true,
          data: { isValid }
        });
      } catch (error) {
        logger.errorWithStack('Error validando token', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Register with token (public endpoint)
    this.app.post('/api/auth/register-with-token', async (req, res) => {
      try {
        await this.initializeRepositories();
        
        const { token, email, password, telegram_user, proposal_directives, professional_profile } = req.body;
        
        if (!token || !email || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Token, email y contraseña son requeridos' 
          });
        }

        // Validate token
        const tokenData = await this.tokenRepository.getByToken(token);
        if (!tokenData || tokenData.isUsed) {
          return res.status(400).json({ 
            success: false, 
            error: 'Token inválido o ya utilizado' 
          });
        }

        // Create user
        const userData = {
          email: email,
          password: password,
          telegram_user: telegram_user || '',
          proposal_directives: proposal_directives || 'Configurar directrices de propuesta',
          professional_profile: professional_profile || 'Configurar perfil profesional',
          role: 'USER',
          is_active: true
        };

        const user = new (require('./models/User'))(userData);
        const validation = user.validateForCreation();
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: `Datos inválidos: ${validation.errors.join(', ')}`
          });
        }

        const userId = await this.notificationApp.userRepository.create(user);
        
        // Mark token as used
        await this.tokenRepository.markAsUsed(token, userId);

        const createdUser = await this.notificationApp.userRepository.findById(userId);

        logger.info('Usuario registrado con token exitosamente', { 
          userId, 
          email,
          token: token.substring(0, 8) + '...',
          role: 'USER'
        });

        res.status(201).json({
          success: true,
          message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.',
          data: {
            id: createdUser.id,
            email: createdUser.email,
            role: createdUser.role
          }
        });
      } catch (error) {
        logger.errorWithStack('Error registrando usuario con token', error);
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

    // Generate proposal endpoint (conditionally protected) - For proposal review flow
    this.app.post('/api/proposal/generate', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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

    // Send proposal with custom content endpoint (conditionally protected)
    this.app.post('/api/proposal/send', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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

    // Get project by ID endpoint (legacy endpoint - redirects to authenticated version)
    this.app.get('/api/project/:id', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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

    // Get user by ID endpoint (conditionally protected)
    this.app.get('/api/user/:id', authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin(), async (req, res) => {
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

    // Statistics endpoint (protected - accessible to all authenticated users)
    this.app.get('/api/stats', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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
    this.app.get('/api/projects/recent', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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
    this.app.get('/api/projects/search', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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

    // Build-bid endpoint for URL-based proposal triggering (no protection) - Redirects to proposal review
    this.app.get('/build-bid/:id/:platform', async (req, res) => {
      try {
        const { id: projectId, platform } = req.params;
        const { userId, token } = req.query;
        
        if (!projectId || !platform || !userId) {
          return res.status(400).send(`
            <html>
              <head><title>Error - Parámetros Faltantes</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>❌ Error</h1>
                <p>Se requieren projectId, platform y userId</p>
                <p>URL: /build-bid/${projectId || '[projectId]'}/${platform || '[platform]'}?userId=${userId || '[userId]'}</p>
              </body>
            </html>
          `);
        }

        // Only support Workana for now
        if (platform !== 'workana') {
          return res.status(400).send(`
            <html>
              <head><title>Error - Plataforma No Soportada</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>❌ Error</h1>
                <p>Solo se soporta la plataforma Workana actualmente</p>
                <p>Plataforma solicitada: ${platform}</p>
              </body>
            </html>
          `);
        }

        // Verify that project and user exist
        try {
          const project = await this.notificationApp.getProjectById(projectId);
          const user = await this.notificationApp.getUserById(userId);
          
          if (!project) {
            return res.status(404).send(`
              <html>
                <head><title>Error - Proyecto No Encontrado</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Proyecto No Encontrado</h1>
                  <p>El proyecto con ID ${projectId} no existe</p>
                </body>
              </html>
            `);
          }

          if (!user || !user.isActive) {
            return res.status(404).send(`
              <html>
                <head><title>Error - Usuario No Disponible</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Usuario No Disponible</h1>
                  <p>El usuario con ID ${userId} no existe o está inactivo</p>
                </body>
              </html>
            `);
          }

        } catch (error) {
          logger.errorWithStack('Error verificando proyecto/usuario en build-bid', error);
          return res.status(500).send(`
            <html>
              <head><title>Error - Verificación Fallida</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>❌ Error del Sistema</h1>
                <p>No se pudo verificar el proyecto o usuario</p>
                <p>Error: ${error.message}</p>
              </body>
            </html>
          `);
        }

        // Redirect to proposal review page with parameters
        const params = new URLSearchParams({
          projectId: projectId,
          userId: userId,
          platform: platform,
          source: 'telegram', // Indicate this came from Telegram
          autoLogin: 'true',
          generateCustom: 'true'
        });

        // If there's a token, add it to params for future authentication
        if (token) {
          params.append('token', token);
        }

        const redirectUrl = `/proposal-review.html?${params.toString()}`;
        
        logger.info(`Redirigiendo build-bid a página de revisión`, {
          projectId,
          userId,
          platform,
          redirectUrl
        });

        // Redirect to proposal review page
        res.redirect(redirectUrl);

      } catch (error) {
        logger.errorWithStack('Error en build-bid endpoint', error);
        res.status(500).send(`
          <html>
            <head><title>Error del Sistema</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>❌ Error del Sistema</h1>
              <p>Ha ocurrido un error inesperado</p>
              <p>Error: ${error.message}</p>
              <p>Por favor contacta al administrador del sistema</p>
            </body>
          </html>
        `);
      }
    });

    // === USER MANAGEMENT ROUTES ===
    // Get all users (protected)
    this.app.get('/api/users', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getAllUsers.bind(UserController));
    
    // Get active users only (protected - accessible to all authenticated users)
    this.app.get('/api/users/active', authMiddleware.authenticate, authMiddleware.requireUser, UserController.getActiveUsers.bind(UserController));
    
    // Get user statistics (protected)
    this.app.get('/api/users/stats', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.getUserStats.bind(UserController));
    
    // Get user by ID (protected - users can access their own data, admins can access any)
    this.app.get('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin(), UserController.getUserById.bind(UserController));
    
    // Create new user (protected)
    this.app.post('/api/users', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.createUser.bind(UserController));
    
    // Update user (protected - users can update their own data, admins can update any)
    this.app.put('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin(), UserController.updateUser.bind(UserController));
    
    // Toggle user active status (protected)
    this.app.patch('/api/users/:id/status', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.toggleUserStatus.bind(UserController));
    
    // Delete user (protected)
    this.app.delete('/api/users/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, UserController.deleteUser.bind(UserController));

    // === EXTERNAL CREDENTIALS MANAGEMENT ROUTES ===
    // Get all external credentials (protected)
    this.app.get('/api/external-credentials', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.getAllCredentials.bind(ExternalCredentialController));
    
    // Get credentials by user (protected)
    this.app.get('/api/external-credentials/user/:userId', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.getCredentialsByUser.bind(ExternalCredentialController));
    
    // Get credentials by platform (protected)
    this.app.get('/api/external-credentials/platform/:platform', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.getCredentialsByPlatform.bind(ExternalCredentialController));
    
    // Create new external credential (protected)
    this.app.post('/api/external-credentials', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.createCredential.bind(ExternalCredentialController));
    
    // Update external credential (protected)
    this.app.put('/api/external-credentials/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.updateCredential.bind(ExternalCredentialController));
    
    // Delete external credential (protected)
    this.app.delete('/api/external-credentials/:id', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.deleteCredential.bind(ExternalCredentialController));
    
    // Deactivate external credential (protected)
    this.app.patch('/api/external-credentials/:id/deactivate', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.deactivateCredential.bind(ExternalCredentialController));
    
    // Update session data (protected)
    this.app.patch('/api/external-credentials/:id/session', authMiddleware.authenticate, authMiddleware.requireAdmin, ExternalCredentialController.updateSessionData.bind(ExternalCredentialController));

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
    this.app.get('/api/projects', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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
    this.app.get('/api/projects/:id', authMiddleware.authenticate, authMiddleware.requireUser, async (req, res) => {
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

    // Serve profile management UI
    this.app.get('/profile', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/profile.html'));
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
        
        res.json({
          success: true,
          data: {
            ...stats,
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