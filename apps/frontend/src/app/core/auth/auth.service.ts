import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { UserService } from 'app/core/user/user.service';
import { ApiService } from 'app/core/services/api.service';
import { catchError, Observable, of, switchMap, throwError, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated: boolean = false;
    private _httpClient = inject(HttpClient);
    private _userService = inject(UserService);
    private _apiService = inject(ApiService);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        localStorage.setItem('authToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('authToken') ?? '';
    }

    /**
     * Get current user info from localStorage
     */
    get currentUser(): any {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    /**
     * Check if current user is admin
     */
    get isAdmin(): boolean {
        const user = this.currentUser;
        return user?.role === 'ADMIN';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     *
     * @param credentials
     */
    signIn(credentials: { email: string; password: string }): Observable<any> {
        // Throw error, if the user is already logged in
        if (this._authenticated) {
            return throwError('User is already logged in.');
        }

        return this._apiService.login(credentials).pipe(
            switchMap((response: any) => {
                if (response.success) {
                    // Store the access token and user info in local storage
                    this.accessToken = response.token;
                    localStorage.setItem('userInfo', JSON.stringify(response.user));

                    // Set the authenticated flag to true
                    this._authenticated = true;

                    // Store the user on the user service
                    this._userService.user = response.user;

                    // Return a new observable with the response
                    return of(response);
                } else {
                    return throwError(response.error || 'Login failed');
                }
            }),
            catchError((error) => {
                return throwError(error.message || 'Login failed');
            })
        );
    }

    /**
     * Sign in using the access token
     */
    signInUsingToken(): Observable<any> {
        // Check if we have user info in localStorage
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            return of(false);
        }

        // Verify token with the server
        return this._apiService.getStatus().pipe(
            catchError(() => of(false)),
            switchMap((response: any) => {
                if (response && response.success) {
                    // Set the authenticated flag to true
                    this._authenticated = true;

                    // Store the user on the user service
                    const user = JSON.parse(userInfo);
                    this._userService.user = user;

                    // Return true
                    return of(true);
                } else {
                    // Clear invalid token and user info
                    this.signOut();
                    return of(false);
                }
            })
        );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any> {
        // Remove the access token and user info from local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');

        // Set the authenticated flag to false
        this._authenticated = false;

        // Clear user service
        this._userService.user = null;

        // Return the observable
        return of(true);
    }

    /**
     * Register admin (first time setup)
     *
     * @param userData
     */
    registerAdmin(userData: { email: string; password: string }): Observable<any> {
        return this._apiService.registerAdmin(userData);
    }

    /**
     * Register with token
     *
     * @param userData
     */
    registerWithToken(userData: any): Observable<any> {
        return this._apiService.registerWithToken(userData).pipe(
            tap((response) => {
                if (response.success && response.token) {
                    // Auto-login after successful registration
                    this.accessToken = response.token;
                    localStorage.setItem('userInfo', JSON.stringify(response.user));
                    this._authenticated = true;
                    this._userService.user = response.user;
                }
            })
        );
    }

    /**
     * Check system initialization
     */
    checkInitialization(): Observable<any> {
        return this._apiService.checkInitialization();
    }

    /**
     * Validate registration token
     */
    validateToken(token: string): Observable<any> {
        return this._apiService.validateToken(token);
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {
        // Check if the user is logged in
        if (this._authenticated) {
            return of(true);
        }

        // Check the access token availability
        if (!this.accessToken) {
            return of(false);
        }

        // Check the access token expire date
        if (AuthUtils.isTokenExpired(this.accessToken)) {
            this.signOut();
            return of(false);
        }

        // If the access token exists, and it didn't expire, sign in using it
        return this.signInUsingToken();
    }
}
