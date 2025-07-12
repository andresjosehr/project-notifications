# Sistema de Notificaciones

## Descripción General

El sistema de notificaciones ha sido refactorizado para ser más modular y extensible. Actualmente soporta Telegram a través de CallMeBot, pero está diseñado para facilitar la adición de otros canales de notificación en el futuro.

## Arquitectura

### NotificationService
El servicio principal que coordina las notificaciones. Actúa como un facade que instancia los servicios de notificación activos.

### TelegramService
Servicio específico para enviar notificaciones a través de Telegram usando la API de CallMeBot.

## Configuración

### Variables de Entorno

Agregar al archivo `.env`:

```env
# Telegram Configuration
TELEGRAM_API_URL=http://api.callmebot.com/text.php
TELEGRAM_TIMEOUT=10000
TELEGRAM_ENABLED=true
```

### Configuración en `config/services.php`

```php
'telegram' => [
    'api_url' => env('TELEGRAM_API_URL', 'http://api.callmebot.com/text.php'),
    'timeout' => env('TELEGRAM_TIMEOUT', 10000),
    'enabled' => env('TELEGRAM_ENABLED', true),
],
```

## Uso

### Enviar Notificación de Proyecto

```php
use App\Services\NotificationService;

$notificationService = new NotificationService();

$project = (object) [
    'id' => 123,
    'title' => 'Desarrollo Web Laravel',
    'platform' => 'workana',
    'price' => '$500 - $1000',
    'description' => 'Descripción del proyecto...',
    'client_name' => 'Cliente ABC',
    'skills' => 'PHP, Laravel, JavaScript',
    'link' => 'https://www.workana.com/project/123'
];

$user = User::find(1); // Usuario con telegram_user configurado

$result = $notificationService->sendProjectNotification($project, $user);

if ($result['success']) {
    echo "Notificación enviada exitosamente";
} else {
    echo "Error: " . $result['error'];
}
```

### Enviar Notificación de Error

```php
try {
    // Código que puede generar error
} catch (\Exception $e) {
    $result = $notificationService->sendErrorNotification($e, 'Contexto del error', $user);
}
```

### Enviar Notificación de Estado

```php
$message = "🔧 Sistema funcionando correctamente\n\nTimestamp: " . now()->format('Y-m-d H:i:s');
$result = $notificationService->sendStatusNotification($message, $user);
```

### Enviar Múltiples Notificaciones

```php
$projects = [$project1, $project2, $project3];
$options = ['delay' => 1000]; // Delay de 1 segundo entre notificaciones

$results = $notificationService->sendMultipleProjectNotifications($projects, $user, $options);

foreach ($results as $result) {
    if ($result['success']) {
        echo "Proyecto {$result['project_id']} notificado exitosamente\n";
    } else {
        echo "Error en proyecto {$result['project_id']}: {$result['error']}\n";
    }
}
```

## Comando de Prueba

Se ha creado un comando de Artisan para probar el sistema:

```bash
# Probar notificación de proyecto
php artisan test:notifications --type=project

# Probar notificación de error
php artisan test:notifications --type=error

# Probar notificación de estado
php artisan test:notifications --type=status --message="Mensaje personalizado"

# Probar health check
php artisan test:notifications --type=health

# Especificar usuario
php artisan test:notifications --user=1 --type=project
```

## Estructura de Respuesta

Todos los métodos del NotificationService retornan un array con la siguiente estructura:

```php
[
    'success' => true|false,
    'error' => 'Mensaje de error (solo si success = false)',
    'response' => 'Respuesta de la API (solo si success = true)'
]
```

## Health Check

```php
$health = $notificationService->healthCheck();

if ($health['healthy']) {
    echo "Sistema de notificaciones saludable";
} else {
    echo "Error: " . $health['error'];
}
```

## Logging

El sistema registra automáticamente todas las operaciones:

- **Info**: Notificaciones enviadas exitosamente
- **Warning**: Usuarios sin telegram_user configurado, usuarios inactivos
- **Error**: Errores en el envío de notificaciones

## Extensibilidad

Para agregar un nuevo canal de notificación:

1. Crear un nuevo servicio (ej: `WhatsAppService`)
2. Implementar los métodos requeridos (`sendMessage`, `sendProjectNotification`, etc.)
3. Modificar `NotificationService` para instanciar el nuevo servicio
4. Agregar configuración en `config/services.php`

## CallMeBot Setup

Para usar CallMeBot:

1. Buscar @callmebot en Telegram
2. Enviar `/start`
3. Obtener tu API key
4. Usar la API key como `telegram_user` en la base de datos

La URL de CallMeBot es: `http://api.callmebot.com/text.php?user=YOUR_API_KEY&text=MESSAGE` 