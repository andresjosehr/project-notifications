import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseCardComponent } from '@fuse/components/card';
import { ApiService, Project } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface ProposalReviewData {
    project: Project;
    isModal?: boolean;
}

@Component({
    selector: 'app-proposal-review',
    templateUrl: './proposal-review.component.html',
    styleUrls: ['./proposal-review.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatTooltipModule,
        FuseCardComponent,
    ],
})
export class ProposalReviewComponent implements OnInit {
    @Input() project?: Project;
    @Input() isModal = false;
    @Output() proposalSent = new EventEmitter<any>();
    @Output() proposalCancelled = new EventEmitter<void>();

    // Form
    proposalForm: FormGroup;
    private contentChangeSubject = new Subject<string>();

    // States
    isLoading = false;
    isSending = false;

    // Proposal content
    originalProposal = '';
    currentProposal = '';
    proposalStats = {
        characters: 0,
        words: 0,
        lines: 0
    };

    // Sending progress
    sendingStatus = '';
    sendingDetails = '';

    // User info
    currentUser: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        @Optional() private dialogRef?: MatDialogRef<ProposalReviewComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) private dialogData?: ProposalReviewData
    ) {
        this.currentUser = this.authService.currentUser;
        this.createProposalForm();
        this.setupContentChangeDebounce();
    }

    ngOnInit(): void {
        // Si es modal, usar datos del diálogo
        if (this.dialogData) {
            this.project = this.dialogData.project;
            this.isModal = this.dialogData.isModal || false;
        } else {
            // Si es vista independiente, cargar proyecto desde la ruta
            this.isModal = false;
            this.loadProjectFromRoute();
        }

        if (this.project) {
            this.loadProposal();
        }
    }

    private async loadProjectFromRoute(): Promise<void> {
        const projectId = this.route.snapshot.paramMap.get('projectId');
        if (projectId) {
            try {
                const result = await this.apiService.getProjectById(parseInt(projectId)).toPromise();
                if (result?.success) {
                    this.project = result.data;
                } else {
                    // Error('Proyecto no encontrado');
                    this.router.navigate(['/admin/projects']);
                }
            } catch (error: any) {
                // Error('Error cargando proyecto');
                this.router.navigate(['/admin/projects']);
            }
        }
    }

    private createProposalForm(): void {
        this.proposalForm = this.fb.group({
            content: ['']
        });

        // Subscribe to content changes for stats
        this.proposalForm.get('content')?.valueChanges.subscribe(value => {
            this.contentChangeSubject.next(value);
        });
    }

    private setupContentChangeDebounce(): void {
        this.contentChangeSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(content => {
            this.updateProposalStats(content);
        });
    }

    private updateProposalStats(content: string): void {
        this.proposalStats = {
            characters: content.length,
            words: content.trim().split(/\s+/).filter(word => word.length > 0).length,
            lines: content.split('\n').length
        };
    }

    async loadProposal(): Promise<void> {
        if (!this.project) return;

        this.isLoading = true;

        try {
            const result = await this.apiService.generateProposal({
                projectId: this.project.id.toString(),
                userId: this.currentUser?.id?.toString() || '',
                platform: this.project.platform,
            }).toPromise();
            
            if (result?.success) {
                this.originalProposal = result.data.proposal || '';
                this.currentProposal = this.originalProposal;
                this.proposalForm.patchValue({ content: this.currentProposal });
                this.updateProposalStats(this.currentProposal);
            } else {
                // Error(result?.error || 'Error generando propuesta');
            }
        } catch (error: any) {
            // Error(error.message || 'Error generando propuesta');
        } finally {
            this.isLoading = false;
        }
    }

    async regenerateProposal(): Promise<void> {
        if (!this.project) return;

        this.isLoading = true;

        try {
            const result = await this.apiService.generateProposal({
                projectId: this.project.id.toString(),
                userId: this.currentUser?.id?.toString() || '',
                platform: this.project.platform,
            }).toPromise();
            
            if (result?.success) {
                this.originalProposal = result.data.proposal || '';
                this.currentProposal = this.originalProposal;
                this.proposalForm.patchValue({ content: this.currentProposal });
                this.updateProposalStats(this.currentProposal);
                // Success('Propuesta regenerada exitosamente');
            } else {
                // Error(result?.error || 'Error regenerando propuesta');
            }
        } catch (error: any) {
            // Error(error.message || 'Error regenerando propuesta');
        } finally {
            this.isLoading = false;
        }
    }

    resetProposal(): void {
        this.currentProposal = this.originalProposal;
        this.proposalForm.patchValue({ content: this.currentProposal });
        this.updateProposalStats(this.currentProposal);
        // Info('Propuesta restaurada a la versión original');
    }

    async sendProposal(): Promise<void> {
        if (!this.project) return;

        const content = this.proposalForm.get('content')?.value;
        if (!content || content.trim().length === 0) {
            // Error('La propuesta no puede estar vacía');
            return;
        }

        this.isSending = true;
        this.sendingStatus = 'Preparando envío...';
        this.sendingDetails = '';

        try {
            const result = await this.apiService.sendProposalWithCustomContent(
                this.project.id.toString(),
                this.currentUser?.id || 0,
                content,
                { platform: this.project.platform }
            ).toPromise();
            
            if (result?.success) {
                // Success('Propuesta enviada exitosamente');
                this.proposalSent.emit(result.data);
                
                if (this.isModal && this.dialogRef) {
                    this.dialogRef.close(result.data);
                }
            } else {
                // Error(result?.error || 'Error enviando propuesta');
            }
        } catch (error: any) {
            // Error(error.message || 'Error enviando propuesta');
        } finally {
            this.isSending = false;
        }
    }

    cancelProposal(): void {
        if (this.isModal && this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.router.navigate(['/admin/projects']);
        }
    }


    // Utility methods
    formatRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Hace un momento';
        if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
        if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
        if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
        
        return date.toLocaleDateString('es-ES');
    }

    getPlatformBadgeClass(platform: string): string {
        return platform === 'workana' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800';
    }
} 