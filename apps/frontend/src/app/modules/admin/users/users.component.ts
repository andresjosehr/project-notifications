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
import { ApiService, User } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router } from '@angular/router';

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
    is_used: boolean;
    created_at: string;
    used_at?: string;
    created_by_admin?: any;
    registered_user?: any;
    registered_user_id?: number;
    updated_at: string;
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
    ],
})
export class UsersComponent implements OnInit {
    // State
    isLoading = false;

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
                // Error loading users
            }
        } catch (error: any) {
            // Error loading users
        } finally {
            this.isLoading = false;
        }
    }

    async loadTokens(): Promise<void> {
        try {
            const result = await this.apiService.getTokens().toPromise();
            
            if (result?.success) {
                console.log('Tokens loaded successfully:', result.data);
                this.tokens = result.data.tokens || [];
                console.log('Component tokens array:', this.tokens);
                this.cdr.detectChanges(); // Force change detection
            } else {
                // Error loading tokens
            }
        } catch (error: any) {
            console.error('Error loading tokens:', error);
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
                this.loadTokens();
                this.loadTokenStats();
                
                // Show the token details in a dialog
                this.showTokenDialog(result.data);
            } else {
                // Error generating token
            }
        } catch (error: any) {
            // Error generating token
        }
    }

    private showTokenDialog(tokenData: any): void {
        // Implementation for showing token dialog
        const registerUrl = `${window.location.origin}/register?token=${tokenData.token}`;
        const message = `Token generado: ${tokenData.token}\n\nURL de registro: ${registerUrl}`;
        
        // Could implement a modal dialog here instead
        console.log('Token generated:', message);
    }

    async deleteToken(tokenId: number): Promise<void> {
        const confirmed = confirm('¿Está seguro de eliminar este token?');
        if (!confirmed) return;

        try {
            const result = await this.apiService.deleteToken(tokenId).toPromise();
            
            if (result?.success) {
                this.loadTokens();
                this.loadTokenStats();
            } else {
                // Error deleting token
            }
        } catch (error: any) {
            // Error deleting token
        }
    }

    async cleanupOldTokens(): Promise<void> {
        const confirmed = confirm('¿Eliminar todos los tokens no utilizados de más de 30 días?');
        if (!confirmed) return;

        try {
            const result = await this.apiService.cleanupTokens(30).toPromise();
            
            if (result?.success) {
                this.loadTokens();
                this.loadTokenStats();
            } else {
                // Error cleaning tokens
            }
        } catch (error: any) {
            // Error cleaning tokens
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
                this.editingUser = null;
                this.editUserForm.reset();
                this.loadUsers();
            } else {
                // Error updating user
            }
        } catch (error: any) {
            // Error updating user
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
                this.loadUsers();
                this.loadUserStats();
            } else {
                // Error updating user status
            }
        } catch (error: any) {
            // Error updating user status
        }
    }

    async deleteUser(user: User): Promise<void> {
        const confirmed = confirm(`¿Está seguro de eliminar el usuario ${user.email}?\n\nEsta acción no se puede deshacer.`);
        if (!confirmed) return;

        try {
            const result = await this.apiService.deleteUser(user.id).toPromise();
            
            if (result?.success) {
                this.loadUsers();
                this.loadUserStats();
            } else {
                // Error deleting user
            }
        } catch (error: any) {
            // Error deleting user
        }
    }

    copyToken(token: string): void {
        navigator.clipboard.writeText(token).then(() => {
            // Token copied
        }).catch(() => {
            // Error copying token
        });
    }

    copyRegistrationLink(token: string): void {
        const link = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(link).then(() => {
            // Link copied
        }).catch(() => {
            // Error copying link
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


    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}