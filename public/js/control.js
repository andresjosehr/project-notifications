// Control Panel JavaScript Functions

// Global variables
let currentAction = null;
let actionCallback = null;

// ===== DAEMON MANAGEMENT FUNCTIONS =====

// Start daemon function
async function startDaemon() {
    showConfirmModal(
        'Iniciar Daemon',
        '¿Estás seguro de que quieres iniciar el daemon de Workana? Esto ejecutará el scraping en modo continuo.',
        async () => {
            try {
                Utils.showAlert('Iniciando daemon...', 'info');
                
                const result = await api.startDaemon();
                
                if (result.success) {
                    Utils.showAlert('✅ Daemon iniciado correctamente', 'success');
                    updateDaemonStartStatus('✅ Ejecutándose', 'success');
                    // Refresh status after a short delay to ensure daemon is fully started
                    setTimeout(refreshDaemonStatus, 1000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                Utils.showAlert(`❌ Error iniciando daemon: ${error.message}`, 'error');
                updateDaemonStartStatus('❌ Error', 'error');
            }
        }
    );
}

// Stop daemon function
async function stopDaemon() {
    showConfirmModal(
        'Detener Daemon',
        '¿Estás seguro de que quieres detener el daemon de Workana? El scraping se detendrá.',
        async () => {
            try {
                Utils.showAlert('Deteniendo daemon...', 'info');
                
                const result = await api.stopDaemon();
                
                if (result.success) {
                    Utils.showAlert('✅ Daemon detenido correctamente', 'success');
                    updateDaemonStopStatus('✅ Detenido', 'success');
                    // Refresh status after a short delay to ensure daemon is fully stopped
                    setTimeout(refreshDaemonStatus, 1000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                Utils.showAlert(`❌ Error deteniendo daemon: ${error.message}`, 'error');
                updateDaemonStopStatus('❌ Error', 'error');
            }
        }
    );
}

// Get daemon status function
async function getDaemonStatus() {
    try {
        Utils.showAlert('Obteniendo estado del daemon...', 'info');
        
        const result = await api.getDaemonStatus();
        
        if (result.success) {
            Utils.showAlert('✅ Estado del daemon obtenido', 'success');
            updateDaemonMonitorStatus('✅ Monitoreado', 'success');
            displayDaemonDetails(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        Utils.showAlert(`❌ Error obteniendo estado del daemon: ${error.message}`, 'error');
        updateDaemonMonitorStatus('❌ Error', 'error');
    }
}

// Configure daemon function
async function configureDaemon() {
    try {
        Utils.showAlert('Configurando daemon...', 'info');
        
        const result = await api.configureDaemon();
        
        if (result.success) {
            Utils.showAlert('✅ Daemon configurado correctamente', 'success');
            updateDaemonConfigStatus('✅ Configurado', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        Utils.showAlert(`❌ Error configurando daemon: ${error.message}`, 'error');
        updateDaemonConfigStatus('❌ Error', 'error');
    }
}



// Refresh daemon status
async function refreshDaemonStatus() {
    try {
        const result = await api.getDaemonStatus();
        
        if (result.success) {
            updateDaemonStatusDisplay(result.data);
            updateDaemonCardStates(result.data);
        }
    } catch (error) {
        console.error('Error refreshing daemon status:', error);
    }
}

// Update daemon status displays
function updateDaemonStartStatus(text, type) {
    const element = document.getElementById('daemonStartStatus');
    element.innerHTML = `<span class="status-indicator ${type}">${text}</span>`;
}

function updateDaemonStopStatus(text, type) {
    const element = document.getElementById('daemonStopStatus');
    element.innerHTML = `<span class="status-indicator ${type}">${text}</span>`;
}

function updateDaemonMonitorStatus(text, type) {
    const element = document.getElementById('daemonMonitorStatus');
    element.innerHTML = `<span class="status-indicator ${type}">${text}</span>`;
}

function updateDaemonConfigStatus(text, type) {
    const element = document.getElementById('daemonConfigStatus');
    element.innerHTML = `<span class="status-indicator ${type}">${text}</span>`;
}

function updateDaemonStatusDisplay(status) {
    const daemonStatusElement = document.getElementById('daemonStatus');
    if (status.active) {
        daemonStatusElement.textContent = '✅ Activo';
        daemonStatusElement.className = 'stat-number success';
    } else {
        daemonStatusElement.textContent = '❌ Inactivo';
        daemonStatusElement.className = 'stat-number error';
    }
}

// Update daemon card states based on current status
function updateDaemonCardStates(status) {
    if (status.active) {
        // Daemon is running
        updateDaemonStartStatus('✅ Ejecutándose', 'success');
        updateDaemonStopStatus('⏳ Disponible', 'info');
        updateDaemonMonitorStatus('✅ Monitoreando', 'success');
        updateDaemonConfigStatus('✅ Configurado', 'success');
    } else {
        // Daemon is not running
        updateDaemonStartStatus('⏳ No iniciado', 'info');
        updateDaemonStopStatus('⏳ Sin acción', 'info');
        updateDaemonMonitorStatus('⏳ Sin monitorear', 'info');
        updateDaemonConfigStatus('⏳ Sin configurar', 'info');
    }
}

// Display daemon details
function displayDaemonDetails(details) {
    const detailsSection = document.getElementById('daemonDetails');
    const content = document.getElementById('daemonDetailsContent');
    
    let html = `
        <div class="status-grid">
            <div class="status-item">
                <strong>Estado:</strong> ${details.active ? '✅ Activo' : '❌ Inactivo'}
            </div>
            <div class="status-item">
                <strong>Última ejecución:</strong> ${details.lastExecution || 'N/A'}
            </div>
            <div class="status-item">
                <strong>Ejecuciones hoy:</strong> ${details.todayExecutions || '0'}
            </div>
            <div class="status-item">
                <strong>Intervalo:</strong> ${details.interval || 'N/A'}
            </div>
            <div class="status-item">
                <strong>Tiempo máximo:</strong> ${details.maxTime || 'N/A'}
            </div>
            <div class="status-item">
                <strong>Notificaciones:</strong> ${details.notifications ? '✅ Activadas' : '❌ Desactivadas'}
            </div>
        </div>
    `;
    
    if (details.recentExecutions && details.recentExecutions.length > 0) {
        html += `
            <div class="recent-executions">
                <h4>📈 Últimas ejecuciones:</h4>
                <div class="execution-list">
        `;
        
        details.recentExecutions.forEach(exec => {
            html += `
                <div class="execution-item">
                    <span class="execution-time">${exec.time}</span>
                    <span class="execution-status ${exec.success ? 'success' : 'error'}">
                        ${exec.success ? '✅' : '❌'} ${exec.message}
                    </span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    detailsSection.style.display = 'block';
}

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
            loadDaemonLogs(),
            loadAppLogs(),
            loadErrorLogs()
        ]);
    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}

// Load daemon logs
async function loadDaemonLogs() {
    try {
        const result = await api.getDaemonLogs();
        const content = document.getElementById('daemonLogContent');
        
        if (result.success) {
            content.textContent = result.data || 'No hay logs disponibles';
        } else {
            content.textContent = 'Error cargando logs del daemon';
        }
    } catch (error) {
        document.getElementById('daemonLogContent').textContent = 'Error cargando logs del daemon';
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