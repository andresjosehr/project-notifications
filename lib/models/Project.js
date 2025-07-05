class Project {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.price = data.price || null;
    this.link = data.link || '';
    this.platform = data.platform || '';
    this.skills = data.skills || [];
    this.info = data.info || '';
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
      skills: this.skills,
      info: this.info,
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
      skills: row.skills ? JSON.parse(row.skills) : [],
      info: row.info,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  toDatabaseInsert() {
    return {
      title: this.title,
      description: this.description,
      price: this.price,
      link: this.link,
      skills: JSON.stringify(this.skills),
      info: this.info
    };
  }
}

module.exports = Project; 