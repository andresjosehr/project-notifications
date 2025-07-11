# Sistema de Autenticación JWT

Este documento describe el sistema de autenticación JWT implementado en el sistema de notificaciones de freelance.

## Características

- **JWT (JSON Web Tokens)** para autenticación stateless
- **Roles de usuario** (ADMIN, USER) con solo ADMIN permitido para login
- **Contraseñas encriptadas** usando bcrypt
- **Protección de endpoints** - todos los endpoints API requieren autenticación excepto `/build-bid/:id/:platform`
- **Tokens de acceso únicos** para el endpoint `/build-bid` con expiración de 24 horas

## Configuración

### Variables de Entorno

```bash
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

### Estructura de Base de Datos

La tabla `users` fue modificada para incluir:
- `system_password` (VARCHAR(255)) - Contraseña encriptada para el sistema
- `role` (ENUM('ADMIN', 'USER')) - Rol del usuario, solo ADMIN puede hacer login

Nueva tabla `access_tokens` para tokens de acceso temporal:
- `token` (VARCHAR(255)) - Token JWT único
- `project_id` (INT) - ID del proyecto
- `platform` (ENUM) - Plataforma (workana/upwork)
- `user_id` (INT) - ID del usuario
- `expires_at` (DATETIME) - Fecha de expiración
- `used_at` (DATETIME) - Fecha de uso (nullable)

## Creación de Usuarios Admin

Para crear un usuario administrador, ejecuta:

```bash
node scripts/create-admin.js
```

Este script te pedirá:
- Email de Workana
- Contraseña de Workana
- Contraseña del sistema
- Directivas de propuesta (opcional)
- Perfil profesional (opcional)
- Usuario de Telegram (opcional)

## Autenticación

### Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "system_password"
}
```

**Response (exitoso):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### Uso del Token

Para acceder a endpoints protegidos, incluye el token en el header Authorization:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints Protegidos

Todos los endpoints API requieren autenticación JWT y rol ADMIN, excepto:

- `GET /health` - Health check
- `POST /api/auth/login` - Login
- `GET /build-bid/:id/:platform` - Envío de propuesta (protegido con token de acceso)

### Endpoints Principales Protegidos

- `POST /api/workana/scrape` - Scraping de Workana
- `POST /api/upwork/scrape` - Scraping de Upwork
- `POST /api/workana/login` - Login en Workana
- `POST /api/workana/proposal` - Envío de propuesta
- `GET /api/stats` - Estadísticas
- `GET /api/projects/*` - Gestión de proyectos
- `GET /api/users/*` - Gestión de usuarios
- `GET /api/logs/*` - Logs del sistema

## Sistema de Tokens de Acceso

Para el endpoint `/build-bid/:id/:platform`, se usa un sistema de tokens de acceso temporal:

### Generar Token de Acceso

**Endpoint:** `POST /api/auth/generate-access-token`

**Headers:** `Authorization: Bearer <admin_jwt_token>`

**Request:**
```json
{
  "projectId": 123,
  "platform": "workana",
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access token generado exitosamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "url": "http://localhost:3000/build-bid/123/workana?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Uso del Token de Acceso

El token se usa automáticamente en la URL generada. El endpoint `/build-bid/:id/:platform` verifica:

1. **Validez del token** - JWT válido y no expirado
2. **Coincidencia de parámetros** - projectId y platform coinciden con el token
3. **Uso único** - el token se marca como usado después del primer uso
4. **Expiración** - tokens expiran en 24 horas

## Pruebas

Para probar el sistema de autenticación:

```bash
# Probar endpoints protegidos
node scripts/test-auth.js

# Crear usuario admin
node scripts/create-admin.js
```

## Seguridad

- **Contraseñas encriptadas** con bcrypt (salt rounds: 10)
- **Tokens JWT** con expiración configurable
- **Tokens de acceso únicos** para prevenir reutilización
- **Validación de roles** - solo usuarios ADMIN pueden hacer login
- **Protección CORS** configurada para requests cross-origin
- **Logs de seguridad** para intentos de login y accesos no autorizados

## Troubleshooting

### Token Inválido
- Verifica que el token no haya expirado
- Asegúrate de incluir "Bearer " antes del token
- Verifica que JWT_SECRET esté configurado correctamente

### No Puedo Hacer Login
- Verifica que el usuario tenga rol ADMIN
- Verifica que la contraseña sea correcta
- Verifica que el usuario esté activo (is_active = 1)

### /build-bid No Funciona
- Verifica que el token de acceso no haya expirado
- Verifica que los parámetros (projectId, platform) coincidan con el token
- Verifica que el token no haya sido usado previamente