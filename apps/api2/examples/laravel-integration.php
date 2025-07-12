<?php

/**
 * Ejemplo de integración con Laravel para usar el servicio unificado de Workana
 * 
 * Este archivo muestra cómo integrar el servicio unificado desde Laravel
 */

namespace App\Services;

class WorkanaService
{
    private $cliPath;
    
    public function __construct()
    {
        // Ruta al CLI de Node.js
        $this->cliPath = base_path('apps/api2/cli.js');
    }
    
    /**
     * Enviar propuesta a Workana usando datos de sesión
     */
    public function sendProposalWithSession($projectId, $userId, $sessionData, $options = [])
    {
        $command = "node {$this->cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\" " .
            "--session-data '" . json_encode($sessionData) . "'";
        
        // Agregar opciones adicionales
        if (isset($options['debug']) && $options['debug']) {
            $command .= " --debug";
        }
        
        if (isset($options['headless']) && !$options['headless']) {
            $command .= " --headless false";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }
    
    /**
     * Enviar propuesta a Workana usando credenciales
     */
    public function sendProposalWithCredentials($projectId, $userId, $username, $password, $options = [])
    {
        $command = "node {$this->cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\" " .
            "--username \"{$username}\" " .
            "--password \"{$password}\" " .
            "--auto-login";
        
        // Agregar propuesta personalizada si se proporciona
        if (isset($options['proposal_content'])) {
            $command .= " --proposal-content \"" . addslashes($options['proposal_content']) . "\"";
        }
        
        // Agregar opciones adicionales
        if (isset($options['debug']) && $options['debug']) {
            $command .= " --debug";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }
    
    /**
     * Enviar propuesta con contenido personalizado
     */
    public function sendCustomProposal($projectId, $userId, $proposalContent, $options = [])
    {
        $command = "node {$this->cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\" " .
            "--proposal-content \"" . addslashes($proposalContent) . "\"";
        
        // Agregar credenciales si se proporcionan
        if (isset($options['username']) && isset($options['password'])) {
            $command .= " --username \"{$options['username']}\" " .
                       "--password \"{$options['password']}\" " .
                       "--auto-login";
        }
        
        // Agregar datos de sesión si se proporcionan
        if (isset($options['session_data'])) {
            $command .= " --session-data '" . json_encode($options['session_data']) . "'";
        }
        
        // Agregar opciones adicionales
        if (isset($options['debug']) && $options['debug']) {
            $command .= " --debug";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }

    /**
     * Scraping de proyectos de Workana
     */
    public function scrapeProjects($options = [])
    {
        $command = "node {$this->cliPath} scrape-workana";
        
        if (isset($options['quiet']) && $options['quiet']) {
            $command .= " --quiet";
        }
        
        $output = shell_exec($command);
        return json_decode($output, true);
    }
}

// Ejemplo de uso en un controlador de Laravel
class WorkanaController extends Controller
{
    private $workanaService;
    
    public function __construct()
    {
        $this->workanaService = new WorkanaService();
    }
    
    /**
     * Enviar propuesta usando datos de sesión guardados
     */
    public function sendProposal(Request $request)
    {
        $request->validate([
            'project_id' => 'required|string',
            'user_id' => 'required|integer',
            'proposal_content' => 'nullable|string'
        ]);
        
        try {
            // Obtener datos de sesión del usuario desde la base de datos
            $user = User::findOrFail($request->user_id);
            $sessionData = $this->getUserSessionData($user);
            
            $options = [
                'debug' => config('app.debug'),
                'proposal_content' => $request->proposal_content
            ];
            
            $result = $this->workanaService->sendProposalWithSession(
                $request->project_id,
                $request->user_id,
                $sessionData,
                $options
            );
            
            if ($result['success']) {
                // Guardar registro de propuesta enviada
                $this->saveProposalRecord($request->user_id, $request->project_id, $result['data']['proposalText']);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Propuesta enviada exitosamente',
                    'data' => $result['data']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error enviando propuesta',
                    'error' => $result['error']['message']
                ], 400);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Enviar propuesta usando credenciales
     */
    public function sendProposalWithCredentials(Request $request)
    {
        $request->validate([
            'project_id' => 'required|string',
            'user_id' => 'required|integer',
            'username' => 'required|email',
            'password' => 'required|string',
            'proposal_content' => 'nullable|string'
        ]);
        
        try {
            $options = [
                'debug' => config('app.debug'),
                'proposal_content' => $request->proposal_content
            ];
            
            $result = $this->workanaService->sendProposalWithCredentials(
                $request->project_id,
                $request->user_id,
                $request->username,
                $request->password,
                $options
            );
            
            if ($result['success']) {
                // Guardar registro de propuesta enviada
                $this->saveProposalRecord($request->user_id, $request->project_id, $result['data']['proposalText']);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Propuesta enviada exitosamente',
                    'data' => $result['data']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error enviando propuesta',
                    'error' => $result['error']['message']
                ], 400);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Scraping de proyectos de Workana
     */
    public function scrapeProjects(Request $request)
    {
        try {
            $result = $this->workanaService->scrapeProjects([
                'quiet' => !config('app.debug')
            ]);
            
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Proyectos obtenidos exitosamente',
                    'data' => $result['projects'],
                    'stats' => $result['stats']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error obteniendo proyectos',
                    'error' => $result['error']['message']
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Obtener datos de sesión del usuario
     */
    private function getUserSessionData($user)
    {
        // Aquí implementarías la lógica para obtener los datos de sesión
        // desde tu base de datos o sistema de almacenamiento
        
        // Ejemplo: obtener desde external_credentials
        $credential = DB::table('external_credentials')
            ->where('user_id', $user->id)
            ->where('platform', 'workana')
            ->where('is_active', true)
            ->first();
        
        if ($credential && $credential->session_data) {
            return json_decode($credential->session_data, true);
        }
        
        return null;
    }
    
    /**
     * Guardar registro de propuesta enviada
     */
    private function saveProposalRecord($userId, $projectId, $proposalText)
    {
        DB::table('user_proposals')->insert([
            'user_id' => $userId,
            'project_id' => $projectId,
            'project_platform' => 'workana',
            'proposal_content' => $proposalText,
            'status' => 'sent',
            'proposal_sent_at' => now(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }
}

// Ejemplo de Artisan Command
namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendWorkanaProposal extends Command
{
    protected $signature = 'workana:send-proposal 
                            {projectId : ID del proyecto en Workana}
                            {userId : ID del usuario}
                            {--session-data= : Datos de sesión en JSON}
                            {--username= : Email del usuario}
                            {--password= : Contraseña del usuario}
                            {--proposal-content= : Contenido personalizado de la propuesta}
                            {--auto-login : Intentar auto-login}
                            {--debug : Modo debug}';

    protected $description = 'Enviar propuesta a Workana';

    public function handle()
    {
        $projectId = $this->argument('projectId');
        $userId = $this->argument('userId');
        
        $cliPath = base_path('apps/api2/cli.js');
        
        $command = "node {$cliPath} send-proposal " .
            "--project-id \"{$projectId}\" " .
            "--user-id \"{$userId}\"";
        
        // Agregar opciones si están presentes
        if ($sessionData = $this->option('session-data')) {
            $command .= " --session-data '{$sessionData}'";
        }
        
        if ($username = $this->option('username')) {
            $command .= " --username \"{$username}\"";
        }
        
        if ($password = $this->option('password')) {
            $command .= " --password \"{$password}\"";
        }
        
        if ($proposalContent = $this->option('proposal-content')) {
            $command .= " --proposal-content \"" . addslashes($proposalContent) . "\"";
        }
        
        if ($this->option('auto-login')) {
            $command .= " --auto-login";
        }
        
        if ($this->option('debug')) {
            $command .= " --debug";
        }
        
        $this->info("Ejecutando comando: {$command}");
        
        $output = shell_exec($command);
        $result = json_decode($output, true);
        
        if ($result['success']) {
            $this->info('✅ Propuesta enviada exitosamente');
            $this->line("Proyecto: {$result['data']['projectTitle']}");
            $this->line("Usuario: {$result['data']['userEmail']}");
            $this->line("Duración: {$result['duration']}ms");
        } else {
            $this->error('❌ Error enviando propuesta');
            $this->line("Error: {$result['error']['message']}");
        }
        
        return $result['success'] ? 0 : 1;
    }
}

// Ejemplo de comando para scraping
class ScrapeWorkanaProjects extends Command
{
    protected $signature = 'workana:scrape-projects {--quiet : Modo silencioso}';
    protected $description = 'Scraping de proyectos de Workana';

    public function handle()
    {
        $cliPath = base_path('apps/api2/cli.js');
        
        $command = "node {$cliPath} scrape-workana";
        
        if ($this->option('quiet')) {
            $command .= " --quiet";
        }
        
        $this->info("Ejecutando scraping de proyectos...");
        
        $output = shell_exec($command);
        $result = json_decode($output, true);
        
        if ($result['success']) {
            $this->info('✅ Scraping completado exitosamente');
            $this->line("Proyectos obtenidos: {$result['stats']['total']}");
            $this->line("Duración: {$result['duration']}ms");
        } else {
            $this->error('❌ Error en scraping');
            $this->line("Error: {$result['error']['message']}");
        }
        
        return $result['success'] ? 0 : 1;
    }
} 