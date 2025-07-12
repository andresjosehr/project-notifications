import { Routes } from '@angular/router';
import { AdminGuard } from 'app/core/auth/guards/admin.guard';
import { DashboardComponent } from 'app/modules/admin/dashboard/dashboard.component';

export default [
    {
        path: '',
        component: DashboardComponent,
        canActivate: [AdminGuard],
    },
] as Routes;