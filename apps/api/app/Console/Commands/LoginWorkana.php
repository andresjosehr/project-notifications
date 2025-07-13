<?php

namespace App\Console\Commands;

use App\Models\ExternalCredential;

class LoginWorkana extends BaseCommand
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'workana:login {userId} {email} {password}';

    /**
     * The console command description.
     */
    protected $description = 'Ejecutar login de Workana usando NodeJS CLI y guardar session_data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            if (!$this->validateRequiredArguments(['userId', 'email', 'password'])) {
                return 1;
            }

            $userId = $this->argument('userId');
            $email = $this->argument('email');
            $password = $this->argument('password');

            $startTime = microtime(true);
            $maxAttempts = 1;
            $response = null;
            
            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                $command = "cd " . base_path() . " && node " . base_path('cli.js') . " login " . 
                    escapeshellarg($email) . " " . 
                    escapeshellarg($password) . " --debug 2>&1";

                $response = $this->executeNodeCommand($command, [
                    'attempt' => $attempt,
                    'userId' => $userId,
                    'operation' => 'login'
                ]);

                if ($response['success']) {
                    // Handle new standardized response format
                    if (isset($response['data']['sessionData'])) {
                        $response['sessionData'] = $response['data']['sessionData'];
                    }
                    break;
                }
                
                if ($attempt < $maxAttempts) {
                    $errorMessage = $response['error']['message'] ?? $response['error'] ?? 'Error parseando respuesta';
                    $this->logWarning("Intento #{$attempt} falló, esperando antes del siguiente intento", [
                        'error' => $errorMessage,
                        'error_type' => $response['error']['type'] ?? 'unknown',
                        'operation' => 'login'
                    ]);
                    sleep(2);
                }
            }

            if (!$response['success']) {
                $errorMessage = $response['error']['message'] ?? $response['error'] ?? 'Error parseando respuesta';
                $this->logWarning('Todos los intentos de login fallaron', [
                    'error' => $errorMessage,
                    'error_type' => $response['error']['type'] ?? 'unknown',
                    'attempts' => $maxAttempts
                ]);
                
                $error = $this->standardError($errorMessage, $response['error']['type'] ?? 'login_failed', [
                    'attempts' => $maxAttempts,
                    'operation' => 'login'
                ]);
                
                $this->error(json_encode($error, JSON_UNESCAPED_UNICODE));
                return 1;
            }

            $this->saveCredentials($userId, $email, $password, $response['sessionData']);

            $duration = (microtime(true) - $startTime) * 1000;
            
            return $this->handleSuccess([
                'operation' => 'login',
                'message' => 'Login exitoso y session_data guardada',
                'data' => ['sessionData' => $response['sessionData']],
                'duration' => round($duration, 2)
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, [
                'userId' => $this->argument('userId'),
                'operation' => 'login'
            ]);
        }
    }

    private function saveCredentials(string $userId, string $email, string $password, array $sessionData): void
    {
        $credential = ExternalCredential::where('user_id', $userId)
            ->where('platform', 'workana')
            ->first();

        if ($credential) {
            $credential->update([
                'session_data' => $sessionData,
                'session_expires_at' => now()->addHours(24)
            ]);
        } else {
            ExternalCredential::create([
                'user_id' => $userId,
                'platform' => 'workana',
                'email' => $email,
                'password' => $password,
                'session_data' => $sessionData,
                'session_expires_at' => now()->addHours(24),
                'is_active' => true
            ]);
        }
    }
}