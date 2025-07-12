import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Navigation } from 'app/core/navigation/navigation.types';
import { DynamicNavigationService } from './dynamic-navigation.service';
import { Observable, ReplaySubject, tap, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private _httpClient = inject(HttpClient);
    private _dynamicNavigationService = inject(DynamicNavigationService);
    private _navigation: ReplaySubject<Navigation> =
        new ReplaySubject<Navigation>(1);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for navigation
     */
    get navigation$(): Observable<Navigation> {
        return this._navigation.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all navigation data
     */
    get(): Observable<Navigation> {
        // Usar navegación dinámica en lugar del mock API
        return this._dynamicNavigationService.generateNavigation().pipe(
            map(defaultNavigation => {
                // Crear objeto de navegación con todas las variantes
                const navigation: Navigation = {
                    compact: defaultNavigation,
                    default: defaultNavigation,
                    futuristic: defaultNavigation,
                    horizontal: defaultNavigation
                };
                
                this._navigation.next(navigation);
                return navigation;
            }),
            tap((navigation) => {
                this._navigation.next(navigation);
            })
        );
    }
}
