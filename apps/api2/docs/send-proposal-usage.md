# Comando send-proposal para Laravel

Este comando permite enviar propuestas a Workana desde Laravel usando datos de sesión proporcionados por el framework.

## Uso Básico

```bash
node cli.js send-proposal --project-id "12345" --user-id "1"
```

## Parámetros Requeridos

- `--project-id <id>`: ID del proyecto en Workana (puede ser el slug o URL completa)
- `--user-id <id>`: ID del usuario que enviará la propuesta

## Parámetros Opcionales

- `--session-data <json>`: Datos de sesión en formato JSON (cookies, localStorage, etc.)
- `--username <email>`: Email del usuario de Workana
- `--password <password>`: Contraseña del usuario de Workana
- `--proposal-content <text>`: Contenido personalizado de la propuesta
- `--auto-login`: Intentar auto-login si no hay sesión activa (por defecto: false)
- `--headless`: Ejecutar en modo headless (por defecto: true)
- `--debug`: Modo debug con más logs (por defecto: false)

## Ejemplos de Uso

### 1. Con datos de sesión desde Laravel

```php
// En Laravel
$sessionData = [
    'cookies' => [
        [
            'name' => 'session_id',
            'value' => 'abc123',
            'domain' => '.workana.com',
            'path' => '/'
        ],
        // ... más cookies
    ],
    'timestamp' => '2024-01-15T10:30:00Z'
];

$command = "node cli.js send-proposal " .
    "--project-id \"12345\" " .
    "--user-id \"1\" " .
    "--session-data '" . json_encode($sessionData) . "' " .
    "--debug";

$output = shell_exec($command);
$result = json_decode($output, true);
```

### 2. Con credenciales para auto-login

```php
// En Laravel
$command = "node cli.js send-proposal " .
    "--project-id \"12345\" " .
    "--user-id \"1\" " .
    "--username \"usuario@email.com\" " .
    "--password \"contraseña123\" " .
    "--auto-login " .
    "--debug";

$output = shell_exec($command);
$result = json_decode($output, true);
```

### 3. Con propuesta personalizada

```php
// En Laravel
$proposalContent = "Hola, me interesa mucho tu proyecto. " .
    "Tengo experiencia en este tipo de trabajos y puedo " .
    "ofrecerte una solución de calidad. ¿Podemos hablar más " .
    "sobre los detalles?";

$command = "node cli.js send-proposal " .
    "--project-id \"12345\" " .
    "--user-id \"1\" " .
    "--username \"usuario@email.com\" " .
    "--password \"contraseña123\" " .
    "--proposal-content \"" . addslashes($proposalContent) . "\" " .
    "--auto-login";

$output = shell_exec($command);
$result = json_decode($output, true);
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

## Integración con Laravel

### 1. Crear un Artisan Command

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
        
        $command = "node cli.js send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\"";
        
        // Agregar opciones si están presentes
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
        
        $output = shell_exec($command);
        $result = json_decode($output, true);
        
        if ($result['success']) {
            $this->info('✅ Propuesta enviada exitosamente');
            $this->line("Proyecto: {$result['data']['projectTitle']}");
            $this->line("Usuario: {$result['data']['userEmail']}");
        } else {
            $this->error('❌ Error enviando propuesta');
            $this->line("Error: {$result['error']['message']}");
        }
        
        return $result['success'] ? 0 : 1;
    }
}
```

### 2. Usar desde el código

```php
<?php

namespace App\Services;

class WorkanaProposalService
{
    public function sendProposal($projectId, $userId, $options = [])
    {
        $command = "node cli.js send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\"";
        
        // Agregar opciones
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
}
```

## Notas Importantes

1. **Validación de Sesión**: Laravel debe manejar toda la validación de sesión antes de llamar al comando.

2. **Seguridad**: Las credenciales se pasan como parámetros de línea de comandos. Considera usar variables de entorno o archivos temporales para mayor seguridad.

3. **Manejo de Errores**: Siempre verifica el campo `success` en la respuesta JSON.

4. **Timeout**: El comando puede tardar varios segundos en completarse. Considera ejecutarlo en background para proyectos largos.

5. **Debug**: Usa la opción `--debug` para obtener más información sobre el proceso de envío. 