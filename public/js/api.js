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

        // Add JWT token to protected endpoints
        if (this.isProtectedEndpoint(endpoint)) {
            const token = this.getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                // Redirect to login if no token available
                this.redirectToLogin();
                return;
            }
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();
            
            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    this.handleAuthError();
                    return;
                }
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Check if endpoint requires authentication
    isProtectedEndpoint(endpoint) {
        const publicEndpoints = [
            '/auth/login',
            '/health'
        ];
        
        // Remove /api prefix for comparison if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        return !publicEndpoints.some(publicEndpoint => {
            return cleanEndpoint === publicEndpoint;
        });
    }

    // Get authentication token
    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // Handle authentication errors
    handleAuthError() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        this.redirectToLogin();
    }

    // Redirect to login page
    redirectToLogin() {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
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

    async getActiveUsers() {
        return this.get('/users/active');
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

    async sendProposal(projectId, userId, options = {}) {
        return this.post('/workana/proposal', {
            projectId,
            userId,
            ...options
        });
    }

    // System
    async getHealth() {
        // Health endpoint is at /health (not /api/health)
        const url = '/health';
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    async getStatus() {
        return this.get('/status');
    }

    async getSystemHealth() {
        return this.get('/system/health');
    }

    async cleanup() {
        return this.post('/cleanup');
    }

    // === CONTROL PANEL API METHODS ===

    // Daemon Management
    async startDaemon() {
        return this.post('/daemon/start');
    }

    async stopDaemon() {
        return this.post('/daemon/stop');
    }

    async getDaemonStatus() {
        return this.get('/daemon/status');
    }

    async configureDaemon(config = {}) {
        return this.post('/daemon/configure', config);
    }

    // Daemon Management
    async startDaemon() {
        return this.post('/daemon/start');
    }

    async stopDaemon() {
        return this.post('/daemon/stop');
    }

    async getDaemonStatus() {
        return this.get('/daemon/status');
    }

    // System Health & Stats
    async getSystemHealth() {
        return this.get('/system/health');
    }

    async getSystemStats() {
        return this.get('/system/stats');
    }

    // Manual Operations
    async runManualScraping(options = {}) {
        return this.post('/operations/scraping', options);
    }

    async runCleanup() {
        return this.post('/operations/cleanup');
    }

    async generateReports() {
        return this.post('/operations/reports');
    }

    // Logs Management
    async getDaemonLogs() {
        return this.get('/logs/daemon');
    }

    async getAppLogs() {
        return this.get('/logs/app');
    }

    async getErrorLogs() {
        return this.get('/logs/error');
    }

    async clearLogs() {
        return this.post('/logs/clear');
    }

    // Authentication Methods
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = '/login.html';
    }

    // Generate proposal only (for review flow)
    async generateProposal(projectId, userId, options = {}) {
        return this.post('/proposal/generate', {
            projectId,
            userId,
            ...options
        });
    }

    // Send proposal with custom content
    async sendProposalWithCustomContent(projectId, userId, proposalContent, options = {}) {
        return this.post('/proposal/send', {
            projectId,
            userId,
            proposalContent,
            ...options
        });
    }

    // Get project by ID
    async getProjectById(projectId) {
        return this.get(`/project/${projectId}`);
    }

    // Get user by ID
    async getUserById(userId) {
        return this.get(`/user/${userId}`);
    }

    async generateAccessToken(projectId, platform, userId) {
        return this.post('/auth/generate-access-token', {
            projectId,
            platform,
            userId
        });
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getAuthToken();
        return token && token.length > 0;
    }

    // Get current user info
    getCurrentUser() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
}

// Create global API client instance
const api = new ApiClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}