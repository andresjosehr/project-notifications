import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Inject } from '@angular/core';
import { FuseCardComponent } from '@fuse/components/card';
import { FuseAlertComponent } from '@fuse/components/alert';
import { ApiService, Project } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-proposal-review',
    templateUrl: './proposal-review.component.html',
    styleUrls: ['./proposal-review.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatSnackBarModule,
        FuseCardComponent,
        FuseAlertComponent,
    ],
})
export class ProposalReviewComponent implements OnInit {
    // Forms
    proposalForm: FormGroup;

    // State
    isLoading = false;
    isGenerating = false;
    isSending = false;
    showAlert = false;
    alertMessage = '';
    alertType: 'success' | 'error' | 'info' = 'info';

    // Data
    project: Project | null = null;
    user: any = null;
    originalProposal = '';
    proposalStats = {
        characters: 0,
        words: 0,
        lines: 0,
    };

    // URL Parameters
    projectId: string = '';
    userId: string = '';
    platform: string = '';
    autoLogin: boolean = false;
    generateCustom: boolean = true;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.createForm();
        this.setupStatsCalculation();
    }

    ngOnInit(): void {
        // Get URL parameters
        this.route.queryParams.subscribe(params => {
            this.projectId = params['projectId'] || '';
            this.userId = params['userId'] || '';
            this.platform = params['platform'] || 'workana';
            this.autoLogin = params['autoLogin'] === 'true';
            this.generateCustom = params['generateCustom'] === 'true';

            if (this.projectId && this.userId) {
                this.loadData();
            } else {
                this.showError('Parámetros requeridos faltantes');
                this.router.navigate(['/projects']);
            }
        });
    }

    private createForm(): void {
        this.proposalForm = this.fb.group({
            proposalContent: ['', Validators.required],
        });
    }

    private setupStatsCalculation(): void {
        this.proposalForm.get('proposalContent')?.valueChanges.subscribe(value => {
            this.calculateStats(value || '');
        });
    }

    private calculateStats(text: string): void {
        this.proposalStats = {
            characters: text.length,
            words: text.trim() ? text.trim().split(/\s+/).length : 0,
            lines: text.split('\n').length,
        };
    }

    private async loadData(): Promise<void> {
        this.isLoading = true;
        try {
            // Load project and user data in parallel
            const [projectResult, userResult] = await Promise.all([
                this.apiService.getProjectById(parseInt(this.projectId)).toPromise(),
                this.apiService.getUserById(parseInt(this.userId)).toPromise()
            ]);

            if (projectResult?.success) {
                this.project = projectResult.data;
            } else {
                throw new Error(projectResult?.error || 'Error cargando proyecto');
            }

            if (userResult?.success) {
                this.user = userResult.data;
            } else {
                throw new Error(userResult?.error || 'Error cargando usuario');
            }

            // Generate initial proposal if requested
            if (this.generateCustom) {
                await this.generateProposal();
            }

        } catch (error: any) {
            this.showError(error.message || 'Error cargando datos');
        } finally {
            this.isLoading = false;
        }
    }

    async generateProposal(): Promise<void> {
        if (!this.project) return;

        this.isGenerating = true;
        try {
            const result = await this.apiService.generateProposal({
                projectId: this.project.id,
                projectTitle: this.project.title,
                projectDescription: this.project.description,
                platform: this.project.platform,
                userId: this.userId,
            }).toPromise();

            if (result?.success) {
                const proposalContent = result.data.proposal || result.data;
                this.proposalForm.patchValue({
                    proposalContent: proposalContent
                });
                this.originalProposal = proposalContent;
                this.showSuccess('Propuesta generada exitosamente');
            } else {
                this.showError(result?.error || 'Error generando propuesta');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error generando propuesta');
        } finally {
            this.isGenerating = false;
        }
    }

    async regenerateProposal(): Promise<void> {
        if (!this.project) return;
        await this.generateProposal();
    }

    resetToOriginal(): void {
        this.proposalForm.patchValue({
            proposalContent: this.originalProposal
        });
        this.showInfo('Propuesta restaurada al contenido original');
    }

    async sendProposal(): Promise<void> {
        if (this.proposalForm.invalid || !this.project) return;

        // Show confirmation dialog
        const confirmed = await this.showConfirmationDialog();
        if (!confirmed) return;

        this.isSending = true;
        try {
            const proposalContent = this.proposalForm.get('proposalContent')?.value;
            
            const result = await this.apiService.sendWorkanaProposal({
                projectId: this.projectId,
                userId: parseInt(this.userId),
                autoLogin: this.autoLogin,
                proposalContent: proposalContent,
            }).toPromise();

            if (result?.success) {
                this.showSuccess('Propuesta enviada exitosamente a Workana');
                
                // Show success snackbar with action
                this.snackBar.open('Propuesta enviada exitosamente', 'Ver Proyectos', {
                    duration: 5000,
                    horizontalPosition: 'end',
                    verticalPosition: 'top',
                }).onAction().subscribe(() => {
                    this.router.navigate(['/projects']);
                });

                // Navigate back after a delay
                setTimeout(() => {
                    this.router.navigate(['/projects']);
                }, 3000);
            } else {
                this.showError(result?.error || 'Error enviando propuesta');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error enviando propuesta');
        } finally {
            this.isSending = false;
        }
    }

    private async showConfirmationDialog(): Promise<boolean> {
        return new Promise((resolve) => {
            const dialogRef = this.dialog.open(ProposalConfirmationDialogComponent, {
                width: '600px',
                data: {
                    project: this.project,
                    proposalContent: this.proposalForm.get('proposalContent')?.value,
                    stats: this.proposalStats,
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                resolve(result === true);
            });
        });
    }

    getPlatformBadgeClass(): string {
        if (!this.project) return '';
        return this.project.platform === 'workana' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    }

    formatCurrency(amount: string): string {
        return amount || 'No especificado';
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    goBack(): void {
        this.router.navigate(['/projects']);
    }

    showSuccess(message: string): void {
        this.alertType = 'success';
        this.alertMessage = message;
        this.showAlert = true;
        setTimeout(() => { this.showAlert = false; }, 5000);
    }

    showError(message: string): void {
        this.alertType = 'error';
        this.alertMessage = message;
        this.showAlert = true;
        setTimeout(() => { this.showAlert = false; }, 5000);
    }

    showInfo(message: string): void {
        this.alertType = 'info';
        this.alertMessage = message;
        this.showAlert = true;
        setTimeout(() => { this.showAlert = false; }, 5000);
    }
}

// Confirmation Dialog Component (inline for simplicity)
@Component({
    selector: 'proposal-confirmation-dialog',
    template: `
        <div class="p-6">
            <h2 mat-dialog-title class="text-xl font-semibold mb-4">Confirmar Envío de Propuesta</h2>
            
            <div mat-dialog-content class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="font-medium mb-2">Proyecto:</h3>
                    <p class="text-sm">{{ data.project?.title }}</p>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="font-medium mb-2">Estadísticas de la Propuesta:</h3>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="font-medium">Caracteres:</span> {{ data.stats?.characters }}
                        </div>
                        <div>
                            <span class="font-medium">Palabras:</span> {{ data.stats?.words }}
                        </div>
                        <div>
                            <span class="font-medium">Líneas:</span> {{ data.stats?.lines }}
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <h3 class="font-medium mb-2">Vista Previa de la Propuesta:</h3>
                    <p class="text-sm whitespace-pre-wrap">{{ data.proposalContent }}</p>
                </div>
                
                <p class="text-sm text-gray-600">
                    ¿Estás seguro de que deseas enviar esta propuesta a Workana?
                </p>
            </div>
            
            <div mat-dialog-actions class="flex justify-end space-x-2 mt-6">
                <button mat-stroked-button (click)="onCancel()">Cancelar</button>
                <button mat-flat-button color="primary" (click)="onConfirm()">Enviar Propuesta</button>
            </div>
        </div>
    `,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
    ],
})
export class ProposalConfirmationDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ProposalConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {}

    onCancel(): void {
        this.dialogRef.close(false);
    }

    onConfirm(): void {
        this.dialogRef.close(true);
    }
}