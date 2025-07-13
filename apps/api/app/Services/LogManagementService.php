<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class LogManagementService
{
    public function getAppLogs(): string
    {
        $logPath = storage_path('logs/laravel.log');
        
        if (file_exists($logPath)) {
            return file_get_contents($logPath);
        }
        
        return 'No hay logs disponibles';
    }

    public function getErrorLogs(): string
    {
        $logPath = storage_path('logs/error.log');
        
        if (file_exists($logPath)) {
            return file_get_contents($logPath);
        }
        
        return 'No hay logs de errores';
    }

    public function clearLogs(): array
    {
        $logFiles = [
            storage_path('logs/laravel.log'),
            storage_path('logs/error.log')
        ];
        
        $clearedCount = 0;
        foreach ($logFiles as $logFile) {
            if (file_exists($logFile)) {
                file_put_contents($logFile, '');
                $clearedCount++;
            }
        }
        
        return [
            'clearedCount' => $clearedCount,
            'message' => "{$clearedCount} archivos de log limpiados"
        ];
    }
}