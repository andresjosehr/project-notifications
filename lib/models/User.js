class User {
  constructor(data) {
    this.id = data.id || null;
    this.workanaEmail = data.workana_email || '';
    this.workanaPassword = data.workana_password || '';
    this.proposalDirectives = data.proposal_directives || '';
    this.professionalProfile = data.professional_profile || '';
    this.telegramUser = data.telegram_user || '';
    this.workanaSessionData = data.workana_session_data || null;
    this.sessionExpiresAt = data.session_expires_at || null;
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.systemPassword = data.system_password || '';
    this.role = data.role || 'USER';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  validate() {
    const errors = [];

    if (!this.workanaEmail || this.workanaEmail.trim() === '') {
      errors.push('Email de Workana es requerido');
    }

    if (!this.workanaPassword || this.workanaPassword.trim() === '') {
      errors.push('Contraseña de Workana es requerida');
    }

    if (!this.proposalDirectives || this.proposalDirectives.trim() === '') {
      errors.push('Directrices de propuesta son requeridas');
    }

    if (!this.professionalProfile || this.professionalProfile.trim() === '') {
      errors.push('Perfil profesional es requerido');
    }

    if (!this.telegramUser || this.telegramUser.trim() === '') {
      errors.push('Usuario de Telegram es requerido');
    }

    if (!this.isValidEmail(this.workanaEmail)) {
      errors.push('Email de Workana debe ser válido');
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

  // Validación específica para registro inicial (sin campos de Workana)
  validateForInitialSetup() {
    const errors = [];

    if (!this.workanaEmail || this.workanaEmail.trim() === '') {
      errors.push('Email de Workana es requerido');
    }

    if (!this.systemPassword || this.systemPassword.trim() === '') {
      errors.push('Contraseña del sistema es requerida');
    }

    if (!this.isValidEmail(this.workanaEmail)) {
      errors.push('Email de Workana debe ser válido');
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

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isSessionValid() {
    if (!this.sessionExpiresAt || !this.workanaSessionData) {
      return false;
    }
    
    const now = new Date();
    const expiresAt = new Date(this.sessionExpiresAt);
    return now < expiresAt;
  }

  toJSON() {
    return {
      id: this.id,
      workanaEmail: this.workanaEmail,
      proposalDirectives: this.proposalDirectives,
      professionalProfile: this.professionalProfile,
      telegramUser: this.telegramUser,
      sessionExpiresAt: this.sessionExpiresAt,
      isActive: this.isActive,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new User({
      id: row.id,
      workana_email: row.workana_email,
      workana_password: row.workana_password,
      proposal_directives: row.proposal_directives,
      professional_profile: row.professional_profile,
      telegram_user: row.telegram_user,
      workana_session_data: row.workana_session_data,
      session_expires_at: row.session_expires_at,
      is_active: row.is_active,
      system_password: row.system_password,
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
      workana_email: this.workanaEmail,
      workana_password: this.workanaPassword,
      proposal_directives: this.sanitizeText(this.proposalDirectives),
      professional_profile: this.sanitizeText(this.professionalProfile),
      telegram_user: this.telegramUser,
      workana_session_data: this.workanaSessionData,
      session_expires_at: this.sessionExpiresAt,
      is_active: this.isActive,
      system_password: this.systemPassword,
      role: this.role
    };
  }

  toDatabaseUpdate() {
    return {
      workana_email: this.workanaEmail,
      workana_password: this.workanaPassword,
      proposal_directives: this.sanitizeText(this.proposalDirectives),
      professional_profile: this.sanitizeText(this.professionalProfile),
      telegram_user: this.telegramUser,
      workana_session_data: this.workanaSessionData,
      session_expires_at: this.sessionExpiresAt,
      is_active: this.isActive,
      system_password: this.systemPassword,
      role: this.role,
      updated_at: new Date()
    };
  }
}

module.exports = User;