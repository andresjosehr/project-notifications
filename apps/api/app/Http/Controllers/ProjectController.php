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
        $options = $request->validated();
        $iteration = $options['iteration'] ?? 0;
        
        // Log removido - información innecesaria en producción

        $results = $this->scraperService->requestScrapingFromNode(null, $options);

        // Log removido - información innecesaria en producción
        
        return ApiResponse::success($results);
    }

    public function runSinglePlatform(ScrapingCycleRequest $request, $platform)
    {
        $options = $request->validated();
        
        // Log removido - información innecesaria en producción

        $results = $this->scraperService->requestScrapingFromNode($platform, $options);

        // Log removido - información innecesaria en producción
        
        return ApiResponse::success($results);
    }

    public function buildProposalByProjectId(Request $request, $projectId)
    {
        $userId = auth()->id();
        $options = $request->all();

        $result = $this->proposalService->buildProposal($projectId, $userId, null, $options);
        
        return ApiResponse::success($result, 'Propuesta generada exitosamente');
    }

    public function getStats(Request $request)
    {
        $platform = $request->query('platform');
        $stats = $this->projectService->getProjectStats($platform);
        
        return ApiResponse::success([
            'stats' => $stats,
            'generated_at' => now()->toISOString(),
            'platform' => $platform ?? 'all'
        ]);
    }

    public function search(SearchProjectsRequest $request)
    {
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
    }

    public function getRecent(GetProjectsRequest $request)
    {
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
    }

    public function show(Request $request, $id)
    {
        $platform = $request->query('platform');
        
        $project = $this->projectService->getProjectById($id, $platform);
        
        if (!$project) {
            return ApiResponse::notFound('Proyecto no encontrado');
        }
        
        return ApiResponse::success($project);
    }

    public function healthCheck()
    {
        $health = $this->projectService->healthCheck();
        
        return ApiResponse::success($health);
    }

    public function cleanup(Request $request)
    {
        $options = $request->all();
        $results = $this->projectService->cleanup($options);
        
        return ApiResponse::success($results);
    }

    public function getAppLogs(Request $request)
    {
        $content = $this->logManagementService->getAppLogs();
        
        return ApiResponse::success($content);
    }

    public function getErrorLogs(Request $request)
    {
        $content = $this->logManagementService->getErrorLogs();
        
        return ApiResponse::success($content);
    }

    public function clearLogs(Request $request)
    {
        $result = $this->logManagementService->clearLogs();
        
        return ApiResponse::success($result, $result['message']);
    }
}
