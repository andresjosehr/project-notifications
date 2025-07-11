class User {
  constructor(data) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.proposalDirectives = data.proposal_directives || '';
    this.professionalProfile = data.professional_profile || '';
    this.telegramUser = data.telegram_user || '';
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.password = data.password || '';
    this.role = data.role || 'USER';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  validate() {
    const errors = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email es requerido');
    }

    if (!this.isValidEmail(this.email)) {
      errors.push('Email debe ser válido');
    }

    // Validar role
    if (!['ADMIN', 'USER'].includes(this.role)) {
      errors.push('Rol debe ser ADMIN o USER');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validación específica para actualizaciones (campos opcionales)
  validateForUpdate() {
    const errors = [];

    // Solo validar email si se está proporcionando
    if (this.email && this.email.trim() !== '') {
      if (!this.isValidEmail(this.email)) {
        errors.push('Email debe ser válido');
      }
    }

    // Validar role si se está proporcionando
    if (this.role && !['ADMIN', 'USER'].includes(this.role)) {
      errors.push('Rol debe ser ADMIN o USER');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validación específica para registro inicial
  validateForInitialSetup() {
    const errors = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email es requerido');
    }

    if (!this.isValidEmail(this.email)) {
      errors.push('Email debe ser válido');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Contraseña es requerida');
    }

    // Para el registro inicial, el rol debe ser ADMIN
    if (this.role !== 'ADMIN') {
      errors.push('El primer usuario debe ser administrador');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validación específica para creación de usuarios (registro con token)
  validateForCreation() {
    const errors = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email es requerido');
    }

    if (!this.isValidEmail(this.email)) {
      errors.push('Email debe ser válido');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Contraseña es requerida');
    }

    // Validar role si se está proporcionando
    if (this.role && !['ADMIN', 'USER'].includes(this.role)) {
      errors.push('Rol debe ser ADMIN o USER');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }



  toJSON() {
    return {
      id: this.id,
      email: this.email,
      proposalDirectives: this.proposalDirectives,
      professionalProfile: this.professionalProfile,
      telegramUser: this.telegramUser,
      isActive: this.isActive,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new User({
      id: row.id,
      email: row.email,
      proposal_directives: row.proposal_directives,
      professional_profile: row.professional_profile,
      telegram_user: row.telegram_user,
      is_active: row.is_active,
      password: row.password,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  sanitizeText(text) {
    if (!text) return '';
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  toDatabaseInsert() {
    return {
      email: this.email,
      proposal_directives: this.sanitizeText(this.proposalDirectives),
      professional_profile: this.sanitizeText(this.professionalProfile),
      telegram_user: this.telegramUser,
      is_active: this.isActive,
      password: this.password,
      role: this.role
    };
  }

  toDatabaseUpdate() {
    return {
      email: this.email,
      proposal_directives: this.sanitizeText(this.proposalDirectives),
      professional_profile: this.sanitizeText(this.professionalProfile),
      telegram_user: this.telegramUser,
      is_active: this.isActive,
      password: this.password,
      role: this.role,
      updated_at: new Date()
    };
  }

  // Método para actualización parcial - solo incluye campos que han cambiado
  toDatabasePartialUpdate(originalUser) {
    const updateData = {
      updated_at: new Date()
    };

    // Solo incluir campos que han cambiado
    if (this.email !== originalUser.email) {
      updateData.email = this.email;
    }

    if (this.proposalDirectives !== originalUser.proposalDirectives) {
      updateData.proposal_directives = this.sanitizeText(this.proposalDirectives);
    }

    if (this.professionalProfile !== originalUser.professionalProfile) {
      updateData.professional_profile = this.sanitizeText(this.professionalProfile);
    }

    if (this.telegramUser !== originalUser.telegramUser) {
      updateData.telegram_user = this.telegramUser;
    }

    if (this.isActive !== originalUser.isActive) {
      updateData.is_active = this.isActive;
    }

    if (this.password && this.password.trim() !== '') {
      updateData.password = this.password;
    }

    if (this.role !== originalUser.role) {
      updateData.role = this.role;
    }

    return updateData;
  }
}

module.exports = User;