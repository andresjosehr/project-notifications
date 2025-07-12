import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

export const AdminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated and is admin
    if (authService.currentUser && authService.isAdmin) {
        return true;
    }

    // If not admin, redirect to projects page
    router.navigate(['/projects']);
    return false;
};