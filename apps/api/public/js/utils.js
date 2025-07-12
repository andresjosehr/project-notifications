// Sistema de Notificaciones Freelance v2.0 - Utilities

class Utils {
    // Date formatting
    static formatDate(date, options = {}) {
        const defaults = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const config = { ...defaults, ...options };
        return new Date(date).toLocaleDateString('es-ES', config);
    }

    // Relative time formatting
    static formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) {
            return 'hace unos segundos';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `hace ${days} día${days > 1 ? 's' : ''}`;
        }
    }

    // Currency formatting
    static formatCurrency(amount, currency = 'USD') {
        if (!amount && amount !== 0) return 'No especificado';
        
        try {
            return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (error) {
            return `${currency} ${amount}`;
        }
    }

    // Text truncation
    static truncate(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Capitalize first letter
    static capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Slugify text
    static slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Generate random ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Copy to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    // Download data as file
    static downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Local storage helpers
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to set localStorage:', error);
            return false;
        }
    }

    static getStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Failed to get localStorage:', error);
            return defaultValue;
        }
    }

    static removeStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove localStorage:', error);
            return false;
        }
    }

    // URL parameter helpers
    static getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    static setUrlParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.replaceState({}, '', url);
    }

    static removeUrlParam(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.replaceState({}, '', url);
    }

    // Platform-specific helpers
    static getPlatformBadge(platform) {
        switch (platform?.toLowerCase()) {
            case 'workana':
                return '<span class="platform-badge platform-workana">Workana</span>';
            case 'upwork':
                return '<span class="platform-badge platform-upwork">Upwork</span>';
            default:
                return '<span class="platform-badge">Desconocido</span>';
        }
    }

    static getStatusBadge(status) {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'activo':
                return '<span class="status-badge status-active">Activo</span>';
            case 'inactive':
            case 'inactivo':
                return '<span class="status-badge status-inactive">Inactivo</span>';
            case 'pending':
            case 'pendiente':
                return '<span class="status-badge status-pending">Pendiente</span>';
            case 'processing':
            case 'procesando':
                return '<span class="status-badge status-processing">Procesando</span>';
            default:
                return '<span class="status-badge">Desconocido</span>';
        }
    }

    // Array helpers
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    static sortBy(array, key, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Number formatting
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // HTML escaping
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // DOM helpers
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    // Event helpers
    static on(element, event, handler) {
        element.addEventListener(event, handler);
    }

    static off(element, event, handler) {
        element.removeEventListener(event, handler);
    }

    static once(element, event, handler) {
        const onceHandler = (e) => {
            handler(e);
            element.removeEventListener(event, onceHandler);
        };
        element.addEventListener(event, onceHandler);
    }

    // Loading state helpers
    static showLoading(container, message = 'Cargando...') {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div>${message}</div>
            </div>
        `;
    }

    static hideLoading(container) {
        const loading = container.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }

    // Alert helpers
    static showAlert(message, type = 'info', duration = 5000) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <span class="alert-message">${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        // Add styles for alert
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;

        // Add alert styles based on type
        switch (type) {
            case 'success':
                alert.style.backgroundColor = '#d4edda';
                alert.style.color = '#155724';
                alert.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                alert.style.backgroundColor = '#f8d7da';
                alert.style.color = '#721c24';
                alert.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                alert.style.backgroundColor = '#fff3cd';
                alert.style.color = '#856404';
                alert.style.border = '1px solid #ffeaa7';
                break;
            case 'info':
            default:
                alert.style.backgroundColor = '#d1ecf1';
                alert.style.color = '#0c5460';
                alert.style.border = '1px solid #bee5eb';
                break;
        }

        // Add alert content styles
        const alertContent = alert.querySelector('.alert-content');
        alertContent.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        `;

        // Add close button styles
        const closeBtn = alert.querySelector('.alert-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';

        // Add slideIn animation
        if (!document.querySelector('#alert-styles')) {
            const style = document.createElement('style');
            style.id = 'alert-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Add to page
        document.body.appendChild(alert);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alert.parentElement) {
                    alert.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => {
                        if (alert.parentElement) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, duration);
        }

        return alert;
    }

    static hideAlert(alertElement) {
        if (alertElement && alertElement.parentElement) {
            alertElement.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (alertElement.parentElement) {
                    alertElement.remove();
                }
            }, 300);
        }
    }

    static clearAllAlerts() {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => this.hideAlert(alert));
    }

    // Authentication helpers
    static getAuthToken() {
        return localStorage.getItem('authToken');
    }

    static setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    static removeAuthToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
    }

    static isAuthenticated() {
        const token = this.getAuthToken();
        return token && token.length > 0;
    }

    static getUserInfo() {
        return this.getStorage('userInfo');
    }

    static setUserInfo(userInfo) {
        this.setStorage('userInfo', userInfo);
    }

    static logout() {
        this.removeAuthToken();
        window.location.href = '/login.html';
    }

    static checkAuthRedirect() {
        if (!this.isAuthenticated()) {
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
        }
    }

    static redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            const urlParams = new URLSearchParams(window.location.search);
            // Default redirect based on user role
            let defaultRedirect = '/profile.html';
            if (this.isUserAdmin()) {
                defaultRedirect = '/control.html';
            }
            const redirect = urlParams.get('redirect') || defaultRedirect;
            window.location.href = redirect;
        }
    }

    // Check if user has admin role
    static isUserAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo.role === 'ADMIN';
    }

    // Check if user has user role
    static isUserRegular() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo.role === 'USER';
    }

    // Hide admin-only navigation elements for regular users
    static hideAdminNavigation() {
        if (!this.isUserAdmin()) {
            // Hide admin navigation links immediately
            const adminLinks = document.querySelectorAll('a[href="users.html"], a[href="control.html"]');
            adminLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
    }

    // Initialize role-based navigation (call this ASAP)
    static initializeNavigation() {
        // Add CSS to hide admin elements initially for non-admin users
        if (this.isAuthenticated() && !this.isUserAdmin()) {
            const style = document.createElement('style');
            style.textContent = `
                a[href="users.html"], 
                a[href="control.html"] {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Check page access based on user role
    static checkPageAccess(requiredRole = null, redirectTo = 'projects.html') {
        if (!this.isAuthenticated()) {
            this.checkAuthRedirect();
            return false;
        }

        if (requiredRole === 'ADMIN' && !this.isUserAdmin()) {
            this.showAlert('Acceso denegado. Solo administradores pueden acceder a esta página.', 'error');
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 2000);
            return false;
        }

        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}