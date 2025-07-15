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
            escapeshellarg($password) . " 2>&1";
        
        // Log removido - información innecesaria en producción
        $output = shell_exec($command);
        // Log removido - información innecesaria en producción
        
        $response = json_decode($output, true);
        
        if (!$response) {
            Log::error('Error parseando respuesta de comando de login', [
                'output' => $output
            ]);
            throw new GenericException('Error parseando respuesta del comando de login: ' . $output);
        }

        // CAMBIO CRÍTICO: PlatformCommandService decide si lanzar excepción basándose en success
        if (!$response['success']) {
            Log::error('Error en comando de login', [
                'output' => $output,
                'response' => $response
            ]);
            $errorMessage = $response['error'] ?? 'Error ejecutando comando de login: ' . $output;
            if (is_array($errorMessage)) {
                $errorMessage = json_encode($errorMessage);
            }
            throw new GenericException($errorMessage);
        }
        
        return [
            'success' => true,
            'sessionData' => $response['data']['sessionData']
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