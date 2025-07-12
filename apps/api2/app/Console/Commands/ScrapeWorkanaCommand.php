<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Services\ScraperService;
use App\Services\ProjectService;
use App\Services\NotificationService;
use App\Models\User;
use App\Models\Project;

class ScrapeWorkanaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'scrape:workana {--silent : Modo silencioso}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecutar scraping de Workana usando Node.js';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $this->info('🚀 Iniciando scraping de Workana...');
            
            $startTime = microtime(true);
            
            // Ejecutar scraper de Node.js
            $result = $this->executeNodeScraper();
            
            $duration = (microtime(true) - $startTime) * 1000;
            
            if ($result['success']) {
                $this->info("✅ Scraping completado en {$duration}ms");
                $this->info("📊 Proyectos encontrados: " . count($result['projects']));
                
                // Procesar proyectos en Laravel
                $this->processProjects($result['projects']);
                
                $this->info('✅ Procesamiento completado');
            } else {
                $this->error('❌ Error en scraping: ' . $result['error']['message']);
                return 1;
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('Error en comando ScrapeWorkanaCommand', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
    
    /**
     * Ejecutar el scraper de Node.js
     */
    private function executeNodeScraper()
    {
        $nodePath = env('NODE_PATH', 'node');
        $scriptPath = __DIR__ . '/../../../cli.js';
        $quietFlag = $this->option('silent') ? '--quiet' : '';
        
        $command = "{$nodePath} {$scriptPath} scrape-workana {$quietFlag} 2>&1";
        
        $this->info("Ejecutando: {$command}");
        
        $output = shell_exec($command);
        $returnCode = $this->getLastReturnCode();
        
        if ($returnCode !== 0) {
            throw new \Exception("Error ejecutando Node.js scraper. Código: {$returnCode}, Output: {$output}");
        }
        
        $result = json_decode($output, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Error parseando JSON de Node.js: " . json_last_error_msg() . "\nOutput: {$output}");
        }
        
        return $result;
    }
    
    /**
     * Procesar los proyectos obtenidos
     */
    private function processProjects(array $projects)
    {
        $this->info("Procesando " . count($projects) . " proyectos...");

        $projectService = new ProjectService();
        $notificationService = new NotificationService();

        // 1. Identificar proyectos nuevos (por link y plataforma)
        $links = array_column($projects, 'link');
        $platform = 'workana';
        $existingProjects = $projectService->findByLinks($links, $platform);
        $existingLinks = $existingProjects->pluck('link')->toArray();

        $newProjects = array_filter($projects, function($project) use ($existingLinks) {
            return !in_array($project['link'], $existingLinks);
        });

        // Mapear campos camelCase a snake_case
        $newProjectsMapped = array_map(function($project) {
            return [
                'title' => $project['title'] ?? null,
                'description' => $project['description'] ?? null,
                'price' => $project['price'] ?? null,
                'skills' => $project['skills'] ?? null,
                'link' => $project['link'] ?? null,
                'platform' => $project['platform'] ?? null,
                'language' => $project['language'] ?? null,
                'client_name' => $project['clientName'] ?? null,
                'client_country' => $project['clientCountry'] ?? null,
                'client_rating' => $project['clientRating'] ?? null,
                'payment_verified' => $project['paymentVerified'] ?? null,
                'is_featured' => $project['isFeatured'] ?? null,
                'is_max_project' => $project['isMaxProject'] ?? null,
                'date' => $project['date'] ?? null,
                'time_ago' => $project['timeAgo'] ?? null,
                'created_at' => $project['createdAt'] ?? now(),
                'updated_at' => $project['updatedAt'] ?? now(),
            ];
        }, array_values($newProjects));

        $this->info("Nuevos proyectos detectados: " . count($newProjectsMapped));

        // 2. Guardar los proyectos nuevos
        $inserted = 0;
        if (count($newProjectsMapped) > 0) {
            $inserted = $projectService->createMany($newProjectsMapped, $platform);
            $this->info("Proyectos nuevos guardados: $inserted");
        }

        // 3. Notificar a los usuarios con telegram_user
        if ($inserted > 0) {
            $users = User::whereNotNull('telegram_user')->get();
            
            if ($users->count() > 0) {
                $this->info("Enviando notificaciones a " . $users->count() . " usuarios...");
                
                foreach ($newProjectsMapped as $projectData) {
                    // Buscar el proyecto recién guardado para pasar un modelo a NotificationService
                    $project = Project::where('link', $projectData['link'])
                        ->where('platform', $platform)
                        ->first();
                    
                    if ($project) {
                        foreach ($users as $user) {
                            try {
                                $result = $notificationService->sendProjectNotification($project, $user);
                                
                                if ($result['success']) {
                                    $this->info("✅ Notificación enviada a {$user->telegram_user}");
                                } else {
                                    $this->warn("⚠️ Error enviando notificación a {$user->telegram_user}: " . ($result['error'] ?? 'Error desconocido'));
                                }
                            } catch (\Exception $e) {
                                $this->error("❌ Error enviando notificación a {$user->telegram_user}: " . $e->getMessage());
                                Log::error('Error enviando notificación', [
                                    'user_id' => $user->id,
                                    'project_id' => $project->id,
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                    } else {
                        $this->warn("⚠️ No se encontró el proyecto guardado para notificar");
                    }
                }
                
                $this->info("✅ Notificaciones completadas");
            } else {
                $this->warn("⚠️ No hay usuarios con telegram_user configurado");
            }
        }

        // Log para todos los proyectos procesados
        foreach ($projects as $project) {
            Log::info('Proyecto procesado', [
                'title' => $project['title'],
                'platform' => $project['platform'],
                'link' => $project['link']
            ]);
        }
    }
    
    /**
     * Obtener el código de retorno del último comando ejecutado
     */
    private function getLastReturnCode()
    {
        return $GLOBALS['?'] ?? 0;
    }
} 