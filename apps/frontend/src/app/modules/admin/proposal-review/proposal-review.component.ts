import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FuseCardComponent } from '@fuse/components/card';
import { ApiService, Project, User } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ProposalConfirmDialogComponent } from './proposal-confirm-dialog/proposal-confirm-dialog.component';

@Component({
    
    selector: 'app-proposal-review',
    templateUrl: './proposal-review.component.html',
    styleUrls: ['./proposal-review.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatSnackBarModule,
        FuseCardComponent,
    ],
})
export class ProposalReviewComponent implements OnInit {
    // Data properties
    currentProject: Project | null = null;
    currentUser: User | null = null;
    originalProposal = '';
    proposalContent = '';

    // State properties
    isLoading = false;
    isGenerating = false;
    isSending = false;
    isInitialLoading = false; // Nuevo estado para carga inicial

    // URL parameters
    projectId: string | null = null;
    platform = 'workana';

    // Statistics
    charCount = 0;
    wordCount = 0;
    lineCount = 0;

    // Current user info
    authUser: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.authUser = this.authService.currentUser;
    }

    ngOnInit(): void {
        // Get URL parameters from path
        this.route.params.subscribe(params => {
            this.projectId = params['projectId'];

            if (!this.projectId) {
                // Error('❌ Falta el parámetro projectId');
                setTimeout(() => {
                    this.router.navigate(['/admin/projects']);
                }, 3000);
                return;
            }

            this.initializeProposalReview();
        });
    }

    private async initializeProposalReview(): Promise<void> {
        try {
            this.showInitialLoadingState();

            // Load project data
            await this.loadProjectData();

            // Generate initial proposal
            await this.generateInitialProposal();

            // Show proposal review section
            this.showProposalReview();

        } catch (error: any) {
            console.error('Error initializing proposal review:', error);
            // Error(`❌ Error iniciando revisión: ${error.message}`);
        }
    }

    private async loadProjectData(): Promise<void> {
        try {
            const result = await this.apiService.getProjectById(Number(this.projectId)).toPromise();
            
            if (result?.success && result.data) {
                this.currentProject = result.data;
                this.platform = this.currentProject.platform;
            } else {
                throw new Error(result?.error || 'Proyecto no encontrado');
            }
        } catch (error: any) {
            console.error('Error loading project data:', error);
            throw error;
        }
    }

    private async generateInitialProposal(): Promise<void> {
        try {
            this.isGenerating = true;
            
            const result = await this.apiService.generateProposalByProjectId(
                this.projectId!
            ).toPromise();
            
            if (result?.success && result.data) {
                this.originalProposal = result.data.proposal || result.data.content || '';
                this.proposalContent = this.originalProposal;
                this.updateProposalStats();
                
                // Success('✅ Propuesta generada exitosamente');
            } else {
                throw new Error(result?.error || 'Error generando propuesta');
            }
        } catch (error: any) {
            console.error('Error generating proposal:', error);
            // Error(`❌ Error generando propuesta: ${error.message}`);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    onProposalContentChange(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        this.proposalContent = target.value;
        this.updateProposalStats();
    }

    updateProposalStats(): void {
        // Character count
        this.charCount = this.proposalContent.length;
        
        // Word count
        const words = this.proposalContent.trim().split(/\s+/).filter(word => word.length > 0);
        this.wordCount = words.length;
        
        // Line count
        this.lineCount = this.proposalContent.split('\n').length;
    }

    async regenerateProposal(): Promise<void> {
        if (this.isGenerating) return;
        
        try {
            // Info('🔄 Regenerando propuesta...');
            
            // Clear current content
            this.proposalContent = '';
            
            // Generate new proposal
            await this.generateInitialProposal();
            
        } catch (error: any) {
            console.error('Error regenerating proposal:', error);
            // Error(`❌ Error regenerando propuesta: ${error.message}`);
        }
    }

    resetProposal(): void {
        if (this.originalProposal) {
            this.proposalContent = this.originalProposal;
            this.updateProposalStats();
            // Info('↩️ Propuesta restaurada al contenido original');
        } else {
            // Error('❌ No hay propuesta original para restaurar');
        }
    }

    sendProposal(): void {
        if (this.isSending) return;
        
        const proposalContent = this.proposalContent.trim();
        
        if (!proposalContent) {
            // Error('❌ La propuesta no puede estar vacía');
            return;
        }
        
        // Show confirmation modal
        this.showConfirmModal();
    }

    private showConfirmModal(): void {
        const dialogRef = this.dialog.open(ProposalConfirmDialogComponent, {
            width: '600px',
            data: {
                project: this.currentProject,
                user: this.currentUser,
                proposalContent: this.proposalContent,
                charCount: this.charCount,
                wordCount: this.wordCount
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.confirmSend();
            }
        });
    }

    private async confirmSend(): Promise<void> {
        try {
            this.isSending = true;
            this.showSendingState();
            
            const result = await this.apiService.sendProposalByProjectId(
                this.projectId!,
                this.proposalContent.trim()
            ).toPromise();
            
            if (result?.success) {
                this.showSuccessOptions();
            } else {
                throw new Error(result?.error || 'Error enviando propuesta');
            }
            
        } catch (error: any) {
            console.error('Error sending proposal:', error);
            
            setTimeout(() => {
                this.showProposalReview();
                // Error(`❌ Error enviando propuesta: ${error.message}`);
            }, 3000);
            
        } finally {
            this.isSending = false;
        }
    }

    // State management methods
    private showInitialLoadingState(): void {
        this.isInitialLoading = true;
        this.isLoading = false;
        this.isSending = false;
    }

    private showProposalReview(): void {
        this.isInitialLoading = false;
        this.isLoading = false;
        this.isSending = false;
    }

    private showSendingState(): void {
        this.isSending = true;
    }

    private showSuccessOptions(): void {
        // Success('✅ ¡Propuesta Enviada! La propuesta ha sido enviada exitosamente a Workana.');
        
        // Show success snackbar with action
        const snackBarRef = this.snackBar.open(
            '✅ Propuesta enviada exitosamente',
            'Ver Proyectos',
            {
                duration: 0,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            }
        );

        snackBarRef.onAction().subscribe(() => {
            this.goToProjects();
        });
    }

    // Navigation methods
    goToProjects(): void {
        this.router.navigate(['/admin/projects']);
    }

    sendAnotherProposal(): void {
        this.router.navigate(['/admin/projects']);
    }

    viewProposalHistory(): void {
        this.router.navigate(['/admin/projects'], { queryParams: { tab: 'proposals' } });
    }

    // Utility methods
    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    getPlatformBadgeClass(platform: string): string {
        return platform === 'workana' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    }


    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}