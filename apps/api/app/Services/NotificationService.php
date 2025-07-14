<?php

namespace App\Services;

use App\Exceptions\GenericException;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected $telegramService;

    public function __construct()
    {
        $this->telegramService = new TelegramService();
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
        $results = [];
        
        // Distribuir notificación a Telegram
        $telegramResult = $this->telegramService->sendProjectNotification($project, $user, $options);
        $results['telegram'] = $telegramResult;

        // Aquí se pueden agregar más servicios (email, SMS, etc.)
        // $emailResult = $this->emailService->sendProjectNotification($project, $user, $options);
        // $results['email'] = $emailResult;

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $totalServices = count($results);
        
        // Log removido - información innecesaria en producción

        return [
            'success' => $successCount > 0,
            'results' => $results,
            'services_attempted' => $totalServices,
            'services_successful' => $successCount
        ];
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
        $results = [];
        
        // Distribuir notificación de error a Telegram
        $telegramResult = $this->telegramService->sendErrorNotification($error, $context, $user);
        $results['telegram'] = $telegramResult;

        // Aquí se pueden agregar más servicios
        // $emailResult = $this->emailService->sendErrorNotification($error, $context, $user);
        // $results['email'] = $emailResult;

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $totalServices = count($results);

        // Log removido - información innecesaria en producción

        return [
            'success' => $successCount > 0,
            'results' => $results,
            'services_attempted' => $totalServices,
            'services_successful' => $successCount
        ];
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
        $results = [];
        
        // Distribuir notificación de estado a Telegram
        $telegramResult = $this->telegramService->sendStatusNotification($message, $user);
        $results['telegram'] = $telegramResult;

        // Aquí se pueden agregar más servicios
        // $emailResult = $this->emailService->sendStatusNotification($message, $user);
        // $results['email'] = $emailResult;

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $totalServices = count($results);

        // Log removido - información innecesaria en producción

        return [
            'success' => $successCount > 0,
            'results' => $results,
            'services_attempted' => $totalServices,
            'services_successful' => $successCount
        ];
    }
}