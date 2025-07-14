<?php

namespace App\Console\Commands;

use App\Exceptions\GenericException;

class SendWorkanaProposal extends BaseCommand
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
        if (!$this->validateRequiredArguments(['session', 'proposalText', 'projectLink'])) {
            return 1;
        }

        $session = $this->argument('session');
        $proposalText = $this->argument('proposalText');
        $projectLink = $this->argument('projectLink');
        
        $startTime = microtime(true);
        $sessionData = $session;
        $result = $this->executeProposalCommand($sessionData, $proposalText, $projectLink);
        $duration = (microtime(true) - $startTime) * 1000;

        if (!$result['success']) {
            $errorMessage = $result['error']['message'] ?? $result['error'] ?? 'Error desconocido enviando propuesta';
            
            $error = $this->standardError($errorMessage, $result['error']['type'] ?? 'send_proposal_failed', [
                'operation' => 'send_proposal'
            ]);
            
            $this->error(json_encode($error, JSON_UNESCAPED_UNICODE));
            return 1;
        }
        
        return $this->handleSuccess([
            'operation' => 'send_proposal',
            'message' => 'Propuesta enviada exitosamente',
            'data' => [
                'projectLink' => $result['data']['projectLink'] ?? $result['projectLink'] ?? $projectLink
            ],
            'duration' => round($duration, 2)
        ]);
    }

    private function prepareSessionData(string $session): string
    {
        $this->line("Usando contenido directo de sesión");
        return $session;
    }

    private function executeProposalCommand(string $sessionData, string $proposalText, string $projectLink): array
    {
        $cliPath = base_path('cli.js');
        
        $command = "cd " . base_path() . " && node {$cliPath} sendProposal " .
            escapeshellarg($sessionData) . " " .
            escapeshellarg($proposalText) . " " .
            escapeshellarg($projectLink);
        
        return $this->executeNodeCommand($command, ['operation' => 'send_proposal']);
    }
}
