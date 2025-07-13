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
    displayedColumns: string[] = ['title', 'platform', 'budget', 'publishedAt', 'actions'];

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
                this.filteredProjects = this.projects;
            } else {
                // Error(result?.error || 'Error cargando proyectos');
            }
        } catch (error: any) {
            // Error(error.message || 'Error cargando proyectos');
        } finally {
            this.isLoading = false;
        }
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
        });
        this.currentPage = 0;
        this.loadProjects();
    }

    async viewProject(project: Project): Promise<void> {
        // Implementation for viewing project details
        console.log('View project:', project);
        // You can implement a dialog or navigate to a detail page
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

    async showScrapingModal(): Promise<void> {
        // Implementation for scraping modal
        // You can create a separate component for this
        console.log('Show scraping modal');
    }

    async exportProjects(): Promise<void> {
        if (this.projects.length === 0) {
            // Error('No hay proyectos para exportar');
            return;
        }

        const csvData = this.projects.map(project => ({
            'ID': project.id,
            'Título': project.title,
            'Plataforma': project.platform,
            'Presupuesto': project.price || '',
            'Categoría': project.category || '',
            'Publicado': project.publishedAt,
            'Detectado': project.createdAt,
            'URL': project.link,
        }));

        const csvContent = this.convertToCSV(csvData);
        const timestamp = new Date().toISOString().split('T')[0];
        this.downloadFile(csvContent, `proyectos_${timestamp}.csv`, 'text/csv');
        // Success('Proyectos exportados correctamente');
    }

    private convertToCSV(data: any[]): string {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
            Object.values(row).map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(',')
        );
        return [headers, ...rows].join('\n');
    }

    private downloadFile(content: string, fileName: string, contentType: string): void {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    getPlatformBadgeClass(platform: string): string {
        return platform === 'workana' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
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