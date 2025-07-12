# Desacoplamiento de la Tabla Users

Este documento describe el proceso de desacoplamiento de la tabla `users` para separar la información del sistema de usuario de las credenciales de aplicaciones externas como Workana.

## 🎯 Objetivo

El objetivo es modularizar la gestión de credenciales para que:
- La tabla `users` contenga solo información del sistema (perfil, directrices, etc.)
- La tabla `external_credentials` maneje todas las credenciales de plataformas externas
- Se pueda agregar fácilmente soporte para nuevas plataformas (Upwork, Freelancer, etc.)

## 📊 Estructura Actual vs Nueva

### Estructura Actual (Antes del Desacoplamiento)
```sql
-- Tabla users (mezcla información del sistema + credenciales)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workana_email VARCHAR(255) NOT NULL UNIQUE,
  workana_password VARCHAR(255) NOT NULL,
  workana_session_data LONGTEXT,
  session_expires_at DATETIME,
  proposal_directives LONGTEXT NOT NULL,
  professional_profile LONGTEXT NOT NULL,
  telegram_user VARCHAR(255) NOT NULL,
  system_password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);
```

### Estructura Nueva (Después del Desacoplamiento)
```sql
-- Tabla users (solo información del sistema)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_directives LONGTEXT NOT NULL,
  professional_profile LONGTEXT NOT NULL,
  telegram_user VARCHAR(255) NOT NULL,
  system_password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Nueva tabla external_credentials
CREATE TABLE external_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'workana', 'upwork', etc.
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  session_data LONGTEXT,
  session_expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices y claves foráneas
  INDEX idx_user_id (user_id),
  INDEX idx_platform (platform),
  INDEX idx_user_platform (user_id, platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_platform (user_id, platform)
);
```

## 🔄 Proceso de Migración

### Paso 1: Crear la nueva tabla
```bash
# Ejecutar migración para crear external_credentials
node scripts/run-migrations.js
```

### Paso 2: Migrar datos existentes
La migración automáticamente:
1. Crea la tabla `external_credentials`
2. Migra las credenciales de Workana de `users` a `external_credentials`
3. Limpia las columnas de Workana de la tabla `users`

### Paso 3: Crear credenciales para nuevos usuarios
```bash
# Script interactivo para crear credenciales
node scripts/create-external-credentials.js
```

## 🛠️ Cambios en el Código

### Modelos Actualizados

#### User Model
- ❌ Removidas propiedades: `workanaEmail`, `workanaPassword`, `workanaSessionData`, `sessionExpiresAt`
- ✅ Mantenidas propiedades: `proposalDirectives`, `professionalProfile`, `telegramUser`, `systemPassword`, `role`

#### Nuevo ExternalCredential Model
- ✅ Propiedades: `userId`, `platform`, `email`, `password`, `sessionData`, `sessionExpiresAt`, `isActive`

### Repositorios Actualizados

#### UserRepository
- Actualizado `findByEmail()` para buscar en `external_credentials`
- Actualizado `findWithValidSession()` para usar la nueva tabla
- Actualizado `updateSession()` y `clearSession()` para usar `external_credentials`

#### Nuevo ExternalCredentialRepository
- Métodos CRUD completos para credenciales externas
- Búsqueda por usuario, plataforma, o ambos
- Gestión de sesiones y estados activos/inactivos

### Servicios Actualizados

#### WorkanaService
- Actualizado para usar `ExternalCredentialRepository`
- Mantiene compatibilidad con el código existente
- Mejor gestión de sesiones por usuario

### API Endpoints Nuevos

```bash
# Gestión de credenciales externas
GET    /api/external-credentials                    # Obtener todas las credenciales
GET    /api/external-credentials/user/:userId       # Credenciales por usuario
GET    /api/external-credentials/platform/:platform # Credenciales por plataforma
POST   /api/external-credentials                    # Crear nueva credencial
PUT    /api/external-credentials/:id                # Actualizar credencial
DELETE /api/external-credentials/:id                # Eliminar credencial
PATCH  /api/external-credentials/:id/deactivate     # Desactivar credencial
PATCH  /api/external-credentials/:id/session        # Actualizar datos de sesión
```

## 🚀 Ventajas del Desacoplamiento

### 1. Modularidad
- Cada tabla tiene una responsabilidad específica
- Fácil agregar nuevas plataformas sin modificar la tabla `users`

### 2. Escalabilidad
- Un usuario puede tener credenciales en múltiples plataformas
- Gestión independiente de sesiones por plataforma

### 3. Seguridad
- Separación clara entre datos del sistema y credenciales externas
- Mejor control de acceso y auditoría

### 4. Flexibilidad
- Activar/desactivar credenciales sin afectar el usuario
- Migrar credenciales entre usuarios fácilmente

## 📋 Checklist de Migración

- [ ] Ejecutar migraciones: `node scripts/run-migrations.js`
- [ ] Verificar datos migrados correctamente
- [ ] Crear credenciales para usuarios existentes: `node scripts/create-external-credentials.js`
- [ ] Probar funcionalidad de login con nuevas credenciales
- [ ] Verificar que las sesiones se guarden en la nueva tabla
- [ ] Probar endpoints de la API para credenciales externas
- [ ] Actualizar documentación del sistema

## 🔧 Scripts Disponibles

### `scripts/run-migrations.js`
Ejecuta las migraciones de desacoplamiento en orden:
1. Crea tabla `external_credentials`
2. Migra datos de Workana
3. Limpia tabla `users`

### `scripts/create-external-credentials.js`
Script interactivo para crear credenciales externas:
- Lista usuarios disponibles
- Permite seleccionar usuario
- Solicita datos de credencial
- Valida duplicados y datos

## 🐛 Solución de Problemas

### Error: "No se encontraron credenciales de Workana"
- Verificar que el usuario tenga credenciales en `external_credentials`
- Usar el script para crear credenciales faltantes

### Error: "Usuario no encontrado"
- Verificar que el usuario existe en la tabla `users`
- Verificar que el usuario esté activo

### Error en migración
- Revisar logs de migración
- Verificar que no haya datos duplicados
- Ejecutar migraciones una por una si es necesario

## 📈 Próximos Pasos

1. **Soporte para Upwork**: Agregar credenciales de Upwork usando la nueva estructura
2. **Gestión de Sesiones**: Mejorar la gestión de sesiones múltiples
3. **Interfaz de Usuario**: Crear UI para gestionar credenciales externas
4. **Auditoría**: Agregar logs de cambios en credenciales
5. **Encriptación**: Implementar encriptación adicional para credenciales sensibles 