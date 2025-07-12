// Control Panel JavaScript Functions

// Global variables
let currentAction = null;
let actionCallback = null;


// ===== SYSTEM HEALTH FUNCTIONS =====

// Check system health
async function checkSystemHealth() {
    try {
        const result = await api.getSystemHealth();
        
        if (result.success) {
            updateHealthStatus(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error checking system health:', error);
        updateHealthStatus({ error: true });
    }
}

// Update health status display
function updateHealthStatus(health) {
    if (health.error) {
        // Set all to error state
        ['dbStatus', 'aiStatus', 'telegramStatus', 'scrapersStatus'].forEach(id => {
            document.getElementById(id).textContent = '❌ Error';
            document.getElementById(id).className = 'health-status error';
        });
        return;
    }
    
    // Database status (projects service)
    const dbStatus = document.getElementById('dbStatus');
    if (health.services?.projects?.healthy) {
        dbStatus.textContent = '✅ Conectada';
        dbStatus.className = 'health-status success';
    } else {
        dbStatus.textContent = '❌ Desconectada';
        dbStatus.className = 'health-status error';
    }
    
    // AI service status
    const aiStatus = document.getElementById('aiStatus');
    if (health.services?.ai?.healthy) {
        aiStatus.textContent = '✅ Disponible';
        aiStatus.className = 'health-status success';
    } else {
        aiStatus.textContent = '❌ No disponible';
        aiStatus.className = 'health-status error';
    }
    
    // Telegram status (notifications service)
    const telegramStatus = document.getElementById('telegramStatus');
    if (health.services?.notifications?.healthy) {
        telegramStatus.textContent = '✅ Disponible';
        telegramStatus.className = 'health-status success';
    } else {
        telegramStatus.textContent = '❌ No disponible';
        telegramStatus.className = 'health-status error';
    }
    
    // Scrapers status (simplified - we'll show overall status)
    const scrapersStatus = document.getElementById('scrapersStatus');
    if (health.overall?.healthy) {
        scrapersStatus.textContent = '✅ Workana | ✅ Upwork';
        scrapersStatus.className = 'health-status success';
    } else {
        scrapersStatus.textContent = '❌ Workana | ❌ Upwork';
        scrapersStatus.className = 'health-status error';
    }
    
    // Log the health data for debugging
    console.log('Health check data:', health);
}

// ===== MANUAL OPERATIONS FUNCTIONS =====

// Run manual scraping
async function runManualScraping() {
    showConfirmModal(
        'Scraping Manual',
        '¿Estás seguro de que quieres ejecutar el scraping manual?',
        async () => {
            try {
                Utils.showAlert('Ejecutando scraping manual...', 'info');
                
                const result = await api.runManualScraping();
                
                if (result.success) {
                    Utils.showAlert('✅ Scraping manual completado', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                Utils.showAlert(`❌ Error en scraping manual: ${error.message}`, 'error');
            }
        }
    );
}

// Run cleanup
async function runCleanup() {
    showConfirmModal(
        'Limpieza de Datos',
        '¿Estás seguro de que quieres ejecutar la limpieza de datos? Esta operación puede tomar varios minutos.',
        async () => {
            try {
                Utils.showAlert('Ejecutando limpieza de datos...', 'info');
                
                const result = await api.runCleanup();
                
                if (result.success) {
                    Utils.showAlert('✅ Limpieza completada', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                Utils.showAlert(`❌ Error en limpieza: ${error.message}`, 'error');
            }
        }
    );
}

// Generate reports
async function generateReports() {
    try {
        Utils.showAlert('Generando reportes...', 'info');
        
        const result = await api.generateReports();
        
        if (result.success) {
            Utils.showAlert('✅ Reportes generados correctamente', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        Utils.showAlert(`❌ Error generando reportes: ${error.message}`, 'error');
    }
}

// ===== LOGS FUNCTIONS =====

// Refresh logs
async function refreshLogs() {
    try {
        await Promise.all([
            loadAppLogs(),
            loadErrorLogs()
        ]);
    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}


// Load app logs
async function loadAppLogs() {
    try {
        const result = await api.getAppLogs();
        const content = document.getElementById('appLogContent');
        
        if (result.success) {
            content.textContent = result.data || 'No hay logs disponibles';
        } else {
            content.textContent = 'Error cargando logs de la aplicación';
        }
    } catch (error) {
        document.getElementById('appLogContent').textContent = 'Error cargando logs de la aplicación';
    }
}

// Load error logs
async function loadErrorLogs() {
    try {
        const result = await api.getErrorLogs();
        const content = document.getElementById('errorLogContent');
        
        if (result.success) {
            content.textContent = result.data || 'No hay logs de errores';
        } else {
            content.textContent = 'Error cargando logs de errores';
        }
    } catch (error) {
        document.getElementById('errorLogContent').textContent = 'Error cargando logs de errores';
    }
}

// Clear logs
async function clearLogs() {
    showConfirmModal(
        'Limpiar Logs',
        '¿Estás seguro de que quieres limpiar todos los logs? Esta acción no se puede deshacer.',
        async () => {
            try {
                Utils.showAlert('Limpiando logs...', 'info');
                
                const result = await api.clearLogs();
                
                if (result.success) {
                    Utils.showAlert('✅ Logs limpiados correctamente', 'success');
                    await refreshLogs();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                Utils.showAlert(`❌ Error limpiando logs: ${error.message}`, 'error');
            }
        }
    );
}

// Download current logs
async function downloadCurrentLogs() {
    try {
        // Get the currently active tab
        const activeTab = document.querySelector('.tab-button.active');
        if (!activeTab) {
            Utils.showAlert('❌ No hay tab activo seleccionado', 'error');
            return;
        }
        
        const activeTabText = activeTab.textContent.trim();
        let logType = 'app';
        let fileName = 'app_logs.txt';
        
        // Determine log type based on active tab
        if (activeTabText.includes('App')) {
            logType = 'app';
            fileName = 'app_logs.txt';
        } else if (activeTabText.includes('Error')) {
            logType = 'error';
            fileName = 'error_logs.txt';
        }
        
        Utils.showAlert('📥 Descargando logs...', 'info');
        
        // Get the logs data
        let result;
        switch (logType) {
            case 'app':
                result = await api.getAppLogs();
                break;
            case 'error':
                result = await api.getErrorLogs();
                break;
            default:
                throw new Error('Tipo de log no válido');
        }
        
        if (result.success) {
            const logContent = result.data || 'No hay logs disponibles';
            
            // Create and download the file
            const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // Add timestamp to filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const finalFileName = `${timestamp}_${fileName}`;
            
            link.href = url;
            link.download = finalFileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(url);
            
            Utils.showAlert('✅ Logs descargados correctamente', 'success');
        } else {
            throw new Error(result.error || 'Error obteniendo logs');
        }
    } catch (error) {
        Utils.showAlert(`❌ Error descargando logs: ${error.message}`, 'error');
    }
}

// Download all logs at once
async function downloadAllLogs() {
    try {
        Utils.showAlert('📥 Descargando todos los logs...', 'info');
        
        // Get all logs in parallel
        const [appResult, errorResult] = await Promise.all([
            api.getAppLogs(),
            api.getErrorLogs()
        ]);
        
        // Create combined log content
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let combinedContent = `# Logs del Sistema - ${new Date().toLocaleString()}\n\n`;
        
        // Add app logs
        combinedContent += '\n\n==========================================\n';
        combinedContent += '=               APP LOGS                =\n';
        combinedContent += '==========================================\n\n';
        if (appResult.success) {
            combinedContent += appResult.data || 'No hay logs de aplicación disponibles';
        } else {
            combinedContent += 'Error obteniendo logs de la aplicación';
        }
        
        // Add error logs
        combinedContent += '\n\n==========================================\n';
        combinedContent += '=              ERROR LOGS               =\n';
        combinedContent += '==========================================\n\n';
        if (errorResult.success) {
            combinedContent += errorResult.data || 'No hay logs de errores disponibles';
        } else {
            combinedContent += 'Error obteniendo logs de errores';
        }
        
        // Create and download the file
        const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const fileName = `${timestamp}_all_logs.txt`;
        
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        
        Utils.showAlert('✅ Todos los logs descargados correctamente', 'success');
    } catch (error) {
        Utils.showAlert(`❌ Error descargando todos los logs: ${error.message}`, 'error');
    }
}

// Toggle download menu
function toggleDownloadMenu() {
    const menu = document.getElementById('downloadMenu');
    menu.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdownWrapper = document.querySelector('.dropdown-wrapper');
    const menu = document.getElementById('downloadMenu');
    
    if (menu && !dropdownWrapper.contains(event.target)) {
        menu.classList.remove('show');
    }
});

// Show log tab
function showLogTab(tabName) {
    // Hide all log contents
    document.querySelectorAll('.log-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + 'Logs').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// ===== MODAL FUNCTIONS =====

// Show confirmation modal
function showConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'block';
    
    currentAction = callback;
}

// Close confirmation modal
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

// Confirm action
function confirmAction() {
    if (currentAction) {
        currentAction();
    }
    closeConfirmModal();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeConfirmModal();
    }
}