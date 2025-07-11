// Proposal Review JavaScript Functions

// Global variables
let currentProject = null;
let currentUser = null;
let originalProposal = '';
let isGenerating = false;
let isSending = false;

// URL parameters
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const userId = urlParams.get('userId');
const platform = urlParams.get('platform') || 'workana';

// Initialize proposal review
async function initializeProposalReview() {
    try {
        // Validate required parameters
        if (!projectId || !userId) {
            Utils.showAlert('❌ Faltan parámetros requeridos (projectId, userId)', 'error');
            setTimeout(() => {
                window.location.href = 'projects.html';
            }, 3000);
            return;
        }

        // Show loading state
        showLoadingState();

        // Load project data and generate proposal
        await Promise.all([
            loadProjectData(),
            loadUserData()
        ]);

        // Generate initial proposal
        await generateInitialProposal();

        // Initialize text editor
        initializeTextEditor();

        // Show proposal review section
        showProposalReview();

    } catch (error) {
        console.error('Error initializing proposal review:', error);
        Utils.showAlert(`❌ Error iniciando revisión: ${error.message}`, 'error');
    }
}

// Load project data
async function loadProjectData() {
    try {
        const result = await api.getProjectById(projectId);
        
        if (result.success && result.data) {
            currentProject = result.data;
            updateProjectDisplay();
        } else {
            throw new Error(result.error || 'Proyecto no encontrado');
        }
    } catch (error) {
        console.error('Error loading project data:', error);
        throw error;
    }
}

// Load user data
async function loadUserData() {
    try {
        const result = await api.getUserById(userId);
        
        if (result.success && result.data) {
            currentUser = result.data;
            updateUserDisplay();
        } else {
            throw new Error(result.error || 'Usuario no encontrado');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        throw error;
    }
}

// Generate initial proposal using AI
async function generateInitialProposal() {
    try {
        isGenerating = true;
        updateLoadingStatus('Generando propuesta con IA...');
        
        const result = await api.generateProposal(projectId, userId, {
            platform: platform
        });
        
        if (result.success && result.data) {
            originalProposal = result.data.proposal || result.data.content || '';
            document.getElementById('proposalContent').value = originalProposal;
            updateProposalStats();
            
            Utils.showAlert('✅ Propuesta generada exitosamente', 'success');
        } else {
            throw new Error(result.error || 'Error generando propuesta');
        }
    } catch (error) {
        console.error('Error generating proposal:', error);
        Utils.showAlert(`❌ Error generando propuesta: ${error.message}`, 'error');
        throw error;
    } finally {
        isGenerating = false;
    }
}

// Update project display
function updateProjectDisplay() {
    if (!currentProject) return;
    
    document.getElementById('projectTitle').textContent = currentProject.title || 'Sin título';
    document.getElementById('projectDate').textContent = Utils.formatDate(currentProject.createdAt);
    document.getElementById('projectBudget').textContent = currentProject.price || 'No especificado';
    document.getElementById('projectDeadline').textContent = currentProject.deadline || 'Sin fecha límite';
    document.getElementById('projectCategory').textContent = currentProject.skills || 'No especificado';
    
    // Mostrar descripción del proyecto
    document.getElementById('projectDescription').textContent = currentProject.description || 'Sin descripción disponible.';
    
    // Update platform badge
    const platformBadge = document.getElementById('projectPlatform');
    platformBadge.textContent = currentProject.platform || 'workana';
    platformBadge.className = `platform-badge platform-${currentProject.platform || 'workana'}`;
}

// Update user display
function updateUserDisplay() {
    if (!currentUser) return;
    
    document.getElementById('selectedUser').textContent = currentUser.clientName || 'Usuario desconocido';
}

// Initialize text editor
function initializeTextEditor() {
    const textarea = document.getElementById('proposalContent');
    
    // Add event listeners for real-time stats update
    textarea.addEventListener('input', updateProposalStats);
    textarea.addEventListener('keyup', updateProposalStats);
    textarea.addEventListener('paste', () => {
        setTimeout(updateProposalStats, 10);
    });
    
    // Initial stats update
    updateProposalStats();
}

// Update proposal statistics
function updateProposalStats() {
    const content = document.getElementById('proposalContent').value;
    
    // Character count
    document.getElementById('charCount').textContent = content.length;
    
    // Word count
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    document.getElementById('wordCount').textContent = words.length;
    
    // Line count
    const lines = content.split('\n').length;
    document.getElementById('lineCount').textContent = lines;
}

// Show loading state
function showLoadingState() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('proposalReviewSection').classList.add('hidden');
    document.getElementById('sendingState').classList.add('hidden');
}

// Show proposal review section
function showProposalReview() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('proposalReviewSection').classList.remove('hidden');
    document.getElementById('sendingState').classList.add('hidden');
}

// Show sending state
function showSendingState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('proposalReviewSection').classList.add('hidden');
    document.getElementById('sendingState').classList.remove('hidden');
}

