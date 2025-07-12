<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

# API2 - Sistema de Scraping y Propuestas

Sistema moderno de scraping y envío de propuestas para plataformas freelance, diseñado para integrarse con Laravel.

## Características

- **Scraping automático** de proyectos de Workana
- **Envío de propuestas** con sesión y texto personalizado
- **CLI integrado** para operaciones desde Laravel
- **Gestión de sesiones** para múltiples usuarios
- **Detección de idioma** automática
- **Logs detallados** para debugging

## Instalación

```bash
cd apps/api2
npm install
```

## Uso del CLI

### Scraping de proyectos

```bash
# Scraping básico
npm run scrape

# Scraping silencioso (solo errores)
npm run scrape:quiet

# Con opciones
node cli.js scrape-workana --quiet
```

### Envío de propuestas

```bash
# Envío con datos completos
npm run send-proposal -- --project-id "12345" --user-id 1 --session-data '{"cookies":[...]}' --proposal-content "Mi propuesta"

# Envío simple con sesión y texto
npm run sendProposal '{"cookies":[...]}' "Texto de la propuesta"
```

### Comando Artisan

```bash
# Envío de propuesta usando comando Artisan
php artisan workana:send-proposal '{"cookies":[...]}' "Texto de la propuesta"
```

## Endpoints de la API

### POST /api/proposal/send

Envía una propuesta usando sesión y texto personalizado.

**Parámetros:**
- `projectId` (string, requerido): ID del proyecto
- `userId` (integer, requerido): ID del usuario
- `proposalContent` (string, requerido): Texto de la propuesta
- `sessionData` (JSON, requerido): Datos de sesión (cookies, localStorage, etc.)

**Ejemplo de uso:**

```php
$response = Http::withToken('YOUR_TOKEN')
    ->post('/api/proposal/send', [
        'projectId' => '12345',
        'userId' => 1,
        'proposalContent' => 'Hola, me interesa tu proyecto...',
        'sessionData' => json_encode([
            'cookies' => [
                [
                    'name' => 'session_id',
                    'value' => 'abc123',
                    'domain' => '.workana.com'
                ]
            ]
        ])
    ]);
```

**Respuesta exitosa:**
```json
{
    "success": true,
    "message": "Propuesta enviada correctamente",
    "data": {
        "projectId": "12345",
        "userId": 1,
        "projectTitle": "Desarrollo de aplicación web",
        "userEmail": "usuario@email.com",
        "proposalSent": true
    }
}
```

### POST /api/proposal/send (Nuevo)

Envía una propuesta validando parámetros, sesión y ejecutando el comando Artisan.

**Parámetros:**
- `projectId` (string, requerido): ID del proyecto
- `userId` (integer, requerido): ID del usuario
- `proposalContent` (string, requerido): Texto de la propuesta
- `platform` (string, requerido): Plataforma (solo 'workana')

**Ejemplo de uso:**

```php
$response = Http::withToken('YOUR_TOKEN')
    ->post('/api/proposal/send', [
        'projectId' => '9',
        'userId' => 1,
        'proposalContent' => '**Propuesta Profesional: Desarrollo de una Herramienta de Ventas con Realidad Aumentada**',
        'platform' => 'workana'
    ]);
```

**Respuesta exitosa:**
```json
{
    "success": true,
    "message": "Propuesta enviada correctamente",
    "data": {
        "projectId": "9",
        "userId": 1,
        "platform": "workana",
        "proposalSent": true
    }
}
```

**Validaciones realizadas:**
- Parámetros requeridos
- Usuario existe
- Sesión disponible en ExternalCredential
- Datos de sesión válidos

### POST /api/proposal/generate

Genera una propuesta usando IA sin enviarla.

### POST /api/workana/scrape

Ejecuta scraping de proyectos de Workana.

## Integración con Laravel

### Servicio PHP

```php
<?php

namespace App\Services;

class WorkanaService
{
    public function sendProposal($projectId, $userId, $proposalContent, $sessionData)
    {
        $response = Http::withToken(config('services.workana.token'))
            ->post('/api/proposal/send', [
                'projectId' => $projectId,
                'userId' => $userId,
                'proposalContent' => $proposalContent,
                'sessionData' => json_encode($sessionData)
            ]);
            
        return $response->json();
    }
    
    public function scrapeProjects()
    {
        $response = Http::withToken(config('services.workana.token'))
            ->post('/api/workana/scrape');
            
        return $response->json();
    }
}
```

