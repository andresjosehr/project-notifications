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

# Workana Service para Laravel

Este proyecto proporciona un servicio unificado para Workana que maneja tanto el scraping de proyectos como el envío de propuestas, diseñado para integrarse con Laravel.

## Comandos Disponibles

### 1. Scraping de Proyectos

```bash
# Scraping básico
node cli.js scrape-workana

# Scraping silencioso (solo errores)
node cli.js scrape-workana --quiet

# Usando npm scripts
npm run scrape
npm run scrape:quiet
```

### 2. Envío de Propuestas

```bash
# Envío básico con credenciales
node cli.js send-proposal --project-id "12345" --user-id "1" --username "usuario@email.com" --password "contraseña" --auto-login

# Envío con datos de sesión
node cli.js send-proposal --project-id "12345" --user-id "1" --session-data '{"cookies":[...]}'

# Envío con propuesta personalizada
node cli.js send-proposal --project-id "12345" --user-id "1" --username "usuario@email.com" --password "contraseña" --proposal-content "Mi propuesta personalizada" --auto-login

# Modo debug
node cli.js send-proposal --project-id "12345" --user-id "1" --username "usuario@email.com" --password "contraseña" --debug
```

## Parámetros del Comando send-proposal

### Requeridos
- `--project-id <id>`: ID del proyecto en Workana (puede ser slug o URL completa)
- `--user-id <id>`: ID del usuario que enviará la propuesta

### Opcionales
- `--session-data <json>`: Datos de sesión en formato JSON
- `--username <email>`: Email del usuario de Workana
- `--password <password>`: Contraseña del usuario de Workana
- `--proposal-content <text>`: Contenido personalizado de la propuesta
- `--auto-login`: Intentar auto-login si no hay sesión activa
- `--headless`: Ejecutar en modo headless (por defecto: true)
- `--debug`: Modo debug con más logs

## Integración con Laravel

### 1. Instalación

```bash
# Clonar el repositorio en tu proyecto Laravel
cd apps/api2
npm install
```

### 2. Uso desde PHP

```php
<?php

namespace App\Services;

class WorkanaService
{
    public function sendProposal($projectId, $userId, $options = [])
    {
        $cliPath = base_path('apps/api2/cli.js');
        
        $command = "node {$cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\"";
        
        // Agregar opciones según sea necesario
        if (isset($options['session_data'])) {
            $command .= " --session-data '" . json_encode($options['session_data']) . "'";
        }
        
        if (isset($options['username'])) {
            $command .= " --username \"{$options['username']}\"";
        }
        
        if (isset($options['password'])) {
            $command .= " --password \"{$options['password']}\"";
        }
        
        if (isset($options['proposal_content'])) {
            $command .= " --proposal-content \"" . addslashes($options['proposal_content']) . "\"";
        }
        
        if (isset($options['auto_login']) && $options['auto_login']) {
            $command .= " --auto-login";
        }
        
        if (isset($options['debug']) && $options['debug']) {
            $command .= " --debug";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }

    public function scrapeProjects($options = [])
    {
        $cliPath = base_path('apps/api2/cli.js');
        
        $command = "node {$cliPath} scrape-workana";
        
        if (isset($options['quiet']) && $options['quiet']) {
            $command .= " --quiet";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }
}
```

### 3. Ejemplo de Controlador

```php
<?php

namespace App\Http\Controllers;

use App\Services\WorkanaService;
use Illuminate\Http\Request;

class WorkanaController extends Controller
{
    private $workanaService;
    
    public function __construct()
    {
        $this->workanaService = new WorkanaService();
    }
    
    public function sendProposal(Request $request)
    {
        $request->validate([
            'project_id' => 'required|string',
            'user_id' => 'required|integer',
            'proposal_content' => 'nullable|string'
        ]);
        
        // Obtener datos de sesión del usuario
        $sessionData = $this->getUserSessionData($request->user_id);
        
        $result = $this->workanaService->sendProposal(
            $request->project_id,
            $request->user_id,
            [
                'session_data' => $sessionData,
                'proposal_content' => $request->proposal_content,
                'debug' => config('app.debug')
            ]
        );
        
        if ($result['success']) {
            return response()->json([
                'success' => true,
                'message' => 'Propuesta enviada exitosamente',
                'data' => $result['data']
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Error enviando propuesta',
                'error' => $result['error']['message']
            ], 400);
        }
    }

    public function scrapeProjects(Request $request)
    {
        try {
            $result = $this->workanaService->scrapeProjects([
                'quiet' => !config('app.debug')
            ]);
            
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Proyectos obtenidos exitosamente',
                    'data' => $result['projects'],
                    'stats' => $result['stats']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error obteniendo proyectos',
                    'error' => $result['error']['message']
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
```

