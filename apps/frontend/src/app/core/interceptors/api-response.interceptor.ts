import {
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { SnackbarService } from 'app/core/services/snackbar.service';

/**
 * Interface for API Response structure from Laravel backend
 */
interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: any;
}

/**
 * API Response Interceptor
 * 
 * Intercepta todas las respuestas HTTP y maneja automáticamente
 * los mensajes de éxito y error del ApiResponse.php del backend
 */
export const apiResponseInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const snackbarService = inject(SnackbarService);

    return next(req).pipe(
        tap((event) => {
            // Solo procesar respuestas HTTP exitosas
            if (event instanceof HttpResponse) {
                const response = event.body as ApiResponse;
                
                // Verificar que sea una respuesta del ApiResponse.php
                if (response && typeof response.success === 'boolean') {
                    // Mostrar mensaje de éxito si existe
                    if (response.success && response.message) {
                        snackbarService.showSuccess(response.message);
                    }
                }
            }
        }),
        catchError((error: HttpErrorResponse) => {
            // Manejar errores HTTP
            if (error.error && typeof error.error === 'object') {
                const apiError = error.error as ApiResponse;
                
                // Verificar que sea una respuesta del ApiResponse.php
                if (typeof apiError.success === 'boolean' && !apiError.success) {
                    // Mostrar mensaje de error del backend
                    const errorMessage = apiError.error || apiError.message || 'Error desconocido';
                    
                    // Mostrar diferentes tipos de error según el status code
                    switch (error.status) {
                        case 400:
                            snackbarService.showWarning(errorMessage);
                            break;
                        case 401:
                            snackbarService.showError('No autorizado: ' + errorMessage);
                            break;
                        case 403:
                            snackbarService.showError('Acceso prohibido: ' + errorMessage);
                            break;
                        case 404:
                            snackbarService.showError('No encontrado: ' + errorMessage);
                            break;
                        case 422:
                            // Errores de validación
                            if (apiError.errors) {
                                // Mostrar primer error de validación
                                const firstError = Object.values(apiError.errors)[0];
                                const validationMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                                snackbarService.showWarning(validationMessage as string);
                            } else {
                                snackbarService.showWarning(errorMessage);
                            }
                            break;
                        case 500:
                        default:
                            snackbarService.showError(errorMessage);
                            break;
                    }
                } else {
                    // Error HTTP sin estructura ApiResponse
                    snackbarService.showError(
                        error.message || 'Error de conexión con el servidor'
                    );
                }
            } else {
                // Error de red o similar
                snackbarService.showError(
                    'Error de conexión. Verifica tu conexión a internet.'
                );
            }

            // Re-lanzar el error para que los componentes puedan manejarlo si es necesario
            return throwError(() => error);
        })
    );
};