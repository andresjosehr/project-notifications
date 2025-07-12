import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { FuseAlertComponent } from '@fuse/components/alert';
import { ApiService, User } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router } from '@angular/router';
import { SnackbarService } from 'app/core/services/snackbar.service';

interface UserStats {
    total: number;
    active: number;
    inactive: number;
    withValidSession: number;
}

interface TokenStats {
    total: number;
    unused: number;
    used: number;
    created_this_week: number;
}

interface Token {
    id: number;
    token: string;
    isUsed: boolean;
    createdAt: string;
    usedAt?: string;
    registeredUserEmail?: string;
}

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatMenuModule,
        MatSelectModule,
        MatTabsModule,
        FuseCardComponent,
        FuseAlertComponent,
    ],
})
export class UsersComponent implements OnInit {
    // State
    isLoading = false;
    showAlert = false;
    alertMessage = '';
    alertType: 'success' | 'error' | 'info' = 'info';

    // Data
    users: User[] = [];
    tokens: Token[] = [];
    userStats: UserStats = {
        total: 0,
        active: 0,
        inactive: 0,
        withValidSession: 0,
    };
    tokenStats: TokenStats = {
        total: 0,
        unused: 0,
        used: 0,
        created_this_week: 0,
    };

    // Table columns
    userColumns: string[] = ['id', 'email', 'telegramUser', 'status', 'createdAt', 'actions'];
    tokenColumns: string[] = ['id', 'token', 'status', 'createdAt', 'usedBy', 'usedAt', 'actions'];

    // Edit form
    editUserForm: FormGroup;
    editingUser: User | null = null;

