<?php

namespace App\Services;

use App\Exceptions\GenericException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class TelegramService
{
    protected $apiUrl;
    protected $defaultTimeout;
    protected $enabled;

    public function __construct()
    {
        $this->apiUrl = Config::get('services.telegram.api_url', 'http://api.callmebot.com/text.php');
        $this->defaultTimeout = Config::get('services.telegram.timeout', 10000);
        $this->enabled = Config::get('services.telegram.enabled', true);
    }

    /**
     * Envía un mensaje a través de Telegram usando CallMeBot
     *
     * @param string $message
     * @param string $user
     * @param array $options
     * @return array
     */
    public function sendMessage($message, $user, $options = [])
    {
        if (!$this->enabled) {
            // Log removido - información innecesaria en producción
            return ['success' => false, 'error' => 'Telegram está deshabilitado'];
        }

        if (!$user) {
            Log::warning('No se proporcionó un usuario para enviar notificación', ['user' => $user]);
            return ['success' => false, 'error' => 'No se proporcionó un usuario para enviar notificación'];
        }

        // Codificar el mensaje y usuario para la URL
        $encodedMessage = urlencode($message);
        $encodedUser = urlencode($user);
        
        // Construir la URL de CallMeBot
        $url = "{$this->apiUrl}?user={$encodedUser}&text={$encodedMessage}";

        // Log removido - información innecesaria en producción

        $response = Http::timeout($options['timeout'] ?? $this->defaultTimeout)
            ->get($url);

        if ($response->successful()) {
            // Log removido - información innecesaria en producción
            return ['success' => true, 'response' => $response->body()];
        } else {
            Log::error('Error enviando notificación de Telegram', [
                'status' => $response->status(),
                'body' => $response->body(),
                'user' => $user
            ]);
            return [
                'success' => false, 
                'error' => "Telegram API respondió con status {$response->status()}: {$response->body()}"
            ];
        }
    }

    /**
     * Envía una notificación de proyecto
     *
     * @param object $project
     * @param object $user
     * @param array $options
     * @return array
     */
    public function sendProjectNotification($project, $user, $options = [])
    {
        // Validar que el usuario tenga telegram_user configurado
        $telegramUser = $user->telegram_user ?? null;
        
        if (!$telegramUser) {
            Log::warning('Usuario sin telegram_user configurado', [
                'user_id' => $user->id ?? null,
                'project_id' => $project->id ?? null
            ]);
            return ['success' => false, 'error' => 'Usuario sin telegram_user configurado'];
        }

        $message = $this->formatProjectMessage($project, $user);
        return $this->sendMessage($message, $telegramUser, $options);
    }

    /**
     * Envía una notificación de error
     *
     * @param \Exception $error
     * @param string $context
     * @param object $user
     * @return array
     */
    public function sendErrorNotification($error, $context = '', $user = null)
    {
        // Si no hay usuario, no enviar notificación
        if (!$user) {
            // Log removido - información innecesaria en producción
            return ['success' => false, 'error' => 'Usuario no proporcionado'];
        }

        // Validar que el usuario tenga telegram_user configurado
        $telegramUser = $user->telegram_user ?? null;
        
        if (!$telegramUser) {
            Log::warning('Usuario sin telegram_user configurado para notificación de error', [
                'user_id' => $user->id ?? null,
                'context' => $context
            ]);
            return ['success' => false, 'error' => 'Usuario sin telegram_user configurado'];
        }

        $message = "🚨 ERROR EN SISTEMA DE NOTIFICACIONES 🚨\n\n";
        
        if ($context) {
            $message .= "Contexto: {$context}\n\n";
        }
        
        $message .= "Error: " . $error->getMessage() . "\n\n";
        $message .= "Timestamp: " . now()->format('Y-m-d H:i:s');

        return $this->sendMessage($message, $telegramUser);
    }

    /**
     * Envía una notificación de estado
     *
     * @param string $message
     * @param object $user
     * @return array
     */
    public function sendStatusNotification($message, $user = null)
    {
        // Si no hay usuario, no enviar notificación
        if (!$user) {
            // Log removido - información innecesaria en producción
            return ['success' => false, 'error' => 'Usuario no proporcionado'];
        }

        // Validar que el usuario tenga telegram_user configurado
        $telegramUser = $user->telegram_user ?? null;
        
        if (!$telegramUser) {
            Log::warning('Usuario sin telegram_user configurado para notificación de estado', [
                'user_id' => $user->id ?? null
            ]);
            return ['success' => false, 'error' => 'Usuario sin telegram_user configurado'];
        }

        return $this->sendMessage($message, $telegramUser);
    }

    /**
     * Formatea el mensaje de un proyecto
     *
     * @param object $project
     * @param object $user
     * @return string
     */
    protected function formatProjectMessage($project, $user = null)
    {
        $platform = strtoupper($project->platform);
        
        $message = "🚀 *{$platform}*\n\n";
        
        // Agregar información específica según la plataforma
        if ($project->platform === 'workana' && $project->price) {
            $message .= "💰 *Precio:* {$project->price}\n\n";
        } elseif ($project->platform === 'upwork' && $project->info) {
            $message .= "ℹ️ *Info:* {$project->info}\n\n";
        }
        
        $message .= "📋 *Título:*\n{$project->title}\n\n";
        
        if ($project->description) {
            $message .= "📝 *Descripción:*\n{$project->description}\n\n";
        }
        
        if ($project->client_name) {
            $message .= "👤 *Cliente:* {$project->client_name}\n\n";
        }
        
        if ($project->skills) {
            $skills = substr($project->skills, 0, 200);
            $message .= "🛠 *Habilidades:* {$skills}...\n\n";
        }
        
        $message .= "🔗 *Enlace del proyecto:*\n{$project->link}\n\n";
        
        // Agregar enlaces de propuesta con userId específico - Frontend Angular URL
        if ($project->id) {
            $frontendUrl = config('app.frontend_url', config('app.url'));
            
            // Construir URL del frontend Angular con path parameter
            $proposalUrl = $frontendUrl . '/proposal-review/' . $project->id;
            
            $message .= "📄 *Generar propuesta:*\n{$proposalUrl}";
        }
        
        return $message;
    }
} 