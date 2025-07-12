import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export interface SnackbarOptions {
    duration?: number;
    horizontalPosition?: 'start' | 'center' | 'end' | 'left' | 'right';
    verticalPosition?: 'top' | 'bottom';
    panelClass?: string | string[];
    actionText?: string;
    actionCallback?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class SnackbarService {
    private defaultConfig: MatSnackBarConfig = {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
    };

    constructor(private snackBar: MatSnackBar) {}

    /**
     * Muestra un mensaje de éxito
     */
    showSuccess(message: string, options?: SnackbarOptions): void {
        const config = this.getConfig(options, 'success-snackbar');
        const snackBarRef = this.snackBar.open(message, options?.actionText, config);
        
        if (options?.actionCallback) {
            snackBarRef.onAction().subscribe(() => {
                options.actionCallback!();
            });
        }
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message: string, options?: SnackbarOptions): void {
        const config = this.getConfig(options, 'error-snackbar');
        const snackBarRef = this.snackBar.open(message, options?.actionText, config);
        
        if (options?.actionCallback) {
            snackBarRef.onAction().subscribe(() => {
                options.actionCallback!();
            });
        }
    }

    /**
     * Muestra un mensaje de información
     */
    showInfo(message: string, options?: SnackbarOptions): void {
        const config = this.getConfig(options, 'info-snackbar');
        const snackBarRef = this.snackBar.open(message, options?.actionText, config);
        
        if (options?.actionCallback) {
            snackBarRef.onAction().subscribe(() => {
                options.actionCallback!();
            });
        }
    }

    /**
     * Muestra un mensaje de advertencia
     */
    showWarning(message: string, options?: SnackbarOptions): void {
        const config = this.getConfig(options, 'warning-snackbar');
        const snackBarRef = this.snackBar.open(message, options?.actionText, config);
        
        if (options?.actionCallback) {
            snackBarRef.onAction().subscribe(() => {
                options.actionCallback!();
            });
        }
    }

    /**
     * Muestra un snackbar personalizado
     */
    show(message: string, actionText?: string, options?: SnackbarOptions): void {
        const config = this.getConfig(options);
        const snackBarRef = this.snackBar.open(message, actionText, config);
        
        if (options?.actionCallback) {
            snackBarRef.onAction().subscribe(() => {
                options.actionCallback!();
            });
        }
    }

    /**
     * Cierra el snackbar actual
     */
    dismiss(): void {
        this.snackBar.dismiss();
    }

    /**
     * Obtiene la configuración combinando las opciones por defecto con las personalizadas
     */
    private getConfig(options?: SnackbarOptions, panelClass?: string): MatSnackBarConfig {
        const config = { ...this.defaultConfig };
        
        if (options) {
            if (options.duration !== undefined) config.duration = options.duration;
            if (options.horizontalPosition) config.horizontalPosition = options.horizontalPosition;
            if (options.verticalPosition) config.verticalPosition = options.verticalPosition;
        }

        if (panelClass) {
            config.panelClass = options?.panelClass 
                ? Array.isArray(options.panelClass) 
                    ? [panelClass, ...options.panelClass]
                    : [panelClass, options.panelClass]
                : panelClass;
        } else if (options?.panelClass) {
            config.panelClass = options.panelClass;
        }

        return config;
    }
} 