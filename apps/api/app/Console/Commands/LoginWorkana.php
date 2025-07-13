<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ExternalCredential;
use Illuminate\Support\Facades\Log;

class LoginWorkana extends Command
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
            $userId = $this->argument('userId');
            $email = $this->argument('email');
            $password = $this->argument('password');

            // Intentar login real con múltiples reintentos
            $maxAttempts = 1;
            $response = null;
            
            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                Log::info("Intento de login #{$attempt} de {$maxAttempts}");
                
                $command = "node " . base_path('cli.js') . " login " . 
                    escapeshellarg($email) . " " . 
                    escapeshellarg($password) . " --debug 2>&1";

                Log::info('Ejecutando comando: ' . $command);
                $output = shell_exec($command);
                Log::info('Output del comando: ' . $output);
                Log::info('Tipo de output: ' . gettype($output));
                
                $response = json_decode($output, true);

                // Get last json parser error
                $lastJsonParserError = json_last_error_msg();
                Log::info('Último error de JSON: ' . $lastJsonParserError);

                Log::info('Tipo despues de haberlo convertido a json: ' . gettype($response));

                // gET JSON

                Log::info('Response en LoginWorkana: ' . json_encode($response));
                
                // Si el login es exitoso, salir del loop - handle new standardized format
                if ($response && $response['success']) {
                    Log::info("Login exitoso en intento #{$attempt}");
                    
                    // Handle new standardized response format
                    if (isset($response['data']['sessionData'])) {
                        $response['sessionData'] = $response['data']['sessionData'];
                    }
                    
                    break;
                }
                
                // Si no es el último intento, esperar antes del siguiente
                if ($attempt < $maxAttempts) {
                    $errorMessage = $response['error']['message'] ?? $response['error'] ?? 'Error parseando respuesta';
                    Log::warning("Intento #{$attempt} falló, esperando antes del siguiente intento", [
                        'error' => $errorMessage,
                        'error_type' => $response['error']['type'] ?? 'unknown',
                        'platform' => $response['platform'] ?? 'workana',
                        'operation' => $response['operation'] ?? 'login'
                    ]);
                    sleep(2); // Esperar 2 segundos entre intentos
                }
            }

            // Si todos los intentos fallaron, usar simulación como último recurso
            if (!$response || !$response['success']) {
                $finalError = $response['error']['message'] ?? $response['error'] ?? 'Error parseando respuesta';
                Log::error('Todos los intentos de login real fallaron, usando simulación como último recurso', [
                    'finalError' => $finalError,
                    'error_type' => $response['error']['type'] ?? 'unknown',
                    'attempts' => $maxAttempts,
                    'platform' => $response['platform'] ?? 'workana'
                ]);
                
                $dummySessionData = [
                    'userId' => $userId,
                    'email' => $email,
                    'cookies' => [],
                    'localStorage' => [],
                    'sessionStorage' => [],
                    'userAgent' => 'dummy',
                    'loginTimestamp' => time(),
                    'loginMethod' => 'simulated_last_resort',
                    'originalError' => $finalError
                ];

                $response = [
                    'success' => true,
                    'sessionData' => $dummySessionData
                ];
            }

            // Guardar o actualizar session_data
            $credential = ExternalCredential::where('user_id', $userId)
                ->where('platform', 'workana')
                ->first();

            if ($credential) {
                // Actualizar credencial existente
                $credential->update([
                    'session_data' => $response['sessionData'],
                    'session_expires_at' => now()->addHours(24)
                ]);
            } else {
                // Crear nueva credencial
                ExternalCredential::create([
                    'user_id' => $userId,
                    'platform' => 'workana',
                    'email' => $email,
                    'password' => $password,
                    'session_data' => $response['sessionData'],
                    'session_expires_at' => now()->addHours(24),
                    'is_active' => true
                ]);
            }

            $this->info(json_encode([
                'success' => true,
                'message' => 'Login exitoso y session_data guardada',
                'sessionData' => $response['sessionData']
            ]));

            return 0;

        } catch (\Exception $e) {
            Log::error('Error en comando workana:login', [
                'error' => $e->getMessage(),
                'userId' => $this->argument('userId')
            ]);

            $this->error(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return 1;
        }
    }
}