// Sistema de Notificaciones Freelance v2.0 - API Client

class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET',
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // PATCH request
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }

    // User Management
    async getUsers() {
        return this.get('/users');
    }

    async getUserById(id) {
        return this.get(`/users/${id}`);
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(id, userData) {
        return this.put(`/users/${id}`, userData);
    }

    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }

    async toggleUserStatus(id, isActive) {
        return this.patch(`/users/${id}/status`, { is_active: isActive });
    }

    async getUserStats() {
        return this.get('/users/stats');
    }

    // Project Management
    async getProjects(params = {}) {
        return this.get('/projects', params);
    }

    async getProjectById(id) {
        return this.get(`/projects/${id}`);
    }

    async getProjectStats(platform = null) {
        const params = platform ? { platform } : {};
        return this.get('/stats', params);
    }

    async getRecentProjects(params = {}) {
        return this.get('/projects/recent', params);
    }

    async searchProjects(params = {}) {
        return this.get('/projects/search', params);
    }

    // Scraping Operations
    async scrapeWorkana(options = {}) {
        return this.post('/workana/scrape', options);
    }

    async scrapeUpwork(options = {}) {
        return this.post('/upwork/scrape', options);
    }

    async scrapeSingle(options = {}) {
        return this.post('/scrape/single', options);
    }

    async scrapeContinuous(options = {}) {
        return this.post('/scrape/continuous', options);
    }

    // Workana Management
    async workanaLogin(credentials) {
        return this.post('/workana/login', credentials);
    }

    async workanaProposal(data) {
        return this.post('/workana/proposal', data);
    }

    // Proposal Management
    async generateProposal(data) {
        return this.post('/proposal/generate', data);
    }

    // System
    async getHealth() {
        return this.get('/health');
    }

    async getStatus() {
        return this.get('/status');
    }

    async cleanup() {
        return this.post('/cleanup');
    }
}

// Create global API client instance
const api = new ApiClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}