### 4. Artisan Command

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendWorkanaProposal extends Command
{
    protected $signature = 'workana:send-proposal 
                            {projectId : ID del proyecto en Workana}
                            {userId : ID del usuario}
                            {--session-data= : Datos de sesión en JSON}
                            {--username= : Email del usuario}
                            {--password= : Contraseña del usuario}
                            {--proposal-content= : Contenido personalizado de la propuesta}
                            {--auto-login : Intentar auto-login}
                            {--debug : Modo debug}';

    protected $description = 'Enviar propuesta a Workana';

    public function handle()
    {
        $projectId = $this->argument('projectId');
        $userId = $this->argument('userId');
        
        $cliPath = base_path('apps/api2/cli.js');
        
        $command = "node {$cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\"";
        
        // Agregar opciones según sea necesario
        if ($sessionData = $this->option('session-data')) {
            $command .= " --session-data '{$sessionData}'";
        }
        
        if ($username = $this->option('username')) {
            $command .= " --username \"{$username}\"";
        }
        
        if ($password = $this->option('password')) {
            $command .= " --password \"{$password}\"";
        }
        
        if ($proposalContent = $this->option('proposal-content')) {
            $command .= " --proposal-content \"" . addslashes($proposalContent) . "\"";
        }
        
        if ($this->option('auto-login')) {
            $command .= " --auto-login";
        }
        
        if ($this->option('debug')) {
            $command .= " --debug";
        }
        
        $this->info("Ejecutando comando: {$command}");
        
        $output = shell_exec($command);
        $result = json_decode($output, true);
        
        if ($result['success']) {
            $this->info('✅ Propuesta enviada exitosamente');
            $this->line("Proyecto: {$result['data']['projectTitle']}");
            $this->line("Usuario: {$result['data']['userEmail']}");
            $this->line("Duración: {$result['duration']}ms");
        } else {
            $this->error('❌ Error enviando propuesta');
            $this->line("Error: {$result['error']['message']}");
        }
        
        return $result['success'] ? 0 : 1;
    }
}
```

## Respuesta del Comando

El comando devuelve un JSON con la siguiente estructura:

### Éxito
```json
{
  "success": true,
  "platform": "workana",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": 15000,
  "projectId": "12345",
  "userId": "1",
  "data": {
    "projectId": "12345",
    "userId": 1,
    "userEmail": "usuario@email.com",
    "projectTitle": "Desarrollo de aplicación web",
    "message": "Propuesta enviada exitosamente",
    "proposalText": "Hola, he revisado tu proyecto..."
  },
  "error": null
}
```

### Error
```json
{
  "success": false,
  "platform": "workana",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "projectId": "12345",
  "userId": "1",
  "error": {
    "message": "No se encontró el área de texto de la propuesta",
    "type": "Error"
  },
  "data": null
}
```

## Características

- ✅ **Servicio Unificado**: Un solo servicio que maneja scraping y envío de propuestas
- ✅ **Scraping de Proyectos**: Obtención automática de proyectos de Workana
- ✅ **Envío de Propuestas**: Envío automático de propuestas con sesión o credenciales
- ✅ **Soporte para Sesiones**: Carga de datos de sesión desde Laravel
- ✅ **Auto-login**: Login automático con credenciales
- ✅ **Propuestas Personalizadas**: Contenido personalizado para propuestas
- ✅ **Modo Debug**: Para desarrollo y troubleshooting
- ✅ **Integración Fácil**: Con Laravel mediante comandos CLI
- ✅ **Respuestas JSON**: Estructuradas y fáciles de procesar
- ✅ **Manejo de Errores**: Robusto y detallado

## Arquitectura

### WorkanaService
El servicio unificado que extiende `BaseScraper` y proporciona:

1. **Scraping de Proyectos**: `scrapeProjectsList()`
2. **Gestión de Sesiones**: `loadSessionData()`, `login()`
3. **Envío de Propuestas**: `sendProposalByUserId()`
4. **Navegación Web**: Manejo de páginas y formularios

### Comandos CLI
- `scrape-workana`: Para obtener proyectos
- `send-proposal`: Para enviar propuestas

## Dependencias

- Node.js 16+
- Playwright
- Commander.js
- Franc (para detección de idioma)

## Instalación

```bash
npm install
```

## Notas Importantes

1. **Validación de Sesión**: Laravel debe manejar toda la validación de sesión antes de llamar al comando.

2. **Seguridad**: Las credenciales se pasan como parámetros de línea de comandos. Considera usar variables de entorno o archivos temporales para mayor seguridad.

3. **Manejo de Errores**: Siempre verifica el campo `success` en la respuesta JSON.

4. **Timeout**: El comando puede tardar varios segundos en completarse. Considera ejecutarlo en background para proyectos largos.

5. **Debug**: Usa la opción `--debug` para obtener más información sobre el proceso de envío.

## Documentación Adicional

- [Uso del comando send-proposal](docs/send-proposal-usage.md)
- [Ejemplos de integración](examples/laravel-integration.php)
