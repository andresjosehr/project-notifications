<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendWorkanaProposal extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'workana:send-proposal {session} {proposalText} {projectLink}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Enviar propuesta a Workana usando el CLI';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $session = $this->argument('session');
        $proposalText = $this->argument('proposalText');
        $projectLink = $this->argument('projectLink');
        
        $this->info('Enviando propuesta a Workana...');
        
        try {
            // Verificar si el primer argumento es un archivo de sesión en storage
            $sessionData = $session;
            if (file_exists($session) && is_readable($session)) {
                // Si es un archivo de sesión, pasar la ruta directamente
                $sessionData = $session;
                $this->line("Usando archivo de sesión en storage: {$session}");
            }
            
            // Ruta al CLI
            $cliPath = base_path('cli.js');
            
            // Construir comando
            $command = "node {$cliPath} sendProposal " .
                escapeshellarg($sessionData) . " " .
                escapeshellarg($proposalText) . " " .
                escapeshellarg($projectLink);
            
            $this->line("Ejecutando: {$command}");
            
            // Ejecutar comando
            $output = shell_exec($command);
            $result = json_decode($output, true);
            
            if ($result && $result['success']) {
                $this->info('✅ Propuesta enviada exitosamente');
                
                // Handle new standardized response format
                if (isset($result['duration'])) {
                    $this->line("Duración: {$result['duration']}ms");
                }
                
                if (isset($result['platform'])) {
                    $this->line("Plataforma: {$result['platform']}");
                }
                
                if (isset($result['operation'])) {
                    $this->line("Operación: {$result['operation']}");
                }
                
                // Check for data in new format
                $data = $result['data'] ?? [];
                if (isset($data['projectLink'])) {
                    $this->line("Proyecto: {$data['projectLink']}");
                }
                
                // Legacy format support
                if (isset($result['projectLink'])) {
                    $this->line("Proyecto: {$result['projectLink']}");
                }
                
                if (isset($result['message'])) {
                    $this->line("Mensaje: {$result['message']}");
                }
                
                return 0;
            } else {
                // Handle new standardized error format
                $errorMessage = $result['error']['message'] ?? $result['error'] ?? 'Error desconocido enviando propuesta';
                $errorType = $result['error']['type'] ?? 'unknown';
                
                $this->error("❌ Error enviando propuesta: {$errorMessage}");
                
                Log::error('Error enviando propuesta a Workana', [
                    'error' => $errorMessage,
                    'error_type' => $errorType,
                    'platform' => $result['platform'] ?? 'workana',
                    'operation' => $result['operation'] ?? 'send_proposal',
                    'result' => $result
                ]);
                
                return 1;
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Error ejecutando comando: {$e->getMessage()}");
            
            Log::error('Error ejecutando comando de propuesta', [
                'error' => $e->getMessage(),
                'session' => $session,
                'proposalText' => $proposalText
            ]);
            
            return 1;
        }
    }
}
