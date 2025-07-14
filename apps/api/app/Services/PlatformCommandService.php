<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class PlatformCommandService
{
    public function executeLogin(int $userId, string $email, string $password): array
    {
        try {
            $command = "cd " . base_path() . " && php artisan workana:login " .
                escapeshellarg($userId) . " " .
                escapeshellarg($email) . " " .
                escapeshellarg($password) . " 2>&1";
            
            Log::info('Ejecutando comando de login', ['userId' => $userId]);
            $output = shell_exec($command);
            Log::info('Output del comando de login', ['output' => $output]);
            
            $response = json_decode($output, true);
            
            if (!$response || !$response['success']) {
                Log::error('Error en comando de login', [
                    'output' => $output,
                    'response' => $response
                ]);
                $errorMessage = $response['error'] ?? 'Error ejecutando comando de login: ' . $output;
                if (is_array($errorMessage)) {
                    $errorMessage = json_encode($errorMessage);
                }
                return [
                    'success' => false,
                    'error' => $errorMessage
                ];
            }
            
            return [
                'success' => true,
                'sessionData' => $response['sessionData']
            ];
            
        } catch (\Exception $e) {
            Log::error('Excepción al ejecutar login', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function executeSendProposal(string $sessionData, string $proposalContent, string $projectLink): array
    {
        try {
            $sessionFileName = 'session_' . uniqid() . '.json';
            $sessionFilePath = storage_path('app/sessions/' . $sessionFileName);
            
            $this->ensureSessionDirectoryExists();
            
            file_put_contents($sessionFilePath, $sessionData);
            
            $command = "cd " . base_path() . " && php artisan workana:send-proposal " .
                escapeshellarg($sessionFilePath) . " " .
                escapeshellarg($proposalContent) . " " .
                escapeshellarg($projectLink);
            
            Log::info('Ejecutando comando de envío de propuesta');
            $output = shell_exec($command . " 2>&1");
            Log::info('Output del comando de envío', ['output' => $output]);
            
            $this->cleanupSessionFile($sessionFilePath);
            
            return $this->parseCommandOutput($output);
            
        } catch (\Exception $e) {
            if (isset($sessionFilePath)) {
                $this->cleanupSessionFile($sessionFilePath);
            }
            
            Log::error('Excepción en envío de propuesta', ['error' => $e->getMessage()]);
            
            return [
                'success' => false,
                'error' => 'Excepción durante el envío de propuesta: ' . $e->getMessage()
            ];
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
        $jsonResponse = json_decode($output, true);
        
        if ($jsonResponse && isset($jsonResponse['success'])) {
            if ($jsonResponse['success']) {
                return [
                    'success' => true,
                    'output' => $jsonResponse['message'] ?? 'Propuesta enviada exitosamente'
                ];
            } else {
                Log::error('Error en envío de propuesta', [
                    'error' => $jsonResponse['error'] ?? 'Error desconocido'
                ]);
                
                return [
                    'success' => false,
                    'error' => $jsonResponse['error'] ?? 'Error desconocido en el envío de propuesta'
                ];
            }
        }
        
        Log::error('Output no es JSON válido', [
            'output' => $output
        ]);
        
        return [
            'success' => false,
            'error' => 'Respuesta inválida del comando: ' . $output
        ];
    }
}