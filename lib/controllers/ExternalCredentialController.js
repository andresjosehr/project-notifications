const ExternalCredential = require('../models/ExternalCredential');
const ExternalCredentialRepository = require('../database/repositories/ExternalCredentialRepository');
const UserRepository = require('../database/repositories/UserRepository');
const logger = require('../utils/logger');

class ExternalCredentialController {
  constructor() {
    this.externalCredentialRepository = new ExternalCredentialRepository();
    this.userRepository = UserRepository;
  }

  async getAllCredentials(req, res) {
    try {
      const credentials = await this.externalCredentialRepository.findActiveCredentials();
      
      res.json({
        success: true,
        data: credentials.map(cred => cred.toJSON())
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales externas', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCredentialsByUser(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario es requerido'
        });
      }

      const credentials = await this.externalCredentialRepository.findByUserId(userId);
      
      res.json({
        success: true,
        data: credentials.map(cred => cred.toJSON())
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales por usuario', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCredentialsByPlatform(req, res) {
    try {
      const { platform } = req.params;
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: 'Plataforma es requerida'
        });
      }

      const credentials = await this.externalCredentialRepository.findByPlatform(platform);
      
      res.json({
        success: true,
        data: credentials.map(cred => cred.toJSON())
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo credenciales por plataforma', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createCredential(req, res) {
    try {
      const credentialData = req.body;
      
      // Validar campos requeridos
      const requiredFields = ['userId', 'platform', 'email', 'password'];
      const missingFields = requiredFields.filter(field => !credentialData[field] || credentialData[field].trim() === '');
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      // Verificar que el usuario existe
      const user = await this.userRepository.findById(credentialData.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Verificar que no existe una credencial para este usuario y plataforma
      const existingCredential = await this.externalCredentialRepository.findByUserIdAndPlatform(
        credentialData.userId, 
        credentialData.platform
      );
      
      if (existingCredential) {
        return res.status(409).json({
          success: false,
          error: `Ya existe una credencial para el usuario en la plataforma ${credentialData.platform}`
        });
      }

      const credential = new ExternalCredential(credentialData);
      const validation = credential.validate();
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: `Datos inválidos: ${validation.errors.join(', ')}`
        });
      }

      const credentialId = await this.externalCredentialRepository.create(credential);
      const createdCredential = await this.externalCredentialRepository.findById(credentialId);

      logger.info('Credencial externa creada exitosamente', { 
        credentialId, 
        userId: credentialData.userId,
        platform: credentialData.platform,
        email: credentialData.email 
      });

      res.status(201).json({
        success: true,
        message: 'Credencial externa creada exitosamente',
        data: createdCredential.toJSON()
      });
    } catch (error) {
      logger.errorWithStack('Error creando credencial externa', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateCredential(req, res) {
    try {
      const { id } = req.params;
      const credentialData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de credencial es requerido'
        });
      }

      const existingCredential = await this.externalCredentialRepository.findById(id);
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          error: 'Credencial no encontrada'
        });
      }

      // Actualizar solo los campos proporcionados
      const updatedCredential = new ExternalCredential({
        ...existingCredential,
        ...credentialData,
        id: parseInt(id)
      });

      const validation = updatedCredential.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: `Datos inválidos: ${validation.errors.join(', ')}`
        });
      }

      await this.externalCredentialRepository.update(updatedCredential);
      const result = await this.externalCredentialRepository.findById(id);

      logger.info('Credencial externa actualizada exitosamente', { 
        id, 
        userId: updatedCredential.userId,
        platform: updatedCredential.platform 
      });

      res.json({
        success: true,
        message: 'Credencial externa actualizada exitosamente',
        data: result.toJSON()
      });
    } catch (error) {
      logger.errorWithStack('Error actualizando credencial externa', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteCredential(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de credencial es requerido'
        });
      }

      const existingCredential = await this.externalCredentialRepository.findById(id);
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          error: 'Credencial no encontrada'
        });
      }

      await this.externalCredentialRepository.delete(id);

      logger.info('Credencial externa eliminada exitosamente', { id });

      res.json({
        success: true,
        message: 'Credencial externa eliminada exitosamente'
      });
    } catch (error) {
      logger.errorWithStack('Error eliminando credencial externa', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deactivateCredential(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de credencial es requerido'
        });
      }

      const existingCredential = await this.externalCredentialRepository.findById(id);
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          error: 'Credencial no encontrada'
        });
      }

      await this.externalCredentialRepository.deactivate(id);

      logger.info('Credencial externa desactivada exitosamente', { id });

      res.json({
        success: true,
        message: 'Credencial externa desactivada exitosamente'
      });
    } catch (error) {
      logger.errorWithStack('Error desactivando credencial externa', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateSessionData(req, res) {
    try {
      const { id } = req.params;
      const { sessionData, expiresAt } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de credencial es requerido'
        });
      }

      const existingCredential = await this.externalCredentialRepository.findById(id);
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          error: 'Credencial no encontrada'
        });
      }

      await this.externalCredentialRepository.updateSessionData(id, sessionData, expiresAt);

      logger.info('Datos de sesión actualizados exitosamente', { id });

      res.json({
        success: true,
        message: 'Datos de sesión actualizados exitosamente'
      });
    } catch (error) {
      logger.errorWithStack('Error actualizando datos de sesión', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ExternalCredentialController(); 