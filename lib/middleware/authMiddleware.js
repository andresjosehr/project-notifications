const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

class AuthMiddleware {
  constructor() {
    this.db = null;
  }

  async initDB() {
    if (!this.db) {
      this.db = await mysql.createConnection({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database
      });
    }
    return this.db;
  }

  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.workana_email, 
        role: user.role 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // JWT authentication middleware
  authenticate = async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access denied. No token provided.' 
        });
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Get user from database to verify it still exists and is active
      const db = await this.initDB();
      const [rows] = await db.execute(
        'SELECT id, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId]
      );

      if (rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token. User not found or inactive.' 
        });
      }

      req.user = rows[0];
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
  };

  // Admin role verification middleware
  requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Admin role required.' 
      });
    }
    next();
  };

  // Login method
  async login(email, password) {
    try {
      const db = await this.initDB();
      const [rows] = await db.execute(
        'SELECT id, email, password, role, is_active FROM users WHERE email = ? AND is_active = 1',
        [email]
      );

      if (rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = rows[0];
      
      // Only allow ADMIN users to login
      if (user.role !== 'ADMIN') {
        throw new Error('Access denied. Admin role required.');
      }

      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user);
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Generate access token for /build-bid endpoint
  async generateAccessToken(projectId, platform, userId) {
    try {
      const db = await this.initDB();
      const token = jwt.sign(
        { 
          projectId: parseInt(projectId), 
          platform, 
          userId: parseInt(userId),
          type: 'access_token'
        },
        config.jwt.secret,
        { expiresIn: '24h' }
      );

      // Store token in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await db.execute(
        'INSERT INTO access_tokens (token, project_id, platform, user_id, expires_at) VALUES (?, ?, ?, ?, ?)',
        [token, projectId, platform, userId, expiresAt]
      );

      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw error;
    }
  }

  // Verify access token for /build-bid endpoint
  verifyAccessToken = async (req, res, next) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access token required' 
        });
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.type !== 'access_token') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token type' 
        });
      }

      const db = await this.initDB();
      const [rows] = await db.execute(
        'SELECT * FROM access_tokens WHERE token = ? AND expires_at > NOW() AND used_at IS NULL',
        [token]
      );

      if (rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired access token' 
        });
      }

      const tokenData = rows[0];
      
      // Verify token matches request parameters
      if (tokenData.project_id !== parseInt(req.params.id) || 
          tokenData.platform !== req.params.platform) {
        return res.status(401).json({ 
          success: false, 
          error: 'Token does not match request parameters' 
        });
      }

      // Mark token as used
      await db.execute(
        'UPDATE access_tokens SET used_at = NOW() WHERE id = ?',
        [tokenData.id]
      );

      req.accessToken = tokenData;
      req.user = { id: tokenData.user_id };
      next();
    } catch (error) {
      logger.error('Access token verification error:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid access token' 
      });
    }
  };
}

module.exports = new AuthMiddleware();