    currentUser: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private router: Router,
        private dialog: MatDialog,
        private snackbarService: SnackbarService,
        private cdr: ChangeDetectorRef
    ) {
        this.currentUser = this.authService.currentUser;
        this.createEditForm();
    }

    ngOnInit(): void {
        this.loadUsers();
        this.loadTokens();
        this.loadUserStats();
        this.loadTokenStats();
    }

    private createEditForm(): void {
        this.editUserForm = this.fb.group({
            workanaEmail: ['', [Validators.email]],
            workanaPassword: [''],
            telegramUser: [''],
            proposalDirectives: [''],
            professionalProfile: [''],
        });
    }

    async loadUsers(): Promise<void> {
        this.isLoading = true;
        try {
            const result = await this.apiService.getUsers().toPromise();
            
            if (result?.success) {
                this.users = result.data || [];
            } else {
                this.showError(result?.error || 'Error cargando usuarios');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error cargando usuarios');
        } finally {
            this.isLoading = false;
        }
    }

    async loadTokens(): Promise<void> {
        try {
            const result = await this.apiService.getTokens().toPromise();
            
            if (result?.success) {
                console.log('Tokens loaded successfully:', result.data);
                console.log('Tokens array length:', result.data?.length);
                this.tokens = result.data.data || [];
                console.log('Component tokens array:', this.tokens);
                this.cdr.detectChanges(); // Force change detection
            } else {
                this.showError(result?.error || 'Error cargando tokens');
            }
        } catch (error: any) {
            console.error('Error loading tokens:', error);
            this.showError(error.message || 'Error cargando tokens');
        }
    }

    async loadUserStats(): Promise<void> {
        try {
            const result = await this.apiService.getUserStats().toPromise();
            
            if (result?.success) {
                this.userStats = result.data || this.userStats;
            }
        } catch (error: any) {
            console.error('Error loading user stats:', error);
        }
    }

    async loadTokenStats(): Promise<void> {
        try {
            const result = await this.apiService.getTokenStats().toPromise();
            
            if (result?.success) {
                this.tokenStats = result.data || this.tokenStats;
            }
        } catch (error: any) {
            console.error('Error loading token stats:', error);
        }
    }

    async generateNewToken(): Promise<void> {
        try {
            const result = await this.apiService.generateToken().toPromise();
            
            if (result?.success) {
                this.showSuccess('Token generado exitosamente');
                this.loadTokens();
                this.loadTokenStats();
                
                // Show the token details in a dialog
                this.showTokenDialog(result.data);
            } else {
                this.showError(result?.error || 'Error generando token');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error generando token');
        }
    }

    private showTokenDialog(tokenData: any): void {
        // Implementation for showing token dialog
        const registerUrl = `${window.location.origin}/register?token=${tokenData.token}`;
        const message = `Token generado: ${tokenData.token}\n\nURL de registro: ${registerUrl}`;
        
        this.snackbarService.showInfo(message, {
            duration: 10000,
            actionText: 'Copiar URL',
            actionCallback: () => {
                navigator.clipboard.writeText(registerUrl).then(() => {
                    this.snackbarService.showSuccess('URL copiada al portapapeles');
                }).catch(() => {
                    this.snackbarService.showError('Error copiando URL');
                });
            }
        });
    }

    async deleteToken(tokenId: number): Promise<void> {
        const confirmed = confirm('¿Está seguro de eliminar este token?');
        if (!confirmed) return;

        try {
            const result = await this.apiService.deleteToken(tokenId).toPromise();
            
            if (result?.success) {
                this.showSuccess('Token eliminado exitosamente');
                this.loadTokens();
                this.loadTokenStats();
            } else {
                this.showError(result?.error || 'Error eliminando token');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error eliminando token');
        }
    }

    async cleanupOldTokens(): Promise<void> {
        const confirmed = confirm('¿Eliminar todos los tokens no utilizados de más de 30 días?');
        if (!confirmed) return;

        try {
            const result = await this.apiService.cleanupTokens(30).toPromise();
            
            if (result?.success) {
                this.showSuccess(result.message || 'Tokens limpiados exitosamente');
                this.loadTokens();
                this.loadTokenStats();
            } else {
                this.showError(result?.error || 'Error limpiando tokens');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error limpiando tokens');
        }
    }

    editUser(user: User): void {
        this.editingUser = user;
        
        // Populate form - you might need to adjust this based on your User model
        this.editUserForm.patchValue({
            workanaEmail: '', // Get from user.credentials if available
            workanaPassword: '',
            telegramUser: user.telegramUser || '',
            proposalDirectives: user.proposalDirectives || '',
            professionalProfile: user.professionalProfile || '',
        });
    }

    async saveUser(): Promise<void> {
        if (!this.editingUser || this.editUserForm.invalid) return;

        try {
            const formData = this.editUserForm.value;
            const result = await this.apiService.updateUser(this.editingUser.id, formData).toPromise();
            
            if (result?.success) {
                this.showSuccess('Usuario actualizado exitosamente');
                this.editingUser = null;
                this.editUserForm.reset();
                this.loadUsers();
            } else {
                this.showError(result?.error || 'Error actualizando usuario');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error actualizando usuario');
        }
    }

    cancelEdit(): void {
        this.editingUser = null;
        this.editUserForm.reset();
    }

    async toggleUserStatus(user: User): Promise<void> {
        try {
            const result = await this.apiService.toggleUserStatus(user.id, !user.isActive).toPromise();
            
            if (result?.success) {
                this.showSuccess(result.message || 'Estado del usuario actualizado');
                this.loadUsers();
                this.loadUserStats();
            } else {
                this.showError(result?.error || 'Error actualizando estado');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error actualizando estado');
        }
    }

    async deleteUser(user: User): Promise<void> {
        const confirmed = confirm(`¿Está seguro de eliminar el usuario ${user.email}?\n\nEsta acción no se puede deshacer.`);
        if (!confirmed) return;

        try {
            const result = await this.apiService.deleteUser(user.id).toPromise();
            
            if (result?.success) {
                this.showSuccess('Usuario eliminado exitosamente');
                this.loadUsers();
                this.loadUserStats();
            } else {
                this.showError(result?.error || 'Error eliminando usuario');
            }
        } catch (error: any) {
            this.showError(error.message || 'Error eliminando usuario');
        }
    }

    copyToken(token: string): void {
        navigator.clipboard.writeText(token).then(() => {
            this.showSuccess('Token copiado al portapapeles');
        }).catch(() => {
            this.showError('Error copiando token');
        });
    }

    copyRegistrationLink(token: string): void {
        const link = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(link).then(() => {
            this.showSuccess('Link de registro copiado al portapapeles');
        }).catch(() => {
            this.showError('Error copiando link');
        });
    }

    getUserStatusBadgeClass(isActive: boolean): string {
        return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }

    getTokenStatusBadgeClass(isUsed: boolean): string {
        return isUsed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    showSuccess(message: string): void {
        this.snackbarService.showSuccess(message);
    }

    showError(message: string): void {
        this.snackbarService.showError(message);
    }

    showInfo(message: string): void {
        this.snackbarService.showInfo(message);
    }

    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}