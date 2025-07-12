# Servicio de Snackbar Compartido

Este servicio proporciona una interfaz unificada para mostrar notificaciones tipo snackbar en toda la aplicación usando Angular Material.

## Uso Básico

```typescript
import { SnackbarService } from 'app/core/services/snackbar.service';

constructor(private snackbarService: SnackbarService) {}

// Mostrar mensaje de éxito
this.snackbarService.showSuccess('Operación completada exitosamente');

// Mostrar mensaje de error
this.snackbarService.showError('Ha ocurrido un error');

// Mostrar mensaje de información
this.snackbarService.showInfo('Información importante');

// Mostrar mensaje de advertencia
this.snackbarService.showWarning('Advertencia importante');
```

## Uso Avanzado con Opciones

```typescript
// Con duración personalizada
this.snackbarService.showSuccess('Mensaje', {
    duration: 3000 // 3 segundos
});

// Con acción personalizada
this.snackbarService.showInfo('Mensaje con acción', {
    actionText: 'Ver Detalles',
    actionCallback: () => {
        // Acción a ejecutar cuando se hace clic en el botón
        this.navigateToDetails();
    }
});

// Con posición personalizada
this.snackbarService.showError('Error importante', {
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    duration: 10000
});
```

## Opciones Disponibles

- `duration`: Duración en milisegundos (por defecto: 5000)
- `horizontalPosition`: 'start' | 'center' | 'end' | 'left' | 'right' (por defecto: 'end')
- `verticalPosition`: 'top' | 'bottom' (por defecto: 'top')
- `panelClass`: Clases CSS adicionales
- `actionText`: Texto del botón de acción
- `actionCallback`: Función a ejecutar cuando se hace clic en la acción

## Estilos CSS

El servicio incluye estilos predefinidos para diferentes tipos de mensajes:

- `.success-snackbar`: Verde (#10b981)
- `.error-snackbar`: Rojo (#ef4444)
- `.info-snackbar`: Azul (#3b82f6)
- `.warning-snackbar`: Amarillo (#f59e0b)

## Migración desde alert()

Para reemplazar un `alert()` por un snackbar:

```typescript
// Antes
alert('Mensaje importante');

// Después
this.snackbarService.showInfo('Mensaje importante');
```

## Migración desde confirm()

Para reemplazar un `confirm()` por un snackbar con acción:

```typescript
// Antes
const confirmed = confirm('¿Está seguro?');
if (confirmed) {
    // Acción
}

// Después
this.snackbarService.showInfo('¿Está seguro?', {
    actionText: 'Sí, continuar',
    actionCallback: () => {
        // Acción
    }
});
``` 