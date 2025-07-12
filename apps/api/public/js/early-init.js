// Early initialization script - loads in <head> to prevent flickering
(function() {
    // Check if user is authenticated and get role
    function getUserRole() {
        try {
            const userData = localStorage.getItem('userInfo');
            if (userData) {
                const user = JSON.parse(userData);
                return user.role;
            }
        } catch (e) {
            console.warn('Error parsing user data:', e);
        }
        return null;
    }

    function isAuthenticated() {
        const token = localStorage.getItem('authToken');
        return token && token.length > 0;
    }

    // Hide admin navigation immediately for non-admin users
    function hideAdminNavigation() {
        if (isAuthenticated() && getUserRole() !== 'ADMIN') {
            const style = document.createElement('style');
            style.id = 'admin-nav-hide';
            style.textContent = `
                a[href="users.html"], 
                a[href="control.html"] {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Execute immediately
    hideAdminNavigation();

    // Also execute when DOM is ready (in case script loads after DOM)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideAdminNavigation);
    } else {
        hideAdminNavigation();
    }
})();