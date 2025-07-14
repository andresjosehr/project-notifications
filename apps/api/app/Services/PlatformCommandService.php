<?php

namespace App\Services;

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
            throw new \Exception('Error parseando respuesta del comando de login: ' . $output);
        }

        // CAMBIO CRÍTICO: Si success es false, lanzar excepción inmediatamente
        if (!$response['success']) {
            Log::error('Error en comando de login', [
                'output' => $output,
                'response' => $response
            ]);
            $errorMessage = $response['error'] ?? 'Error ejecutando comando de login: ' . $output;
            if (is_array($errorMessage)) {
                $errorMessage = json_encode($errorMessage);
            }
            throw new \Exception($errorMessage);
        }
        
        return [
            'success' => true,
            'sessionData' => $response['data']['sessionData']
        ];
    }

    public function executeSendProposal(string $sessionData, string $proposalContent, string $projectLink): array
    {
        $sessionFileName = 'session_' . uniqid() . '.json';
        $sessionFilePath = storage_path('app/sessions/' . $sessionFileName);
        
        try {
            $this->ensureSessionDirectoryExists();
            
            file_put_contents($sessionFilePath, $sessionData);
            
            $command = "cd " . base_path() . " && php artisan workana:send-proposal " .
                escapeshellarg($sessionFilePath) . " " .
                escapeshellarg($proposalContent) . " " .
                escapeshellarg($projectLink);
            
            // Log removido - información innecesaria en producción
            $output = shell_exec($command . " 2>&1");
            // Log removido - información innecesaria en producción
            
            $this->cleanupSessionFile($sessionFilePath);
            
            return $this->parseCommandOutput($output);
            
        } catch (\Exception $e) {
            if (isset($sessionFilePath)) {
                $this->cleanupSessionFile($sessionFilePath);
            }
            
            Log::error('Excepción en envío de propuesta', ['error' => $e->getMessage()]);
            
            // CAMBIO CRÍTICO: Re-lanzar la excepción en lugar de devolver array de error
            throw $e;
        }
    }

    private function ensureSessionDirectoryExists(): void
    {
        $sessionDir = storage_path('app/sessions');
        if (!file_exists($sessionDir)) {
            mkdir($sessionDir, 0755, true);
        }
    }

    private function cleanupSessionFile(string $sessionFilePath): void
    {
        if (file_exists($sessionFilePath)) {
            unlink($sessionFilePath);
        }
    }

    private function parseCommandOutput(string $output): array
    {
        // Extraer la última línea que debería contener el JSON
        $lines = explode("\n", trim($output));
        $lastLine = end($lines);
        
        $jsonResponse = json_decode($lastLine, true);
        
        if (!$jsonResponse || !isset($jsonResponse['success'])) {
            Log::error('Output no es JSON válido', [
                'output' => $output,
                'lastLine' => $lastLine
            ]);
            throw new \Exception('Respuesta inválida del comando: ' . $output);
        }

        // CAMBIO CRÍTICO: Si success es false, lanzar excepción inmediatamente
        if (!$jsonResponse['success']) {
            Log::error('Error en envío de propuesta', [
                'error' => $jsonResponse['error'] ?? 'Error desconocido'
            ]);
            
            $errorMessage = $jsonResponse['error'] ?? 'Error desconocido en el envío de propuesta';
            throw new \Exception($errorMessage);
        }
        
        return [
            'success' => true,
            'output' => $jsonResponse['message'] ?? 'Propuesta enviada exitosamente'
        ];
    }
}