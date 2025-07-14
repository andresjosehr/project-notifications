<?php

namespace App\Console\Commands;

use App\Exceptions\GenericException;
use App\Services\ScraperService;
use App\Services\ProjectService;
use App\Services\NotificationService;
use App\Models\User;
use App\Models\Project;

class ScrapeWorkanaCommand extends BaseCommand
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
        $this->info('🚀 Iniciando scraping de Workana...');
        
        $startTime = microtime(true);
        $result = $this->executeNodeScraper();
        
        if (!$result['success']) {
            $errorMessage = $result['error']['message'] ?? $result['error'] ?? 'Error desconocido';
            
            $error = $this->standardError($errorMessage, $result['error']['type'] ?? 'scrape_failed', ['operation' => 'scrape']);
            
            $this->error(json_encode($error, JSON_UNESCAPED_UNICODE));
            return 1;
        }

        
        $projects = $result['data']['projects'] ?? $result['projects'] ?? [];
        $stats = $result['data']['stats'] ?? null;

        
        $insertedCount = $this->processProjects($projects);
        
        $duration = microtime(true) - $startTime;
        
        return $this->handleSuccess([
            'operation' => 'scrape',
            'message' => 'Scraping y procesamiento completado',
            'data' => [
                'projects_found' => count($projects),
                'projects_inserted' => $insertedCount,
                'stats' => $stats
            ],
            'duration' => round($duration, 2)
        ]);
    }
    
    /**
     * Ejecutar el scraper de Node.js
     */
    private function executeNodeScraper(): array
    {
        $nodePath = env('NODE_PATH', 'node');
        $scriptPath = base_path('cli.js');
        $quietFlag = $this->option('silent') ? '--quiet' : '';
        
        $command = "cd " . base_path() . " && {$nodePath} {$scriptPath} scrape-workana {$quietFlag} 2>&1";
        
        $this->info("Ejecutando: {$command}");
        
        return $this->executeNodeCommand($command, ['operation' => 'scrape']);
    }
    
    /**
     * Procesar los proyectos obtenidos
     */
    private function processProjects(array $projects): int
    {
        $this->info("Procesando " . count($projects) . " proyectos...");

        $projectService = new ProjectService();
        $notificationService = new NotificationService();
        $platform = 'workana';

        $newProjectsMapped = $this->identifyAndMapNewProjects($projects, $projectService, $platform);
        $this->info("Nuevos proyectos detectados: " . count($newProjectsMapped));

        $inserted = 0;
        if (count($newProjectsMapped) > 0) {
            $inserted = $projectService->createMany($newProjectsMapped, $platform);
            $this->info("Proyectos nuevos guardados: $inserted");
            
            if ($inserted > 0) {
                $this->sendNotifications($newProjectsMapped, $notificationService, $platform);
            }
        }

        return $inserted;
    }

    private function identifyAndMapNewProjects(array $projects, ProjectService $projectService, string $platform): array
    {
        $links = array_column($projects, 'link');
        $existingProjects = $projectService->findByLinks($links, $platform);
        $existingLinks = $existingProjects->pluck('link')->toArray();

        $newProjects = array_filter($projects, function($project) use ($existingLinks) {
            return !in_array($project['link'], $existingLinks);
        });

        return array_map(function($project) {
            return [
                'title' => $project['title'] ?? null,
                'description' => $project['description'] ?? null,
                'price' => $project['price'] ?? null,
                'skills' => is_array($project['skills']) ? implode(', ', $project['skills']) : ($project['skills'] ?? null),
                'link' => $project['link'] ?? null,
                'platform' => $project['platform'] ?? 'workana',
                'language' => $project['language'] ?? 'unknown',
                'client_name' => $project['client_name'] ?? $project['clientName'] ?? null,
                'client_country' => $project['client_country'] ?? $project['clientCountry'] ?? null,
                'client_rating' => $project['client_rating'] ?? $project['clientRating'] ?? 0,
                'payment_verified' => $project['payment_verified'] ?? $project['paymentVerified'] ?? false,
                'is_featured' => $project['is_featured'] ?? $project['isFeatured'] ?? false,
                'is_max_project' => $project['is_max_project'] ?? $project['isMaxProject'] ?? false,
                'date' => $project['date'] ?? null,
                'time_ago' => $project['time_ago'] ?? $project['timeAgo'] ?? null,
                'info' => $project['info'] ?? '',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }, array_values($newProjects));
    }

    private function sendNotifications(array $newProjectsMapped, NotificationService $notificationService, string $platform): void
    {
        $users = User::whereNotNull('telegram_user')->get();
        
        if ($users->count() === 0) {
            $this->warn("⚠️ No hay usuarios con telegram_user configurado");
            return;
        }

        $this->info("Enviando notificaciones a " . $users->count() . " usuarios...");
        
        foreach ($newProjectsMapped as $projectData) {
            $project = Project::where('link', $projectData['link'])
                ->where('platform', $platform)
                ->first();
            
            if (!$project) {
                $this->warn("⚠️ No se encontró el proyecto guardado para notificar");
                continue;
            }

            $this->sendProjectNotifications($project, $users, $notificationService);
        }
        
        $this->info("✅ Notificaciones completadas");
    }

    private function sendProjectNotifications(Project $project, $users, NotificationService $notificationService): void
    {
        foreach ($users as $user) {
            $result = $notificationService->sendProjectNotification($project, $user);
            
            if ($result['success']) {
                $this->info("✅ Notificación enviada a {$user->telegram_user}");
            } else {
                $this->warn("⚠️ Error enviando notificación a {$user->telegram_user}: " . ($result['error'] ?? 'Error desconocido'));
            }
        }
    }
    
} 