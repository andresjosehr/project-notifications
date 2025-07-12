class Project {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.price = data.price || null;
    this.link = data.link || '';
    this.platform = data.platform || '';
    this.language = data.language || '';
    this.skills = data.skills || [];
    this.info = data.info || '';
    this.clientName = data.client_name || '';
    this.clientCountry = data.client_country || '';
    this.clientRating = data.client_rating || 0;
    this.paymentVerified = data.payment_verified || false;
    this.isFeatured = data.is_featured || false;
    this.isMaxProject = data.is_max_project || false;
    this.date = data.date || '';
    this.timeAgo = data.time_ago || '';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  validate() {
    const errors = [];

    if (!this.title || this.title.trim() === '') {
      errors.push('Título es requerido');
    }

    if (!this.description || this.description.trim() === '') {
      errors.push('Descripción es requerida');
    }

    if (!this.link || this.link.trim() === '') {
      errors.push('Link es requerido');
    }

    if (!this.platform || this.platform.trim() === '') {
      errors.push('Plataforma es requerida');
    }

    if (!this.isValidUrl(this.link)) {
      errors.push('Link debe ser una URL válida');
    }

    if (!['workana', 'upwork'].includes(this.platform.toLowerCase())) {
      errors.push('Plataforma debe ser "workana" o "upwork"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      price: this.price,
      link: this.link,
      platform: this.platform,
      language: this.language,
      skills: this.skills,
      info: this.info,
      clientName: this.clientName,
      clientCountry: this.clientCountry,
      clientRating: this.clientRating,
      paymentVerified: this.paymentVerified,
      isFeatured: this.isFeatured,
      isMaxProject: this.isMaxProject,
      date: this.date,
      timeAgo: this.timeAgo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new Project({
      id: row.id,
      title: row.title,
      description: row.description,
      price: row.price,
      link: row.link,
      platform: row.platform || 'workana',
      language: row.language || '',
      skills: row.skills ? (typeof row.skills === 'string' ? row.skills : JSON.stringify(row.skills)) : '',
      info: row.info,
      client_name: row.client_name || '',
      client_country: row.client_country || '',
      client_rating: row.client_rating || 0,
      payment_verified: row.payment_verified || false,
      is_featured: row.is_featured || false,
      is_max_project: row.is_max_project || false,
      date: row.date || '',
      time_ago: row.time_ago || '',
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
      title: this.sanitizeText(this.title),
      description: this.sanitizeText(this.description),
      price: this.price,
      link: this.link,
      language: this.language || '',
      skills: typeof this.skills === 'string' ? this.skills : JSON.stringify(this.skills),
      client_name: this.sanitizeText(this.clientName),
      client_country: this.sanitizeText(this.clientCountry),
      client_rating: this.clientRating || 0,
      payment_verified: this.paymentVerified || false,
      is_featured: this.isFeatured || false,
      is_max_project: this.isMaxProject || false,
      date: this.date || null,
      time_ago: this.timeAgo || null
    };
  }
}

module.exports = Project; 