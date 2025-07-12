import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { FuseAlertComponent } from '@fuse/components/alert';
import { ApiService } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { SnackbarService } from 'app/core/services/snackbar.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
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
        MatTabsModule,
        MatDialogModule,
        FuseCardComponent,
        FuseAlertComponent,
    ],
})
export class ProfileComponent implements OnInit {
    // Forms
    basicInfoForm: FormGroup;
    workanaCredentialsForm: FormGroup;
    proposalDirectivesForm: FormGroup;
    professionalProfileForm: FormGroup;
    changePasswordForm: FormGroup;

    // State
    isLoading = false;
    
    // Loading states for each section
    loadingStates = {
        basicInfo: false,
        workanaCredentials: false,
        proposalDirectives: false,
        professionalProfile: false,
        changePassword: false,
        testConnection: false,
    };

    // User data
    currentUser: any;
    userProfile: any;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private authService: AuthService,
        private router: Router,
        private dialog: MatDialog,
        private snackbarService: SnackbarService
    ) {
        this.currentUser = this.authService.currentUser;
        this.createForms();
    }

    ngOnInit(): void {
        this.loadUserProfile();
    }

    private createForms(): void {
        // Basic information form
        this.basicInfoForm = this.fb.group({
            email: [{ value: '', disabled: true }],
            role: [{ value: '', disabled: true }],
            telegramUser: ['', Validators.required],
        });

        // Workana credentials form
        this.workanaCredentialsForm = this.fb.group({
            workanaEmail: ['', [Validators.required, Validators.email]],
            workanaPassword: ['', Validators.required],
        });

        // Proposal directives form
        this.proposalDirectivesForm = this.fb.group({
            proposalDirectives: ['', Validators.required],
        });

        // Professional profile form
        this.professionalProfileForm = this.fb.group({
            professionalProfile: ['', Validators.required],
        });

        // Change password form
        this.changePasswordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
        }, { validators: this.passwordMatchValidator });
    }

    private passwordMatchValidator(group: FormGroup): any {
        const newPassword = group.get('newPassword');
        const confirmPassword = group.get('confirmPassword');
        
        if (newPassword?.value !== confirmPassword?.value) {
            confirmPassword?.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }
        
        confirmPassword?.setErrors(null);
        return null;
    }

    async loadUserProfile(): Promise<void> {
        if (!this.currentUser?.id) return;

        this.isLoading = true;
        try {
            const result = await this.apiService.getUserById(this.currentUser.id).toPromise();
            
            if (result?.success) {
                this.userProfile = result.data;
                this.populateForms();
            } else {
                this.snackbarService.showError(result?.error || 'Error cargando perfil');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error cargando perfil');
        } finally {
            this.isLoading = false;
        }
    }

    private populateForms(): void {
        // Basic info
        this.basicInfoForm.patchValue({
            email: this.userProfile.email,
            role: this.userProfile.role,
            telegramUser: this.userProfile.telegramUser || '',
        });

        // Workana credentials
        const workanaCredential = this.userProfile.credentials?.find((cred: any) => cred.platform === 'workana');
        if (workanaCredential) {
            this.workanaCredentialsForm.patchValue({
                workanaEmail: workanaCredential.email,
                workanaPassword: '', // Don't prefill password
            });
        }

        // Proposal directives
        this.proposalDirectivesForm.patchValue({
            proposalDirectives: this.userProfile.proposalDirectives || '',
        });

        // Professional profile
        this.professionalProfileForm.patchValue({
            professionalProfile: this.userProfile.professionalProfile || '',
        });
    }

    async saveBasicInfo(): Promise<void> {
        if (this.basicInfoForm.invalid) return;

        this.loadingStates.basicInfo = true;
        try {
            const formData = {
                telegramUser: this.basicInfoForm.get('telegramUser')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                // Actualizar solo los datos modificados en memoria
                if (this.userProfile) {
                    this.userProfile.telegramUser = formData.telegramUser;
                }
                this.snackbarService.showSuccess('Información básica actualizada exitosamente');
            } else {
                this.snackbarService.showError(result?.error || 'Error actualizando información');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error actualizando información');
        } finally {
            this.loadingStates.basicInfo = false;
        }
    }

    async saveWorkanaCredentials(): Promise<void> {
        if (this.workanaCredentialsForm.invalid) return;

        this.loadingStates.workanaCredentials = true;
        try {
            const formData = {
                workanaEmail: this.workanaCredentialsForm.get('workanaEmail')?.value,
                workanaPassword: this.workanaCredentialsForm.get('workanaPassword')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                // Actualizar solo las credenciales en memoria
                if (this.userProfile && this.userProfile.credentials) {
                    const workanaCredential = this.userProfile.credentials.find((cred: any) => cred.platform === 'workana');
                    if (workanaCredential) {
                        workanaCredential.email = formData.workanaEmail;
                    } else {
                        this.userProfile.credentials.push({
                            platform: 'workana',
                            email: formData.workanaEmail
                        });
                    }
                }
                this.snackbarService.showSuccess('Credenciales de Workana actualizadas exitosamente');
                // Clear password field for security
                this.workanaCredentialsForm.get('workanaPassword')?.setValue('');
            } else {
                this.snackbarService.showError(result?.error || 'Error actualizando credenciales');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error actualizando credenciales');
        } finally {
            this.loadingStates.workanaCredentials = false;
        }
    }

    async saveProposalDirectives(): Promise<void> {
        if (this.proposalDirectivesForm.invalid) return;

        this.loadingStates.proposalDirectives = true;
        try {
            const formData = {
                proposalDirectives: this.proposalDirectivesForm.get('proposalDirectives')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                // Actualizar solo las directrices en memoria
                if (this.userProfile) {
                    this.userProfile.proposalDirectives = formData.proposalDirectives;
                }
                this.snackbarService.showSuccess('Directrices de propuesta actualizadas exitosamente');
            } else {
                this.snackbarService.showError(result?.error || 'Error actualizando directrices');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error actualizando directrices');
        } finally {
            this.loadingStates.proposalDirectives = false;
        }
    }

    async saveProfessionalProfile(): Promise<void> {
        if (this.professionalProfileForm.invalid) return;

        this.loadingStates.professionalProfile = true;
        try {
            const formData = {
                professionalProfile: this.professionalProfileForm.get('professionalProfile')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                // Actualizar solo el perfil profesional en memoria
                if (this.userProfile) {
                    this.userProfile.professionalProfile = formData.professionalProfile;
                }
                this.snackbarService.showSuccess('Perfil profesional actualizado exitosamente');
            } else {
                this.snackbarService.showError(result?.error || 'Error actualizando perfil');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error actualizando perfil');
        } finally {
            this.loadingStates.professionalProfile = false;
        }
    }

    async changePassword(): Promise<void> {
        if (this.changePasswordForm.invalid) return;

        this.loadingStates.changePassword = true;
        try {
            const formData = {
                currentPassword: this.changePasswordForm.get('currentPassword')?.value,
                newPassword: this.changePasswordForm.get('newPassword')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                this.snackbarService.showSuccess('Contraseña cambiada exitosamente');
                this.changePasswordForm.reset();
            } else {
                this.snackbarService.showError(result?.error || 'Error cambiando contraseña');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error cambiando contraseña');
        } finally {
            this.loadingStates.changePassword = false;
        }
    }

    async testWorkanaConnection(): Promise<void> {
        const workanaEmail = this.workanaCredentialsForm.get('workanaEmail')?.value;
        const workanaPassword = this.workanaCredentialsForm.get('workanaPassword')?.value;

        if (!workanaEmail || !workanaPassword) {
            this.snackbarService.showError('Completa las credenciales de Workana antes de probar la conexión');
            return;
        }

        this.loadingStates.testConnection = true;
        try {
            const result = await this.apiService.loginWorkana({
                email: workanaEmail,
                password: workanaPassword,
                userId: this.currentUser.id,
            }).toPromise();
            
            if (result?.success) {
                this.snackbarService.showSuccess('Conexión a Workana exitosa');
            } else {
                this.snackbarService.showError(result?.error || 'Error conectando a Workana');
            }
        } catch (error: any) {
            this.snackbarService.showError(error.message || 'Error conectando a Workana');
        } finally {
            this.loadingStates.testConnection = false;
        }
    }

    showProposalPreview(): void {
        // Implementation for showing proposal preview modal
        console.log('Show proposal preview');
    }

    logout(): void {
        this.authService.signOut().subscribe(() => {
            this.router.navigate(['/sign-in']);
        });
    }
}