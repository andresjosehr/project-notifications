# Navegación Dinámica - Frontend Fuse

## Descripción

Este sistema permite renderizar dinámicamente los elementos del menú lateral en la plantilla Fuse basándose en los módulos disponibles y los permisos del usuario.

## Arquitectura

### Servicios Principales

1. **DynamicNavigationService** (`dynamic-navigation.service.ts`)
   - Genera la navegación dinámicamente
   - Se integra con el AuthService para obtener información del usuario
   - Proporciona observables reactivos para actualizaciones en tiempo real

2. **ModuleDetectorService** (`module-detector.service.ts`)
   - Detecta automáticamente los módulos disponibles
   - Convierte módulos en elementos de navegación de Fuse
   - Maneja permisos y filtrado por roles

3. **NavigationService** (`navigation.service.ts`)
   - Servicio principal que integra la navegación dinámica
   - Reemplaza el mock API con navegación dinámica
   - Mantiene compatibilidad con la estructura existente

## Cómo Funciona

### 1. Detección de Módulos

El `ModuleDetectorService` detecta automáticamente los módulos disponibles:

```typescript
// Módulos básicos
- Dashboard (/dashboard)
- Proyectos (/projects)
- Propuestas (/proposals)

// Módulos de administración (solo para admins)
- Administración (/admin)
  - Dashboard Admin (/admin/dashboard)
  - Usuarios (/admin/users)
  - Gestión de Proyectos (/admin/projects)

// Módulos de usuario
- Usuario (/user)
  - Perfil (/profile)
```

### 2. Filtrado por Permisos

Cada módulo puede tener permisos específicos:

```typescript
{
    path: '/admin',
    title: 'Administración',
    permissions: ['admin'], // Solo usuarios admin
    children: [...]
}
```

### 3. Conversión a Elementos de Navegación

Los módulos se convierten en elementos `FuseNavigationItem`:

```typescript
{
    id: 'dashboard',
    title: 'Dashboard',
    type: 'basic',
    icon: 'heroicons_outline:home',
    link: '/dashboard'
}
```

## Tipos de Elementos de Navegación

- **basic**: Enlaces simples
- **group**: Grupos con elementos hijos
- **collapsable**: Elementos colapsables
- **aside**: Elementos laterales
- **divider**: Separadores
- **spacer**: Espaciadores

## Iconos Disponibles

El sistema utiliza Heroicons:

- `heroicons_outline:home` - Dashboard
- `heroicons_outline:briefcase` - Proyectos
- `heroicons_outline:document-text` - Propuestas
- `heroicons_outline:cog-6-tooth` - Administración
- `heroicons_outline:user` - Usuario
- `heroicons_outline:chart-bar` - Estadísticas
- `heroicons_outline:users` - Usuarios

## Uso en Componentes

### En un Layout

```typescript
import { DynamicNavigationService } from 'app/core/navigation/dynamic-navigation.service';

export class ClassicLayoutComponent {
    constructor(private _dynamicNavigationService: DynamicNavigationService) {}
    
    ngOnInit(): void {
        // La navegación se actualiza automáticamente
        this._dynamicNavigationService.updateNavigation();
    }
}
```

### En un Componente

```typescript
export class ExampleComponent {
    navigation$: Observable<FuseNavigationItem[]>;
    
    constructor(private _dynamicNavigationService: DynamicNavigationService) {
        this.navigation$ = this._dynamicNavigationService.navigation$;
    }
}
```

## Configuración

### Agregar Nuevos Módulos

1. Actualizar `ModuleDetectorService.detectModules()`
2. Definir permisos si es necesario
3. Agregar iconos apropiados

### Personalizar Permisos

```typescript
private hasPermission(module: ModuleInfo, userRole?: string): boolean {
    switch (permission) {
        case 'admin':
            return userRole === 'ADMIN';
        case 'user':
            return userRole === 'USER' || userRole === 'ADMIN';
        default:
            return true;
    }
}
```

## Ventajas

1. **Automático**: No requiere configuración manual
2. **Reactivo**: Se actualiza automáticamente
3. **Seguro**: Filtrado por permisos
4. **Escalable**: Fácil agregar nuevos módulos
5. **Consistente**: Usa la estructura de Fuse

## Estructura de Archivos

```
front/src/app/core/navigation/
├── dynamic-navigation.service.ts
├── module-detector.service.ts
├── navigation.service.ts
├── navigation.types.ts
└── README.md
```

## Integración con Fuse

El sistema se integra perfectamente con la plantilla Fuse:

- Usa `FuseNavigationItem` para compatibilidad
- Funciona con todos los layouts (classic, compact, futuristic, etc.)
- Mantiene las animaciones y estilos de Fuse
- Soporta todos los tipos de navegación (vertical, horizontal)

## Ejemplo de Uso

Visita `/example` para ver una demostración de la navegación dinámica en acción. 