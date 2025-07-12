import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';

export interface ModuleInfo {
    path: string;
    title: string;
    icon: string;
    type: 'basic' | 'group';
    children?: ModuleInfo[];
    permissions?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ModuleDetectorService {

    /**
     * Detecta automáticamente los módulos disponibles en la aplicación
     */
    detectModules(): ModuleInfo[] {
        const modules: ModuleInfo[] = [];

        // Módulos básicos que siempre están disponibles
        modules.push(
            {
                path: '/projects',
                title: 'Proyectos',
                icon: 'heroicons_outline:briefcase',
                type: 'basic'
            }
        );

        // Módulos de administración
        modules.push({
            path: '/admin',
            title: 'Administración',
            icon: 'heroicons_outline:cog-6-tooth',
            type: 'group',
            permissions: ['admin'],
            children: [
                {
                    path: '/admin/dashboard',
                    title: 'Dashboard Admin',
                    icon: 'heroicons_outline:chart-bar',
                    type: 'basic',
                    permissions: ['admin']
                },
                {
                    path: '/admin/users',
                    title: 'Usuarios',
                    icon: 'heroicons_outline:users',
                    type: 'basic',
                    permissions: ['admin']
                }
            ]
        });

        // Módulos de usuario
        modules.push({
            path: '/user',
            title: 'Usuario',
            icon: 'heroicons_outline:user',
            type: 'group',
            children: [
                {
                    path: '/profile',
                    title: 'Perfil',
                    icon: 'heroicons_outline:user-circle',
                    type: 'basic'
                }
            ]
        });

        return modules;
    }

    /**
     * Convierte los módulos detectados en elementos de navegación de Fuse
     */
    convertToNavigationItems(modules: ModuleInfo[], userRole?: string): FuseNavigationItem[] {
        return modules
            .filter(module => this.hasPermission(module, userRole))
            .map(module => this.convertModuleToNavigationItem(module, userRole));
    }

    /**
     * Convierte un módulo en un elemento de navegación
     */
    private convertModuleToNavigationItem(module: ModuleInfo, userRole?: string): FuseNavigationItem {
        const item: FuseNavigationItem = {
            id: module.path.replace('/', '').replace(/\//g, '-'),
            title: module.title,
            type: module.type,
            icon: module.icon,
            link: module.path
        };

        if (module.children) {
            item.children = module.children
                .filter(child => this.hasPermission(child, userRole))
                .map(child => this.convertModuleToNavigationItem(child, userRole));
        }

        return item;
    }

    /**
     * Verifica si el usuario tiene permisos para acceder al módulo
     */
    private hasPermission(module: ModuleInfo, userRole?: string): boolean {
        if (!module.permissions || module.permissions.length === 0) {
            return true;
        }

        if (!userRole) {
            return false;
        }

        return module.permissions.some(permission => {
            switch (permission) {
                case 'admin':
                    return userRole === 'ADMIN';
                case 'user':
                    return userRole === 'USER' || userRole === 'ADMIN';
                default:
                    return true;
            }
        });
    }
} 