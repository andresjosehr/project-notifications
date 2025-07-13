import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { AuthService } from 'app/core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'auth-register',
    templateUrl: './register.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
})
export class AuthRegisterComponent implements OnInit {
    @ViewChild('registerNgForm') registerNgForm: NgForm;

    registerForm: UntypedFormGroup;
    isTokenMode: boolean = false;
    isSystemInitialized: boolean = true;
    token: string = '';
    tokenValid: boolean = false;
    loading: boolean = false;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        private _router: Router
    ) {}

    ngOnInit(): void {
        // Check for registration token in URL
        this.token = this._activatedRoute.snapshot.queryParams['token'] || '';
        
        if (this.token) {
            this.isTokenMode = true;
            this.validateToken();
        } else {
            this.checkSystemInitialization();
        }

        this.createForm();
    }

    private createForm(): void {
        this.registerForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            telegramUser: [''],
            proposalDirectives: [''],
            professionalProfile: ['']
        });
    }

    private async validateToken(): Promise<void> {
        this.loading = true;
        try {
            const result = await this._authService.validateToken(this.token).toPromise();
            
            if (result?.success) {
                this.tokenValid = true;
            } else {
                this.tokenValid = false;
            }
        } catch (error) {
            this.tokenValid = false;
        } finally {
            this.loading = false;
        }
    }

    private async checkSystemInitialization(): Promise<void> {
        this.loading = true;
        try {
            const result = await this._authService.checkInitialization().toPromise();
            
            if (result?.isInitialized) {
                // System is initialized, redirect to login
                this._router.navigate(['/sign-in']);
            } else {
                // System not initialized, allow admin setup
                this.isSystemInitialized = false;
            }
        } catch (error) {
            // Error checking system status
        } finally {
            this.loading = false;
        }
    }

    register(): void {
        if (this.registerForm.invalid) {
            return;
        }

        this.registerForm.disable();
        this.loading = true;

        const formData = this.registerForm.value;
        
        if (this.isTokenMode && this.tokenValid) {
            // Register with token
            const userData = {
                ...formData,
                token: this.token
            };

            this._authService.registerWithToken(userData).subscribe({
                next: (response) => {
                    if (response.success) {
                        // Auto-redirect to profile after successful registration
                        setTimeout(() => {
                            this._router.navigate(['/profile']);
                        }, 2000);
                    } else {
                        this.handleError(response.error || 'Error en el registro');
                    }
                },
                error: (error) => {
                    this.handleError(error.message || 'Error en el registro');
                }
            });
        } else if (!this.isSystemInitialized) {
            // Register admin (first time setup)
            this._authService.registerAdmin(formData).subscribe({
                next: (response) => {
                    if (response.success) {
                        setTimeout(() => {
                            this._router.navigate(['/sign-in']);
                        }, 2000);
                    } else {
                        this.handleError(response.error || 'Error registrando administrador');
                    }
                },
                error: (error) => {
                    this.handleError(error.message || 'Error registrando administrador');
                }
            });
        }
    }

    private handleError(message: string): void {
        this.registerForm.enable();
        this.loading = false;
        
        // Reset form
        this.registerNgForm.resetForm();
        this.createForm();
    }
}