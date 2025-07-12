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
    protected $signature = 'workana:send-proposal {session} {proposalText}';

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
        
        $this->info('Enviando propuesta a Workana...');
        
        try {
            // Ruta al CLI
            $cliPath = base_path('apps/api2/cli.js');
            
            // Construir comando
            $command = "node {$cliPath} sendProposal " .
                "'" . addslashes($session) . "' " .
                "'" . addslashes($proposalText) . "'";
            
            $this->line("Ejecutando: {$command}");
            
            // Ejecutar comando
            $output = shell_exec($command);
            $result = json_decode($output, true);
            
            if ($result && $result['success']) {
                $this->info('✅ Propuesta enviada exitosamente');
                $this->line("Duración: {$result['duration']}ms");
                $this->line("Plataforma: {$result['platform']}");
                
                if (isset($result['data']['projectTitle'])) {
                    $this->line("Proyecto: {$result['data']['projectTitle']}");
                }
                
                if (isset($result['data']['userEmail'])) {
                    $this->line("Usuario: {$result['data']['userEmail']}");
                }
                
                return 0;
            } else {
                $errorMessage = $result['error']['message'] ?? 'Error desconocido enviando propuesta';
                $this->error("❌ Error enviando propuesta: {$errorMessage}");
                
                Log::error('Error enviando propuesta a Workana', [
                    'error' => $errorMessage,
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
