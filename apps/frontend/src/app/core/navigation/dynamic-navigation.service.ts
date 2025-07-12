import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { AuthService } from 'app/core/auth/auth.service';
import { ModuleDetectorService } from './module-detector.service';
import { BehaviorSubject, Observable, map, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DynamicNavigationService {
    private _navigationSubject = new BehaviorSubject<FuseNavigationItem[]>([]);

    constructor(
        private _authService: AuthService,
        private _moduleDetector: ModuleDetectorService
    ) {}

    /**
     * Genera la navegación dinámicamente basándose en los módulos disponibles y el rol del usuario
     */
    generateNavigation(): Observable<FuseNavigationItem[]> {
        return of(this._authService.currentUser).pipe(
            map(user => {
                // Detectar módulos disponibles
                const modules = this._moduleDetector.detectModules();
                
                // Obtener el rol del usuario
                const userRole = user?.role;
                
                // Convertir módulos a elementos de navegación
                return this._moduleDetector.convertToNavigationItems(modules, userRole);
            })
        );
    }

    /**
     * Obtiene la navegación actual
     */
    get navigation$(): Observable<FuseNavigationItem[]> {
        return this._navigationSubject.asObservable();
    }

    /**
     * Actualiza la navegación
     */
    updateNavigation(): void {
        this.generateNavigation().subscribe(navigation => {
            this._navigationSubject.next(navigation);
        });
    }

    /**
     * Filtra elementos de navegación basándose en permisos
     */
    private filterByPermissions(items: FuseNavigationItem[], user: any): FuseNavigationItem[] {
        return items.filter(item => {
            // Si el elemento tiene una función de permisos, verificar
            if (item.meta?.permissions) {
                return this.hasPermission(user, item.meta.permissions);
            }
            
            // Si tiene hijos, filtrar recursivamente
            if (item.children) {
                item.children = this.filterByPermissions(item.children, user);
                return item.children.length > 0;
            }
            
            return true;
        });
    }

    /**
     * Verifica si el usuario tiene los permisos necesarios
     */
    private hasPermission(user: any, permissions: string[]): boolean {
        if (!user || !user.role) {
            return false;
        }
        
        return permissions.some(permission => {
            switch (permission) {
                case 'admin':
                    return user.role === 'admin';
                case 'user':
                    return user.role === 'user' || user.role === 'admin';
                default:
                    return true;
            }
        });
    }
} 