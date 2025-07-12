class ExternalCredential {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.user_id || data.userId || null;
    this.platform = data.platform || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.sessionData = data.session_data || data.sessionData || null;
    this.sessionExpiresAt = data.session_expires_at || data.sessionExpiresAt || null;
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  validate() {
    const errors = [];

    if (!this.userId) {
      errors.push('ID de usuario es requerido');
    }

    if (!this.platform || this.platform.trim() === '') {
      errors.push('Plataforma es requerida');
    }

    if (!this.email || this.email.trim() === '') {
      errors.push('Email es requerido');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Contraseña es requerida');
    }

    if (!this.isValidEmail(this.email)) {
      errors.push('Email debe ser válido');
    }

    // Validar plataformas soportadas
    const supportedPlatforms = ['workana', 'upwork', 'freelancer', 'fiverr'];
    if (!supportedPlatforms.includes(this.platform.toLowerCase())) {
      errors.push(`Plataforma no soportada. Plataformas válidas: ${supportedPlatforms.join(', ')}`);
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

  sanitizeText(text) {
    if (!text) return '';
    return text.replace(/[<>]/g, '');
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      platform: this.platform,
      email: this.email,
      sessionExpiresAt: this.sessionExpiresAt,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new ExternalCredential({
      id: row.id,
      user_id: row.user_id,
      platform: row.platform,
      email: row.email,
      password: row.password,
      session_data: row.session_data,
      session_expires_at: row.session_expires_at,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  toDatabaseInsert() {
    return {
      user_id: this.userId,
      platform: this.platform.toLowerCase(),
      email: this.email,
      password: this.password,
      session_data: this.sessionData,
      session_expires_at: this.sessionExpiresAt,
      is_active: this.isActive
    };
  }

  toDatabaseUpdate() {
    return {
      user_id: this.userId,
      platform: this.platform.toLowerCase(),
      email: this.email,
      password: this.password,
      session_data: this.sessionData,
      session_expires_at: this.sessionExpiresAt,
      is_active: this.isActive,
      updated_at: new Date()
    };
  }
}

module.exports = ExternalCredential; 