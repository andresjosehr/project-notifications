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
        try {
            $options = $request->getOptions();

            Log::info('Solicitud de scraping de Workana recibida', $options);

            $result = $this->scraperService->scrapeWorkana($options);

            return ApiResponse::success($result, 'Scraping de Workana completado exitosamente');

        } catch (\Exception $e) {
            Log::error('Error en scraping de Workana', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ApiResponse::error('Error ejecutando scraping de Workana: ' . $e->getMessage());
        }
    }

    public function executeScrapingCommand(ScrapingRequest $request): JsonResponse
    {
        try {
            $platform = $request->getPlatform();
            $options = $request->getOptions();

            Log::info("Solicitud de comando de scraping para {$platform}", $options);

            $result = $this->scraperService->executeScrapingCommand($platform, $options);

            return ApiResponse::success($result, "Comando de scraping para {$platform} ejecutado exitosamente");

        } catch (\Exception $e) {
            Log::error('Error ejecutando comando de scraping', [
                'platform' => $request->getPlatform(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ApiResponse::error('Error ejecutando comando de scraping: ' . $e->getMessage());
        }
    }

    public function healthCheck(): JsonResponse
    {
        try {
            $health = $this->scraperService->healthCheck();

            return ApiResponse::success($health, 'Health check completado');

        } catch (\Exception $e) {
            Log::error('Error en health check de scraping', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ApiResponse::error('Error en health check de scraping: ' . $e->getMessage());
        }
    }

    public function getStats(): JsonResponse
    {
        try {
            $stats = $this->scraperService->getScrapingStats();

            return ApiResponse::success($stats, 'Estadísticas obtenidas exitosamente');

        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de scraping', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ApiResponse::error('Error obteniendo estadísticas de scraping: ' . $e->getMessage());
        }
    }
}
