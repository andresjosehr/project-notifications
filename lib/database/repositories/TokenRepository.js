const db = require('../connection');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class TokenRepository {
    constructor() {
        this.tableName = 'registration_tokens';
    }

    async execute(query, params = []) {
        try {
            return await db.query(query, params);
        } catch (error) {
            logger.errorWithStack('Database query error', error);
            throw error;
        }
    }

    /**
     * Generate a unique registration token
     * @param {number} adminId - ID of the admin creating the token
     * @returns {Promise<Object>} Token object with token string
     */
    async generateToken(adminId) {
        const token = crypto.randomBytes(32).toString('hex');
        
        const query = `
            INSERT INTO ${this.tableName} (token, created_by_admin) 
            VALUES (?, ?)
        `;
        
        const result = await this.execute(query, [token, adminId]);
        
        return {
            id: result.insertId,
            token: token,
            isUsed: false,
            createdAt: new Date(),
            createdByAdmin: adminId
        };
    }

    /**
     * Get token by token string
     * @param {string} token - Token string
     * @returns {Promise<Object|null>} Token object or null
     */
    async getByToken(token) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE token = ?
        `;
        
        const rows = await this.execute(query, [token]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return this.formatTokenData(rows[0]);
    }

    /**
     * Mark token as used
     * @param {string} token - Token string
     * @param {number} userId - ID of the user who used the token
     * @returns {Promise<boolean>} Success status
     */
    async markAsUsed(token, userId) {
        const query = `
            UPDATE ${this.tableName} 
            SET is_used = true, used_at = NOW(), registered_user_id = ?
            WHERE token = ? AND is_used = false
        `;
        
        const result = await this.execute(query, [userId, token]);
        return result.affectedRows > 0;
    }

    /**
     * Check if token is valid (exists and not used)
     * @param {string} token - Token string
     * @returns {Promise<boolean>} Validity status
     */
    async isValidToken(token) {
        const query = `
            SELECT id FROM ${this.tableName} 
            WHERE token = ? AND is_used = false
        `;
        
        const rows = await this.execute(query, [token]);
        return rows.length > 0;
    }

    /**
     * Get all tokens with pagination
     * @param {number} offset - Offset for pagination
     * @param {number} limit - Limit for pagination
     * @returns {Promise<Array>} Array of token objects
     */
    async getAllTokens(offset = 0, limit = 50) {
        const query = `
            SELECT rt.*, u.email as registered_user_email, a.email as created_by_email
            FROM ${this.tableName} rt
            LEFT JOIN users u ON rt.registered_user_id = u.id
            LEFT JOIN users a ON rt.created_by_admin = a.id
            ORDER BY rt.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const rows = await this.execute(query, [limit, offset]);
        return rows.map(row => this.formatTokenData(row));
    }

    /**
     * Get token statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getTokenStats() {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_used = false THEN 1 ELSE 0 END) as unused,
                SUM(CASE WHEN is_used = true THEN 1 ELSE 0 END) as used,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as created_this_week
            FROM ${this.tableName}
        `;
        
        const rows = await this.execute(query);
        return rows[0] || { total: 0, unused: 0, used: 0, created_this_week: 0 };
    }

    /**
     * Delete unused tokens older than specified days
     * @param {number} days - Number of days
     * @returns {Promise<number>} Number of deleted tokens
     */
    async cleanupOldTokens(days = 30) {
        const query = `
            DELETE FROM ${this.tableName} 
            WHERE is_used = false 
            AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        const result = await this.execute(query, [days]);
        return result.affectedRows;
    }

    /**
     * Delete specific token by ID
     * @param {number} tokenId - Token ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteToken(tokenId) {
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.execute(query, [tokenId]);
        return result.affectedRows > 0;
    }

    /**
     * Format token data from database
     * @private
     */
    formatTokenData(row) {
        return {
            id: row.id,
            token: row.token,
            isUsed: !!row.is_used,
            createdAt: row.created_at,
            usedAt: row.used_at,
            createdByAdmin: row.created_by_admin,
            registeredUserId: row.registered_user_id,
            registeredUserEmail: row.registered_user_email || null,
            createdByEmail: row.created_by_email || null
        };
    }
}

module.exports = TokenRepository;