### Comando Artisan

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendWorkanaProposal extends Command
{
    protected $signature = 'workana:send-proposal {projectId} {userId} {proposalContent}';
    protected $description = 'Enviar propuesta a Workana';

    public function handle()
    {
        $projectId = $this->argument('projectId');
        $userId = $this->argument('userId');
        $proposalContent = $this->argument('proposalContent');
        
        // Obtener datos de sesión del usuario
        $sessionData = $this->getUserSessionData($userId);
        
        $result = app(WorkanaService::class)->sendProposal(
            $projectId,
            $userId,
            $proposalContent,
            $sessionData
        );
        
        if ($result['success']) {
            $this->info('Propuesta enviada exitosamente');
        } else {
            $this->error('Error: ' . $result['error']);
        }
    }
}
```

## Estructura de archivos

```
apps/api2/
├── cli.js                 # CLI principal
├── lib/
│   ├── services/
│   │   └── WorkanaService.js  # Servicio unificado
│   └── utils/
│       └── logger.js      # Sistema de logs
├── examples/
│   ├── laravel-integration.php
│   └── proposal-send-example.php
└── README.md
```

## Configuración

### Variables de entorno

```env
# Configuración del navegador
HEADLESS=true
DEBUG=false

# Configuración de logs
LOG_LEVEL=info
```

### Configuración de Laravel

```php
// config/services.php
'workana' => [
    'token' => env('WORKANA_API_TOKEN'),
    'base_url' => env('WORKANA_API_URL', 'http://localhost:3000'),
],
```

## Logs y debugging

Los logs se guardan en:
- `logs/app.log` - Logs generales
- `logs/error.log` - Logs de errores

Para habilitar debug mode:
```bash
node cli.js sendProposal --debug
```

## Ejemplos completos

Ver archivos en `examples/` para ejemplos detallados de integración.

# Workana CLI

Este CLI permite interactuar con Workana para scraping de proyectos y envío de propuestas.

## Comandos Disponibles

### 1. Login y Obtención de Sesión

```bash
node cli.js login <username> <password> [opciones]
```

**Parámetros:**
- `username`: Email del usuario de Workana
- `password`: Contraseña del usuario de Workana

**Opciones:**
- `--headless`: Ejecutar en modo headless (por defecto: true)
- `--debug`: Modo debug con más logs (por defecto: false)

**Ejemplo:**
```bash
node cli.js login usuario@ejemplo.com mi_contraseña --debug
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "platform": "workana",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": 5000,
  "login": {
    "success": true,
    "user": {
      "email": "usuario@ejemplo.com"
    },
    "message": "Login exitoso"
  },
  "session": {
    "success": true,
    "userId": 1,
    "sessionData": {
      "cookies": [...],
      "localStorage": {...},
      "timestamp": "2024-01-15T10:30:00.000Z",
      "platform": "workana"
    }
  }
}
```

### 2. Scraping de Proyectos

```bash
node cli.js scrape-workana [opciones]
```

**Opciones:**
- `-q, --quiet`: Modo silencioso (solo errores)

**Ejemplo:**
```bash
node cli.js scrape-workana
```

### 3. Envío de Propuesta

```bash
node cli.js send-proposal [opciones]
```

**Opciones requeridas:**
- `--project-id <id>`: ID del proyecto en Workana
- `--user-id <id>`: ID del usuario que enviará la propuesta

**Opciones opcionales:**
- `--session-data <json>`: Datos de sesión en formato JSON
- `--username <email>`: Email del usuario de Workana
- `--password <password>`: Contraseña del usuario de Workana
- `--proposal-content <text>`: Contenido personalizado de la propuesta
- `--auto-login`: Intentar auto-login si no hay sesión activa
- `--headless`: Ejecutar en modo headless (por defecto: true)
- `--debug`: Modo debug con más logs (por defecto: false)

### 4. Envío de Propuesta Simple

```bash
node cli.js sendProposal <session> <proposalText>
```

**Parámetros:**
- `session`: Datos de sesión en formato JSON
- `proposalText`: Texto de la propuesta

## Variables de Entorno

Para el comando `login`, puedes configurar las credenciales por defecto:

```bash
export WORKANA_USERNAME="tu_email@ejemplo.com"
export WORKANA_PASSWORD="tu_contraseña"
```

## Ejemplos de Uso

### 1. Obtener sesión de Workana
```bash
node cli.js login mi_usuario@workana.com mi_contraseña --debug
```

### 2. Scraping de proyectos
```bash
node cli.js scrape-workana
```

### 3. Enviar propuesta con sesión
```bash
# Primero obtener la sesión
SESSION_DATA=$(node cli.js login usuario@ejemplo.com contraseña | jq -r '.session.sessionData')

# Luego enviar propuesta
node cli.js sendProposal "$SESSION_DATA" "Hola, me interesa tu proyecto..."
```

## Notas Importantes

1. **CAPTCHA**: Si Workana detecta actividad automatizada, puede mostrar un CAPTCHA. En ese caso, usa `--headless=false` para completarlo manualmente.

2. **Sesiones**: Los datos de sesión incluyen cookies y localStorage que se pueden reutilizar para evitar hacer login repetidamente.

3. **Rate Limiting**: Respeta los límites de rate de Workana para evitar bloqueos.

4. **Debug**: Usa la opción `--debug` para obtener más información sobre el proceso de login y scraping.