// Update loading status
function updateLoadingStatus(message) {
    const loadingState = document.getElementById('loadingState');
    const statusElement = loadingState.querySelector('p');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Update sending status
function updateSendingStatus(message, details = '') {
    document.getElementById('sendingStatus').textContent = message;
    document.getElementById('sendingDetails').textContent = details;
}

// Regenerate proposal
async function regenerateProposal() {
    if (isGenerating) return;
    
    try {
        Utils.showAlert('🔄 Regenerando propuesta...', 'info');
        
        // Clear current content
        document.getElementById('proposalContent').value = '';
        
        // Generate new proposal
        await generateInitialProposal();
        
    } catch (error) {
        console.error('Error regenerating proposal:', error);
        Utils.showAlert(`❌ Error regenerando propuesta: ${error.message}`, 'error');
    }
}

// Reset to original proposal
function resetProposal() {
    if (originalProposal) {
        document.getElementById('proposalContent').value = originalProposal;
        updateProposalStats();
        Utils.showAlert('↩️ Propuesta restaurada al contenido original', 'info');
    } else {
        Utils.showAlert('❌ No hay propuesta original para restaurar', 'error');
    }
}

// Send proposal
async function sendProposal() {
    if (isSending) return;
    
    const proposalContent = document.getElementById('proposalContent').value.trim();
    
    if (!proposalContent) {
        Utils.showAlert('❌ La propuesta no puede estar vacía', 'error');
        return;
    }
    
    // Show confirmation modal
    showConfirmModal();
}

// Show confirmation modal
function showConfirmModal() {
    const proposalContent = document.getElementById('proposalContent').value;
    
    // Update modal content
    document.getElementById('confirmTitle').textContent = 'Confirmar Envío de Propuesta';
    document.getElementById('confirmMessage').textContent = 
        `¿Estás seguro de que quieres enviar esta propuesta para el proyecto "${currentProject?.title || 'Sin título'}"?`;
    
    // Show proposal preview (truncated)
    const preview = proposalContent.length > 200 
        ? proposalContent.substring(0, 200) + '...' 
        : proposalContent;
    
    document.getElementById('proposalPreview').innerHTML = `
        <div class="proposal-text">
            ${preview}
        </div>
        <div class="proposal-meta">
            <small>👤 Usuario: ${currentUser?.email || 'Desconocido'}</small><br>
            <small>📊 ${proposalContent.length} caracteres, ${proposalContent.split(/\s+/).filter(w => w.length > 0).length} palabras</small>
        </div>
    `;
    
    // Show modal
    document.getElementById('confirmModal').style.display = 'block';
}

// Close confirmation modal
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Confirm send
async function confirmSend() {
    closeConfirmModal();
    
    try {
        isSending = true;
        showSendingState();
        updateSendingStatus('Preparando envío...', 'Validando datos de la propuesta');
        
        const proposalContent = document.getElementById('proposalContent').value.trim();
        
        updateSendingStatus('Enviando propuesta...', 'Conectando con Workana');
        
        const result = await api.sendProposalWithCustomContent(
            projectId, 
            userId, 
            proposalContent, 
            { platform }
        );
        
        if (result.success) {
            updateSendingStatus('✅ Propuesta enviada exitosamente', 'La propuesta ha sido enviada a Workana');
            
            // Show success options immediately
            showSuccessOptions();
            
        } else {
            throw new Error(result.error || 'Error enviando propuesta');
        }
        
    } catch (error) {
        console.error('Error sending proposal:', error);
        updateSendingStatus('❌ Error enviando propuesta', error.message);
        
        setTimeout(() => {
            showProposalReview();
            Utils.showAlert(`❌ Error enviando propuesta: ${error.message}`, 'error');
        }, 3000);
        
    } finally {
        isSending = false;
    }
}

// Show success options after sending
function showSuccessOptions() {
    const sendingState = document.getElementById('sendingState');
    
    // Replace the entire content with success message and actions
    const successHtml = `
        <div class="success-actions">
            <h3>✅ ¡Propuesta Enviada!</h3>
            <p>La propuesta ha sido enviada exitosamente a Workana.</p>
            <div class="proposal-actions">
                <button class="btn btn-primary btn-large" onclick="goToProjects()">
                    📋 Ver Todos los Proyectos
                </button>
                <button class="btn btn-success btn-large" onclick="sendAnotherProposal()">
                    📤 Enviar Otra Propuesta
                </button>
                <button class="btn btn-info btn-large" onclick="viewProposalHistory()">
                    📊 Ver Historial
                </button>
            </div>
        </div>
    `;
    
    sendingState.innerHTML = successHtml;
}

// Navigation functions
function goToProjects() {
    window.location.href = 'projects.html';
}

function sendAnotherProposal() {
    window.location.href = 'projects.html';
}

function viewProposalHistory() {
    window.location.href = 'projects.html?tab=proposals';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeConfirmModal();
    }
}

// Handle page unload
window.addEventListener('beforeunload', function(event) {
    if (isSending) {
        event.preventDefault();
        event.returnValue = 'Se está enviando una propuesta. ¿Estás seguro de que quieres salir?';
    }
});