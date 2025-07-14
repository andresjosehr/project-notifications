<?php

namespace App\Http\Controllers;

use App\Http\Requests\ScrapingRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ScraperService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ScraperController extends Controller
{
    protected $scraperService;

    public function __construct(ScraperService $scraperService)
    {
        $this->scraperService = $scraperService;
    }

    public function scrapeWorkana(ScrapingRequest $request): JsonResponse
    {
        $options = $request->getOptions();

        // Log removido - información innecesaria en producción

        $result = $this->scraperService->scrapeWorkana($options);

        return ApiResponse::success($result, 'Scraping de Workana completado exitosamente');
    }

    public function executeScrapingCommand(ScrapingRequest $request): JsonResponse
    {
        $platform = $request->getPlatform();
        $options = $request->getOptions();

        Log::info("Solicitud de comando de scraping para {$platform}", $options);

        $result = $this->scraperService->executeScrapingCommand($platform, $options);

        return ApiResponse::success($result, "Comando de scraping para {$platform} ejecutado exitosamente");
    }

    public function healthCheck(): JsonResponse
    {
        $health = $this->scraperService->healthCheck();

        return ApiResponse::success($health, 'Health check completado');
    }

    public function getStats(): JsonResponse
    {
        $stats = $this->scraperService->getScrapingStats();

        return ApiResponse::success($stats, 'Estadísticas obtenidas exitosamente');
    }
}
