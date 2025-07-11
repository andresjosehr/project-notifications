const userRepository = require('../database/repositories/UserRepository');
const ExternalCredentialRepository = require('../database/repositories/ExternalCredentialRepository');
const User = require('../models/User');
const ExternalCredential = require('../models/ExternalCredential');
const logger = require('../utils/logger');

class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await userRepository.findAll();
      const externalCredentialRepository = new ExternalCredentialRepository();
      
      // Obtener credenciales para todos los usuarios
      const usersWithCredentials = await Promise.all(
        users.map(async (user) => {
          const credentials = await externalCredentialRepository.findByUserId(user.id);
          const userData = user.toJSON();
          
          // Buscar credencial de Workana para mostrar en la tabla
          const workanaCredential = credentials.find(cred => cred.platform === 'workana');
          userData.workanaEmail = workanaCredential ? workanaCredential.email : '';
          
          return userData;
        })
      );
      
      res.json({
        success: true,
        data: usersWithCredentials,
        count: usersWithCredentials.length
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo todos los usuarios', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getActiveUsers(req, res) {
    try {
      const users = await userRepository.findActive();
      const sanitizedUsers = users.map(user => user.toJSON());
      
      res.json({
        success: true,
        data: sanitizedUsers,
        count: sanitizedUsers.length
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuarios activos', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      const user = await userRepository.findById(parseInt(id));
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Obtener credenciales externas del usuario
      const externalCredentialRepository = new ExternalCredentialRepository();
      const credentials = await externalCredentialRepository.findByUserId(parseInt(id));
      
      // Agregar credenciales al objeto de respuesta
      const userData = user.toJSON();
      userData.credentials = credentials.map(cred => ({
        id: cred.id,
        platform: cred.platform,
        email: cred.email,
        isActive: cred.isActive
      }));

      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo usuario por ID', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createUser(req, res) {
    try {
      const userData = req.body;
      
      // Validar campos requeridos
      const requiredFields = ['workana_email', 'workana_password', 'proposal_directives', 'professional_profile', 'telegram_user'];
      const missingFields = requiredFields.filter(field => !userData[field] || userData[field].trim() === '');
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      // Verificar si el email ya existe
      const existingUser = await userRepository.findByEmail(userData.workana_email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un usuario con este email de Workana'
        });
      }

      const user = new User(userData);
      const validation = user.validate();
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: `Datos inválidos: ${validation.errors.join(', ')}`
        });
      }

      const userId = await userRepository.create(user);
      const createdUser = await userRepository.findById(userId);

      logger.info('Usuario creado exitosamente', { 
        userId, 
        email: userData.workana_email,
        telegramUser: userData.telegram_user 
      });

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: createdUser.toJSON()
      });
    } catch (error) {
      logger.errorWithStack('Error creando usuario', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      const existingUser = await userRepository.findById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Separar datos del usuario de las credenciales externas
      const userFields = ['proposal_directives', 'professional_profile', 'telegram_user'];
      const credentialFields = ['workana_email', 'workana_password'];
      
      const userUpdateData = {};
      const credentialUpdateData = {};
      
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && userData[key] !== null && userData[key] !== '') {
          if (userFields.includes(key)) {
            userUpdateData[key] = userData[key];
          } else if (credentialFields.includes(key)) {
            credentialUpdateData[key] = userData[key];
          }
        }
      });

      // Actualizar datos del usuario
      if (Object.keys(userUpdateData).length > 0) {
        const updatedUserData = {
          ...existingUser,
          ...userUpdateData,
          id: parseInt(id)
        };

        const user = new User(updatedUserData);
        const validation = user.validateForUpdate();
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: `Datos inválidos: ${validation.errors.join(', ')}`
          });
        }

        const success = await userRepository.update(parseInt(id), user);
        
        if (!success) {
          return res.status(500).json({
            success: false,
            error: 'No se pudo actualizar el usuario'
          });
        }
      }

      // Actualizar credenciales de Workana si se proporcionan
      if (Object.keys(credentialUpdateData).length > 0) {
        const externalCredentialRepository = new ExternalCredentialRepository();
        const workanaCredential = await externalCredentialRepository.findByUserIdAndPlatform(parseInt(id), 'workana');
        
        if (workanaCredential) {
          // Actualizar credencial existente
          if (credentialUpdateData.workana_email) {
            workanaCredential.email = credentialUpdateData.workana_email;
          }
          if (credentialUpdateData.workana_password) {
            workanaCredential.password = credentialUpdateData.workana_password;
          }
          
          await externalCredentialRepository.update(workanaCredential);
        } else {
          // Crear nueva credencial si no existe
          if (credentialUpdateData.workana_email && credentialUpdateData.workana_password) {
            const newCredential = new ExternalCredential({
              userId: parseInt(id),
              platform: 'workana',
              email: credentialUpdateData.workana_email,
              password: credentialUpdateData.workana_password,
              isActive: true
            });
            
            await externalCredentialRepository.create(newCredential);
          }
        }
      }

      const updatedUser = await userRepository.findById(parseInt(id));

      logger.info('Usuario actualizado exitosamente', { 
        userId: id, 
        email: updatedUser.email 
      });

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser.toJSON()
      });
    } catch (error) {
      logger.errorWithStack('Error actualizando usuario', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'El campo is_active debe ser un boolean'
        });
      }

      const existingUser = await userRepository.findById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const success = await userRepository.setActive(parseInt(id), is_active);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'No se pudo actualizar el estado del usuario'
        });
      }

      logger.info('Estado de usuario actualizado', { 
        userId: id, 
        isActive: is_active 
      });

      res.json({
        success: true,
        message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`
      });
    } catch (error) {
      logger.errorWithStack('Error actualizando estado de usuario', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      const existingUser = await userRepository.findById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const success = await userRepository.delete(parseInt(id));
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'No se pudo eliminar el usuario'
        });
      }

      logger.info('Usuario eliminado exitosamente', { 
        userId: id, 
        email: existingUser.workanaEmail 
      });

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      logger.errorWithStack('Error eliminando usuario', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const totalUsers = await userRepository.count();
      const activeUsers = await userRepository.countActive();
      const usersWithValidSession = await userRepository.findWithValidSession();

      res.json({
        success: true,
        data: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          withValidSession: usersWithValidSession.length
        }
      });
    } catch (error) {
      logger.errorWithStack('Error obteniendo estadísticas de usuarios', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UserController();