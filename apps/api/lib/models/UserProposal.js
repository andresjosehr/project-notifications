class UserProposal {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.user_id || null;
    this.projectId = data.project_id || null;
    this.projectPlatform = data.project_platform || 'workana';
    this.proposalSentAt = data.proposal_sent_at || new Date();
    this.proposalContent = data.proposal_content || '';
    this.status = data.status || 'sent';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  validate() {
    const errors = [];

    if (!this.userId || this.userId <= 0) {
      errors.push('ID de usuario es requerido');
    }

    if (!this.projectId || this.projectId <= 0) {
      errors.push('ID de proyecto es requerido');
    }

    if (!this.projectPlatform || this.projectPlatform.trim() === '') {
      errors.push('Plataforma del proyecto es requerida');
    }

    if (!['workana', 'upwork'].includes(this.projectPlatform.toLowerCase())) {
      errors.push('Plataforma debe ser "workana" o "upwork"');
    }

    if (!['sent', 'accepted', 'rejected', 'pending'].includes(this.status)) {
      errors.push('Estado debe ser "sent", "accepted", "rejected" o "pending"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      projectId: this.projectId,
      projectPlatform: this.projectPlatform,
      proposalSentAt: this.proposalSentAt,
      proposalContent: this.proposalContent,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new UserProposal({
      id: row.id,
      user_id: row.user_id,
      project_id: row.project_id,
      project_platform: row.project_platform,
      proposal_sent_at: row.proposal_sent_at,
      proposal_content: row.proposal_content,
      status: row.status,
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
      user_id: this.userId,
      project_id: this.projectId,
      project_platform: this.projectPlatform,
      proposal_sent_at: this.proposalSentAt,
      proposal_content: this.sanitizeText(this.proposalContent),
      status: this.status
    };
  }

  toDatabaseUpdate() {
    return {
      user_id: this.userId,
      project_id: this.projectId,
      project_platform: this.projectPlatform,
      proposal_sent_at: this.proposalSentAt,
      proposal_content: this.sanitizeText(this.proposalContent),
      status: this.status,
      updated_at: new Date()
    };
  }

  static createFromProposal(userId, projectId, platform, proposalContent) {
    return new UserProposal({
      user_id: userId,
      project_id: projectId,
      project_platform: platform,
      proposal_content: proposalContent,
      status: 'sent'
    });
  }
}

module.exports = UserProposal;