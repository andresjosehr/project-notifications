import { Route } from '@angular/router';
import { initialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [

    // Redirect empty path to '/projects'
    {path: '', pathMatch : 'full', redirectTo: 'projects'},

    // Redirect signed-in user to the '/projects'
    //
    // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
    // path. Below is another redirection for that path to redirect the user to the desired
    // location. This is a small convenience to keep all main routes together here on this file.
    {path: 'signed-in-redirect', pathMatch : 'full', redirectTo: 'projects'},

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes')},
            {path: 'register', loadChildren: () => import('app/modules/auth/register/register.routes')}
        ]
    },

    // Auth routes for authenticated users
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.routes')}
        ]
    },

    // Main application routes
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        resolve: {
            initialData: initialDataResolver
        },
        children: [
            // Projects module - available to all users
            {path: 'projects', loadChildren: () => import('app/modules/admin/projects/projects.routes')},
            
            // Admin projects route - redirects to projects
            {path: 'admin/projects', loadChildren: () => import('app/modules/admin/projects/projects.routes')},
            
            // User profile - available to all users
            {path: 'profile', loadChildren: () => import('app/modules/user/profile/profile.routes')},
            
            // Admin routes - only for admin users
            {path: 'admin/dashboard', loadChildren: () => import('app/modules/admin/dashboard/dashboard.routes')},
            {path: 'admin/users', loadChildren: () => import('app/modules/admin/users/users.routes')},
            {path: 'admin', loadChildren: () => import('app/modules/admin/dashboard/dashboard.routes')},
        ]
    }
];
