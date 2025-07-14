import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProposalReviewComponent } from './proposal-review/proposal-review.component';
import { ProposalDetailsDialogComponent } from './proposal-details-dialog/proposal-details-dialog.component';
import { FuseCardComponent } from '@fuse/components/card';
import { ApiService, Project, ProjectFilters } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface ProjectStats {
    total: number;
    workana: number;
    upwork: number;
    recent24h: number;
}

@Component({
    selector: 'app-projects',
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatMenuModule,
        MatCheckboxModule,
        MatTooltipModule,
        ProposalReviewComponent,
        ProposalDetailsDialogComponent,
        FuseCardComponent,
    ],
})
export class ProjectsComponent implements OnInit {
    projects: Project[] = [];
    filteredProjects: Project[] = [];
    isLoading = false;

    // Stats
    stats: ProjectStats = {
        total: 0,
        workana: 0,
        upwork: 0,
        recent24h: 0,
    };

    // Filters and pagination
    filtersForm: FormGroup;
    private searchSubject = new Subject<string>();
    currentPage = 0;
    pageSize = 20;
    totalProjects = 0;

    // Table columns
    displayedColumns: string[] = ['title', 'platform', 'budget', 'publishedAt', 'proposalStatus', 'actions'];

    // User info
    currentUser: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private router: Router,
        private dialog: MatDialog
    ) {
        this.currentUser = this.authService.currentUser;
        this.createFiltersForm();
        this.setupSearchDebounce();
    }

    ngOnInit(): void {
        this.loadProjects();
        this.loadStats();
    }

    private createFiltersForm(): void {
        this.filtersForm = this.fb.group({
            search: [''],
            platform: [''],
            budget: [''],
            date: [''],
            sortBy: ['publishedAt'],
            sortOrder: ['desc'],
            proposalStatus: [''],
        });

        // Subscribe to form changes
        this.filtersForm.valueChanges.subscribe(() => {
            this.currentPage = 0;
            this.loadProjects();
        });

        // Special handling for search input
        this.filtersForm.get('search')?.valueChanges.subscribe(value => {
            this.searchSubject.next(value);
        });
    }

    private setupSearchDebounce(): void {
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(() => {
            this.currentPage = 0;
            this.loadProjects();
        });
    }

    private getFilters(): ProjectFilters {
        const formValue = this.filtersForm.value;
        return {
            search: formValue.search || undefined,
            platform: formValue.platform || undefined,
            budget: formValue.budget || undefined,
            date: formValue.date || undefined,
            sort: formValue.sortBy || 'publishedAt',
            order: formValue.sortOrder || 'desc',
            page: this.currentPage + 1,
            limit: this.pageSize,
        };
    }

    async loadProjects(): Promise<void> {
        this.isLoading = true;
        try {
            const filters = this.getFilters();
            const result = await this.apiService.getProjects(filters).toPromise();

            if (result?.success) {
                this.projects = result.data.projects || [];
                this.totalProjects = result.data.total || 0;
                
                // Aplicar filtros locales
                this.applyLocalFilters();
            } else {
                // Error(result?.error || 'Error cargando proyectos');
            }
        } catch (error: any) {
            // Error(error.message || 'Error cargando proyectos');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Aplica filtros locales después de cargar los proyectos
     */
    private applyLocalFilters(): void {
        const proposalStatusFilter = this.filtersForm.get('proposalStatus')?.value;
        
        this.filteredProjects = this.projects.filter(project => {
            if (!proposalStatusFilter) return true;
            
            switch (proposalStatusFilter) {
                case 'not_sent':
                    return !project.proposal_sent;
                case 'sent':
                    return project.proposal_sent && project.proposal_status === 'sent';
                case 'accepted':
                    return project.proposal_sent && project.proposal_status === 'accepted';
                case 'rejected':
                    return project.proposal_sent && project.proposal_status === 'rejected';
                default:
                    return true;
            }
        });
    }



    async loadStats(): Promise<void> {
        try {
            const result = await this.apiService.getProjectStats().toPromise();
            if (result?.success) {
                this.stats = {
                    total: result.data.total || 0,
                    workana: result.data.workana || 0,
                    upwork: result.data.upwork || 0,
                    recent24h: result.data.recent24h || 0,
                };
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    onPageChange(event: PageEvent): void {
        this.currentPage = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadProjects();
    }

    clearFilters(): void {
        this.filtersForm.reset({
            search: '',
            platform: '',
            budget: '',
            date: '',
            sortBy: 'publishedAt',
            sortOrder: 'desc',
            proposalStatus: '',
        });
        this.currentPage = 0;
        this.loadProjects();
    }

    async viewProject(project: Project): Promise<void> {
        // Implementation for viewing project details
        console.log('View project:', project);
        // You can implement a dialog or navigate to a detail page
    }

    async viewProposalDetails(project: Project): Promise<void> {
        // Crear objeto de propuesta con la información que ya viene en el proyecto
        const proposal = {
            id: 0, // No tenemos el ID específico, pero no es crítico para mostrar
            project_id: project.id,
            project_platform: project.platform,
            proposal_sent_at: project.proposal_sent_at,
            proposal_content: project.proposal_content,
            status: project.proposal_status
        };

        // Mostrar detalles de la propuesta en un diálogo
        this.showProposalDetailsDialog(proposal, project);
    }

    private showProposalDetailsDialog(proposal: any, project: Project): void {
        const dialogRef = this.dialog.open(ProposalDetailsDialogComponent, {
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            data: {
                proposal: proposal,
                project: project
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log('Dialog closed:', result);
        });
    }

    async generateProposal(project: Project): Promise<void> {
        const dialogRef = this.dialog.open(ProposalReviewComponent, {
            width: '90vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '800px',
            data: {
                project: project,
                isModal: true
            },
            disableClose: false
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Success('Propuesta enviada exitosamente');
            }
        });
    }

    copyProjectUrl(project: Project): void {
        navigator.clipboard.writeText(project.link).then(() => {
            // Success('URL copiada al portapapeles');
        }).catch(() => {
            // Error('Error copiando URL');
        });
    }



    getPlatformBadgeClass(platform: string): string {
        return platform === 'workana' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    }

    getProposalStatusBadgeClass(status: string): string {
        switch (status) {
            case 'sent':
                return 'bg-blue-100 text-blue-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getProposalStatusText(status: string): string {
        switch (status) {
            case 'sent':
                return 'Enviada';
            case 'accepted':
                return 'Aceptada';
            case 'rejected':
                return 'Rechazada';
            case 'pending':
                return 'Pendiente';
            default:
                return 'Desconocido';
        }
    }

    getProposalStats(): { total: number; sent: number; accepted: number; rejected: number } {
        const stats = {
            total: this.filteredProjects.length,
            sent: 0,
            accepted: 0,
            rejected: 0
        };

        this.filteredProjects.forEach(project => {
            if (project.proposal_sent) {
                stats.sent++;
                if (project.proposal_status === 'accepted') {
                    stats.accepted++;
                } else if (project.proposal_status === 'rejected') {
                    stats.rejected++;
                }
            }
        });

        return stats;
    }

    formatRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Hace menos de 1 hora';
        if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
        
        return date.toLocaleDateString();
    }


    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}