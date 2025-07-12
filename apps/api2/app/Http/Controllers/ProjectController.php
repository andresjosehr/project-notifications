<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Services\ProjectService;
use App\Services\AIService;
use App\Services\NotificationService;
use App\Services\ScraperService;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    protected $projectService;
    protected $aiService;
    protected $notificationService;
    protected $scraperService;

    public function __construct()
    {
        $this->projectService = new ProjectService();
        $this->aiService = new AIService();
        $this->notificationService = new NotificationService();
        $this->scraperService = new ScraperService();
    }

    public function runScrapingCycle(Request $request)
    {
        try {
            $options = $request->all();
            $iteration = $options['iteration'] ?? 0;
            
            Log::info("Iniciando ciclo de scraping #{$iteration}");

            $results = $this->scraperService->requestScrapingFromNode(null, $options);

            Log::info("Ciclo de scraping #{$iteration} completado", ['results' => $results]);
            
            return response()->json([
                'success' => true,
                'data' => $results
            ]);
        } catch (\Exception $error) {
            Log::error("Error en ciclo de scraping #{$iteration}", ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function runSinglePlatform(Request $request, $platform)
    {
        try {
            $options = $request->all();
            
            Log::info("Ejecutando scraping para {$platform}");

            $results = $this->scraperService->requestScrapingFromNode($platform, $options);

            Log::info("Scraping de {$platform} completado", ['results' => $results]);
            
            return response()->json([
                'success' => true,
                'data' => $results
            ]);
        } catch (\Exception $error) {
            Log::error("Error en scraping de {$platform}", ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function buildProposal(Request $request)
    {
        try {
            $projectId = $request->input('projectId') ?? $request->input('project_id');
            $userId = $request->input('userId');
            $platform = $request->input('platform', 'workana');
            $options = $request->except(['projectId', 'project_id', 'userId', 'platform']);

            // Validar campos requeridos
            if (!$projectId || !$userId) {
                return response()->json([
                    'success' => false,
                    'error' => 'Se requieren projectId y userId'
                ], 400);
            }

            Log::info("Generando propuesta para proyecto {$projectId} con usuario {$userId} de {$platform}");

            // Obtener proyecto
            $project = $this->projectService->getProjectById($projectId, $platform);
            
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'error' => "Proyecto {$projectId} no encontrado en {$platform}"
                ], 404);
            }

            // Obtener usuario
            $user = \App\Models\User::find($userId);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => "Usuario {$userId} no encontrado"
                ], 404);
            }

            // Generar propuesta usando perfil del usuario si está disponible
            if ($user->professional_profile && $user->proposal_directives) {
                $proposal = $this->aiService->generateProposalWithUserProfile(
                    $project->title,
                    $project->description,
                    $user->professional_profile,
                    $user->proposal_directives,
                    array_merge($options, ['language' => $project->language ?? 'es'])
                );
            } else {
                $proposal = $this->aiService->buildProposal(
                    $project->description,
                    array_merge($options, ['language' => $project->language ?? 'es'])
                );
            }
            
            Log::info("Propuesta generada exitosamente para proyecto {$projectId}");

            return response()->json([
                'success' => true,
                'message' => 'Propuesta generada exitosamente',
                'data' => [
                    'projectId' => $projectId,
                    'userId' => $userId,
                    'proposal' => $proposal,
                    'projectTitle' => $project->title,
                    'userEmail' => $user->email,
                    'platform' => $platform
                ]
            ]);
        } catch (\Exception $error) {
            Log::error("Error generando propuesta para proyecto {$projectId}", ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request)
    {
        try {
            $platform = $request->query('platform');
            $stats = $this->projectService->getProjectStats($platform);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'generated_at' => now()->toISOString(),
                    'platform' => $platform ?? 'all'
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo estadísticas', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->query('query');
            $platform = $request->query('platform');
            $limit = $request->query('limit', 10);
            
            $projects = $this->projectService->searchProjects($query, $platform, ['limit' => $limit]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'query' => $query,
                    'platform' => $platform ?? 'all',
                    'results' => $projects,
                    'count' => count($projects),
                    'searched_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error buscando proyectos', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function getRecent(Request $request)
    {
        try {
            $platform = $request->query('platform');
            $limit = $request->query('limit', 10);
            
            $projects = $this->projectService->getAllProjects($platform, ['limit' => $limit]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'projects' => $projects,
                    'platform' => $platform ?? 'all',
                    'limit' => $limit,
                    'retrieved_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo proyectos recientes', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $platform = $request->query('platform');
            
            $project = $this->projectService->getProjectById($id, $platform);
            
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'error' => 'Proyecto no encontrado'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $project
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo proyecto', ['error' => $error->getMessage(), 'id' => $id]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function healthCheck()
    {
        try {
            $health = $this->projectService->healthCheck();
            
            return response()->json([
                'success' => true,
                'data' => $health
            ]);
        } catch (\Exception $error) {
            Log::error('Error en health check', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function cleanup(Request $request)
    {
        try {
            $options = $request->all();
            $results = $this->projectService->cleanup($options);
            
            return response()->json([
                'success' => true,
                'data' => $results
            ]);
        } catch (\Exception $error) {
            Log::error('Error en limpieza', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function getAppLogs(Request $request)
    {
        try {
            $logPath = storage_path('logs/laravel.log');
            
            if (file_exists($logPath)) {
                $content = file_get_contents($logPath);
                return response()->json([
                    'success' => true,
                    'data' => $content
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'data' => 'No hay logs disponibles'
                ]);
            }
        } catch (\Exception $error) {
            Log::error('Error obteniendo logs de la aplicación', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function getErrorLogs(Request $request)
    {
        try {
            $logPath = storage_path('logs/error.log');
            
            if (file_exists($logPath)) {
                $content = file_get_contents($logPath);
                return response()->json([
                    'success' => true,
                    'data' => $content
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'data' => 'No hay logs de errores'
                ]);
            }
        } catch (\Exception $error) {
            Log::error('Error obteniendo logs de errores', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function clearLogs(Request $request)
    {
        try {
            $logFiles = [
                storage_path('logs/laravel.log'),
                storage_path('logs/error.log')
            ];
            
            $clearedCount = 0;
            foreach ($logFiles as $logFile) {
                if (file_exists($logFile)) {
                    file_put_contents($logFile, '');
                    $clearedCount++;
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => "{$clearedCount} archivos de log limpiados",
                'data' => ['clearedCount' => $clearedCount]
            ]);
        } catch (\Exception $error) {
            Log::error('Error limpiando logs', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }
}
