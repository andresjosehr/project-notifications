import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { SnackbarService } from 'app/core/services/snackbar.service';
import { ApiService } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router } from '@angular/router';

interface SystemHealth {
    database: boolean;
    aiService: boolean;
    telegram: boolean;
    scrapers: boolean;
}

interface SystemLogs {
    app: string[];
    error: string[];
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatTabsModule,
        MatDialogModule,
        FuseCardComponent,
    ],
})
export class DashboardComponent implements OnInit {
    // Forms
    scrapingForm: FormGroup;

    // State
    isLoading = false;

    // Loading states
    loadingStates = {
        health: false,
        logs: false,
        scraping: false,
        cleanup: false,
    };

    // Data
    systemHealth: SystemHealth = {
        database: false,
        aiService: false,
        telegram: false,
        scrapers: false,
    };

    systemLogs: SystemLogs = {
        app: [],
        error: [],
    };

    selectedLogType: 'app' | 'error' = 'app';
    currentUser: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private router: Router,
        private snackbarService: SnackbarService
    ) {
        this.currentUser = this.authService.currentUser;
        this.createForms();
    }

    ngOnInit(): void {
        this.checkSystemHealth();
        this.loadLogs();
    }

    private createForms(): void {
        this.scrapingForm = this.fb.group({
            platform: ['both'],
            notifications: [true],
            parallel: [true],
        });
    }

    async checkSystemHealth(): Promise<void> {
        this.loadingStates.health = true;
        try {
            const result = await this.apiService.getHealth().toPromise();
            
            if (result?.success) {
                // Parse health data - adjust based on your API response structure
                this.systemHealth = {
                    database: result.data?.database || false,
                    aiService: result.data?.aiService || false,
                    telegram: result.data?.telegram || false,
                    scrapers: result.data?.scrapers || false,
                };
                this.snackbarService.showSuccess('Estado del sistema actualizado');
            } else {
                this.snackbarService.showError(result?.error || 'Error verificando salud del sistema');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error verificando salud del sistema');
        } finally {
            this.loadingStates.health = false;
        }
    }

    async loadLogs(type?: 'app' | 'error'): Promise<void> {
        const logType = type || this.selectedLogType;
        this.loadingStates.logs = true;
        
        try {
            const result = await this.apiService.getLogs(logType).toPromise();
            
            if (result?.success) {
                // La API devuelve el contenido como string, necesitamos convertirlo a array
                const logContent = result.data || '';
                const logLines = logContent ? logContent.split('\n').filter(line => line.trim()) : [];
                
                if (logType === 'app') {
                    this.systemLogs.app = logLines;
                } else {
                    this.systemLogs.error = logLines;
                }
            } else {
                this.snackbarService.showError(result?.error || 'Error cargando logs');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error cargando logs');
        } finally {
            this.loadingStates.logs = false;
        }
    }

    onLogTypeChange(type: 'app' | 'error'): void {
        this.selectedLogType = type;
        this.loadLogs(type);
    }

    async startManualScraping(): Promise<void> {
        if (this.scrapingForm.invalid) return;

        this.loadingStates.scraping = true;
        try {
            const formData = this.scrapingForm.value;
            let result;

            if (formData.platform === 'both') {
                result = await this.apiService.scrapeSingle({
                    notifications: formData.notifications,
                    parallel: formData.parallel,
                }).toPromise();
            } else if (formData.platform === 'workana') {
                result = await this.apiService.scrapeWorkana({
                    notifications: formData.notifications,
                }).toPromise();
            } else if (formData.platform === 'upwork') {
                result = await this.apiService.scrapeUpwork({
                    notifications: formData.notifications,
                }).toPromise();
            }

            if (result?.success) {
                this.snackbarService.showSuccess(`Scraping completado: ${result.data?.newProjects || 0} nuevos proyectos encontrados`);
            } else {
                this.snackbarService.showError(result?.error || 'Error ejecutando scraping');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error ejecutando scraping');
        } finally {
            this.loadingStates.scraping = false;
        }
    }

    async cleanupDatabase(): Promise<void> {
        const confirmed = confirm('¿Está seguro de que desea limpiar la base de datos?\n\nEsta operación eliminará duplicados y optimizará el almacenamiento.');
        
        if (!confirmed) return;

        this.loadingStates.cleanup = true;
        try {
            const result = await this.apiService.cleanup().toPromise();
            
            if (result?.success) {
                this.snackbarService.showSuccess('Base de datos limpiada exitosamente');
            } else {
                this.snackbarService.showError(result?.error || 'Error limpiando base de datos');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error limpiando base de datos');
        } finally {
            this.loadingStates.cleanup = false;
        }
    }

    async clearLogs(type?: 'app' | 'error'): Promise<void> {
        const logType = type || this.selectedLogType;
        const confirmed = confirm(`¿Está seguro de que desea limpiar los logs de ${logType}?`);
        
        if (!confirmed) return;

        try {
            const result = await this.apiService.clearLogs(logType).toPromise();
            
            if (result?.success) {
                this.snackbarService.showSuccess(`Logs de ${logType} limpiados exitosamente`);
                this.loadLogs(logType);
            } else {
                this.snackbarService.showError(result?.error || 'Error limpiando logs');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error limpiando logs');
        }
    }

    downloadLogs(type?: 'app' | 'error'): void {
        const logType = type || this.selectedLogType;
        const logs = logType === 'app' ? this.systemLogs.app : this.systemLogs.error;
        
        if (logs.length === 0) {
            this.snackbarService.showError('No hay logs para descargar');
            return;
        }

        const content = logs.join('\n');
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${logType}-logs_${timestamp}.txt`;
        
        this.downloadFile(content, fileName, 'text/plain');
        this.snackbarService.showSuccess(`Logs de ${logType} descargados`);
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

    getHealthStatusIcon(status: boolean): string {
        return status ? 'heroicons_outline:check-circle' : 'heroicons_outline:x-circle';
    }

    getHealthStatusClass(status: boolean): string {
        return status ? 'text-green-600' : 'text-red-600';
    }


    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}