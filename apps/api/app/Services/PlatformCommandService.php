<?php

namespace App\Services;

use App\Exceptions\GenericException;
use Illuminate\Support\Facades\Log;

class PlatformCommandService
{
    public function executeLogin(int $userId, string $email, string $password): array
    {
        $command = "cd " . base_path() . " && php artisan workana:login " .
            escapeshellarg($userId) . " " .
            escapeshellarg($email) . " " .
            escapeshellarg($password);
        
        $output = shell_exec($command . " 2>&1");

        Log::error('Queremos mostrar el output', [
            'output' => $output
        ]);

        $result = json_decode($output, true);

        
        // CAMBIO CRÍTICO: PlatformCommandService decide si lanzar excepción basándose en success
        if (!$result['success']) {
            Log::error('Error en comando de login', [
                'error' => $result
            ]);

            $errorMessage = $result['error']['message'] ?? 'Error desconocido en el comando de login';
            throw new GenericException($errorMessage);
        }
        
        return [
            'success' => true,
            'sessionData' => $result['data']['sessionData']
        ];
    }

    public function executeSendProposal(string $sessionData, string $proposalContent, string $projectLink): array
    {
        $command = "cd " . base_path() . " && php artisan workana:send-proposal " .
            escapeshellarg($sessionData) . " " .
            escapeshellarg($proposalContent) . " " .
            escapeshellarg($projectLink);
        
        $output = shell_exec($command . " 2>&1");

        Log::error('Queremos mostrar el output', [
            'output' => $output
        ]);

        $result = json_decode($output, true);

        
        // CAMBIO CRÍTICO: PlatformCommandService decide si lanzar excepción basándose en success
        if (!$result['success']) {
            Log::error('Error en envío de propuesta', [
                'error' => $result
            ]);

            $errorMessage = $result['error']['message'] ?? 'Error desconocido en el envío de propuesta';
            throw new GenericException($errorMessage);
        }
        
        return [
            'success' => true,
            'output' => $result['message'] ?? 'Propuesta enviada exitosamente'
        ];
    }

    private function ensureSessionDirectoryExists(): void
    {
        $sessionDir = storage_path('app/sessions');
        if (!file_exists($sessionDir)) {
            mkdir($sessionDir, 0755, true);
        }
    }
}