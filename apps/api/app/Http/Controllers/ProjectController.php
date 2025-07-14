<?php

namespace App\Http\Controllers;

use App\Http\Requests\BuildProposalRequest;
use App\Http\Requests\ScrapingCycleRequest;
use App\Http\Requests\SearchProjectsRequest;
use App\Http\Requests\GetProjectsRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ProjectService;
use App\Services\ScraperService;
use App\Services\ProposalService;
use App\Services\LogManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    protected $projectService;
    protected $scraperService;
    protected $proposalService;
    protected $logManagementService;

    public function __construct(
        ProjectService $projectService,
        ScraperService $scraperService,
        ProposalService $proposalService,
        LogManagementService $logManagementService
    ) {
        $this->projectService = $projectService;
        $this->scraperService = $scraperService;
        $this->proposalService = $proposalService;
        $this->logManagementService = $logManagementService;
    }

    public function runScrapingCycle(ScrapingCycleRequest $request)
    {
        try {
            $options = $request->validated();
            $iteration = $options['iteration'] ?? 0;
            
            // Log removido - información innecesaria en producción

            $results = $this->scraperService->requestScrapingFromNode(null, $options);

            // Log removido - información innecesaria en producción
            
            return ApiResponse::success($results);
        } catch (\Exception $error) {
            Log::error("Error en ciclo de scraping #{$iteration}", ['error' => $error->getMessage()]);
            
            $context = [
                'original_error' => $error->getMessage(),
                'options' => $options,
                'iteration' => $iteration,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception("Error en ciclo de scraping #{$iteration} - Context: " . json_encode($context));
        }
    }

    public function runSinglePlatform(ScrapingCycleRequest $request, $platform)
    {
        try {
            $options = $request->validated();
            
            // Log removido - información innecesaria en producción

            $results = $this->scraperService->requestScrapingFromNode($platform, $options);

            // Log removido - información innecesaria en producción
            
            return ApiResponse::success($results);
        } catch (\Exception $error) {
            Log::error("Error en scraping de {$platform}", ['error' => $error->getMessage()]);
            
            $context = [
                'original_error' => $error->getMessage(),
                'platform' => $platform,
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception("Error en scraping de {$platform} - Context: " . json_encode($context));
        }
    }

    public function buildProposalByProjectId(Request $request, $projectId)
    {
        try {
            $userId = auth()->id();
            $options = $request->all();

            $result = $this->proposalService->buildProposal($projectId, $userId, null, $options);
            
            return ApiResponse::success($result, 'Propuesta generada exitosamente');
        } catch (\Exception $error) {
            Log::error("Error generando propuesta", ['error' => $error->getMessage(), 'projectId' => $projectId]);
            
            $context = [
                'original_error' => $error->getMessage(),
                'project_id' => $projectId,
                'user_id' => auth()->id(),
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception("Error generando propuesta - Context: " . json_encode($context));
        }
    }

    public function getStats(Request $request)
    {
        try {
            $platform = $request->query('platform');
            $stats = $this->projectService->getProjectStats($platform);
            
            return ApiResponse::success([
                'stats' => $stats,
                'generated_at' => now()->toISOString(),
                'platform' => $platform ?? 'all'
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo estadísticas', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function search(SearchProjectsRequest $request)
    {
        try {
            $data = $request->validated();
            $query = $data['query'] ?? null;
            $platform = $data['platform'] ?? null;
            $limit = $data['limit'] ?? 10;
            
            $projects = $this->projectService->searchProjects($query, $platform, ['limit' => $limit]);
            
            return ApiResponse::success([
                'query' => $query,
                'platform' => $platform ?? 'all',
                'results' => $projects,
                'count' => count($projects),
                'searched_at' => now()->toISOString()
            ]);
        } catch (\Exception $error) {
            Log::error('Error buscando proyectos', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function getRecent(GetProjectsRequest $request)
    {
        try {
            $data = $request->validated();
            $platform = $data['platform'] ?? null;
            $limit = $data['limit'] ?? 10;
            
            $projects = $this->projectService->getAllProjects($platform, ['limit' => $limit]);
            
            return ApiResponse::success([
                'projects' => $projects,
                'platform' => $platform ?? 'all',
                'limit' => $limit,
                'retrieved_at' => now()->toISOString()
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo proyectos recientes', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $platform = $request->query('platform');
            
            $project = $this->projectService->getProjectById($id, $platform);
            
            if (!$project) {
                return ApiResponse::notFound('Proyecto no encontrado');
            }
            
            return ApiResponse::success($project);
        } catch (\Exception $error) {
            Log::error('Error obteniendo proyecto', ['error' => $error->getMessage(), 'id' => $id]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function healthCheck()
    {
        try {
            $health = $this->projectService->healthCheck();
            
            return ApiResponse::success($health);
        } catch (\Exception $error) {
            Log::error('Error en health check', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function cleanup(Request $request)
    {
        try {
            $options = $request->all();
            $results = $this->projectService->cleanup($options);
            
            return ApiResponse::success($results);
        } catch (\Exception $error) {
            Log::error('Error en limpieza', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function getAppLogs(Request $request)
    {
        try {
            $content = $this->logManagementService->getAppLogs();
            
            return ApiResponse::success($content);
        } catch (\Exception $error) {
            Log::error('Error obteniendo logs de la aplicación', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function getErrorLogs(Request $request)
    {
        try {
            $content = $this->logManagementService->getErrorLogs();
            
            return ApiResponse::success($content);
        } catch (\Exception $error) {
            Log::error('Error obteniendo logs de errores', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }

    public function clearLogs(Request $request)
    {
        try {
            $result = $this->logManagementService->clearLogs();
            
            return ApiResponse::success($result, $result['message']);
        } catch (\Exception $error) {
            Log::error('Error limpiando logs', ['error' => $error->getMessage()]);
            
            return ApiResponse::error($error->getMessage());
        }
    }
}
