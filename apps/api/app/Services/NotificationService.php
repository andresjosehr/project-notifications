<?php

namespace App\Services;

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
        try {
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
        } catch (\Exception $e) {
            Log::error('Error en servicio de notificación de proyecto', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
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
        try {
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
        } catch (\Exception $e) {
            Log::error('Error en servicio de notificación de error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
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
        try {
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
        } catch (\Exception $e) {
            Log::error('Error en servicio de notificación de estado', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}