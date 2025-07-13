<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\ScraperService;
use Illuminate\Support\Facades\Log;

class ScraperController extends Controller
{
    protected $scraperService;

    public function __construct(ScraperService $scraperService)
    {
        $this->scraperService = $scraperService;
    }

    /**
     * Ejecutar scraping de Workana
     */
    public function scrapeWorkana(Request $request): JsonResponse
    {
        try {
            $options = [
                'silent' => $request->boolean('silent', false)
            ];

            Log::info('Solicitud de scraping de Workana recibida', $options);

            $result = $this->scraperService->scrapeWorkana($options);

            return response()->json([
                'success' => true,
                'message' => 'Scraping de Workana completado exitosamente',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Error en scraping de Workana', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error ejecutando scraping de Workana',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ejecutar scraping usando comando de Artisan
     */
    public function executeScrapingCommand(Request $request): JsonResponse
    {
        try {
            $platform = $request->input('platform', 'workana');
            $options = [
                'silent' => $request->boolean('silent', false)
            ];

            Log::info("Solicitud de comando de scraping para {$platform}", $options);

            $result = $this->scraperService->executeScrapingCommand($platform, $options);

            return response()->json([
                'success' => true,
                'message' => "Comando de scraping para {$platform} ejecutado exitosamente",
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Error ejecutando comando de scraping', [
                'platform' => $request->input('platform', 'workana'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error ejecutando comando de scraping',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar salud del servicio de scraping
     */
    public function healthCheck(): JsonResponse
    {
        try {
            $health = $this->scraperService->healthCheck();

            return response()->json([
                'success' => true,
                'message' => 'Health check completado',
                'data' => $health
            ]);

        } catch (\Exception $e) {
            Log::error('Error en health check de scraping', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error en health check de scraping',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de scraping
     */
    public function getStats(): JsonResponse
    {
        try {
            $stats = $this->scraperService->getScrapingStats();

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas obtenidas exitosamente',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de scraping', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo estadísticas de scraping',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
