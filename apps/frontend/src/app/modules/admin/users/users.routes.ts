import { Routes } from '@angular/router';
import { AdminGuard } from 'app/core/auth/guards/admin.guard';
import { UsersComponent } from 'app/modules/admin/users/users.component';

export default [
    {
        path: '',
        component: UsersComponent,
        canActivate: [AdminGuard],
    },
] as Routes;