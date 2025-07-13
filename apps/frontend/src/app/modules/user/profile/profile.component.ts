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
import { ApiService } from 'app/core/services/api.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatTabsModule,
        MatDialogModule,
        FuseCardComponent,
    ],
})
export class ProfileComponent implements OnInit {
    // Forms
    profileForm: FormGroup;
    changePasswordForm: FormGroup;

    // State
    isLoading = false;
    
    // Loading states
    loadingStates = {
        profile: false,
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
        private dialog: MatDialog
    ) {
        this.currentUser = this.authService.currentUser;
        this.createForms();
    }

    ngOnInit(): void {
        this.loadUserProfile();
    }

    private createForms(): void {
        // Main profile form (consolidated)
        this.profileForm = this.fb.group({
            email: [{ value: '', disabled: true }],
            role: [{ value: '', disabled: true }],
            telegramUser: ['', Validators.required],
            workanaEmail: ['', [Validators.required, Validators.email]],
            workanaPassword: [''],
            proposalDirectives: ['', Validators.required],
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
                // Error loading profile
            }
        } catch (error: any) {
            // Error loading profile
        } finally {
            this.isLoading = false;
        }
    }

    private populateForms(): void {
        // Main profile form
        this.profileForm.patchValue({
            email: this.userProfile.email,
            role: this.userProfile.role,
            telegramUser: this.userProfile.telegramUser || this.userProfile.telegram_user || '',
            workanaEmail: this.userProfile.credentials?.find((cred: any) => cred.platform === 'workana')?.email || '',
            workanaPassword: '', // Don't prefill password
            proposalDirectives: this.userProfile.proposalDirectives || this.userProfile.proposal_directives || '',
            professionalProfile: this.userProfile.professionalProfile || this.userProfile.professional_profile || '',
        });
    }

    async saveProfile(): Promise<void> {
        this.loadingStates.profile = true;
        try {
            const formData = {
                telegramUser: this.profileForm.get('telegramUser')?.value,
                workanaEmail: this.profileForm.get('workanaEmail')?.value,
                workanaPassword: this.profileForm.get('workanaPassword')?.value,
                proposalDirectives: this.profileForm.get('proposalDirectives')?.value,
                professionalProfile: this.profileForm.get('professionalProfile')?.value,
            };

            const result = await this.apiService.updateUser(this.currentUser.id, formData).toPromise();
            
            if (result?.success) {
                // Actualizar datos en memoria
                if (this.userProfile) {
                    this.userProfile.telegramUser = formData.telegramUser;
                    this.userProfile.proposalDirectives = formData.proposalDirectives;
                    this.userProfile.professionalProfile = formData.professionalProfile;
                    
                    // Actualizar credenciales de Workana
                    if (this.userProfile.credentials) {
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
                }
                
                // Limpiar campo de contraseña por seguridad
                this.profileForm.get('workanaPassword')?.setValue('');
                
            } else {
                // Error updating profile
            }
        } catch (error: any) {
            // Error updating profile
        } finally {
            this.loadingStates.profile = false;
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
                this.changePasswordForm.reset();
            } else {
                // Error changing password
            }
        } catch (error: any) {
            // Error changing password
        } finally {
            this.loadingStates.changePassword = false;
        }
    }

    async testWorkanaConnection(): Promise<void> {
        const workanaEmail = this.profileForm.get('workanaEmail')?.value;
        const workanaPassword = this.profileForm.get('workanaPassword')?.value;

        if (!workanaEmail || !workanaPassword) {
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
                // Connection successful
            } else {
                // Error connecting to Workana
            }
        } catch (error: any) {
            // Error connecting to Workana
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