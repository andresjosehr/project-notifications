<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;

class ScraperService
{
    protected $nodePath;
    protected $scriptPath;

    public function __construct()
    {
        $this->nodePath = env('NODE_PATH', 'node');
        $this->scriptPath = base_path('cli.js');
    }

    /**
     * Ejecutar scraping de Workana usando Node.js
     */
    public function scrapeWorkana($options = [])
    {
        try {
            Log::info('Solicitando scraping de Workana desde Node.js', $options);

            $quietFlag = isset($options['silent']) && $options['silent'] ? '--quiet' : '';
            $command = "cd " . base_path() . " && {$this->nodePath} {$this->scriptPath} scrape-workana {$quietFlag} 2>&1";
            
            $output = shell_exec($command);
            $returnCode = $this->getLastReturnCode();

            Log::info('Output del comando: ' . $output);
            
            if ($returnCode !== 0) {
                throw new \Exception("Error ejecutando Node.js scraper. Código: {$returnCode}, Output: {$output}");
            }
            
            // Convertir output a array
            $result = json_decode($output, true);
            
            if ($result === null) {
                throw new \Exception("No se encontró JSON válido en el output: {$output}");
            }
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Error parseando JSON de Node.js: " . json_last_error_msg() . "\nOutput: {$output}");
            }
            
            // Verificar el nuevo formato de respuesta estandarizado
            if (!isset($result['success'])) {
                throw new \Exception("Formato de respuesta inválido: falta campo 'success'");
            }
            
            if (!$result['success']) {
                $errorMessage = $result['error']['message'] ?? 'Error desconocido';
                $errorType = $result['error']['type'] ?? 'UnknownError';
                throw new \Exception("Error en scraping ({$errorType}): {$errorMessage}");
            }
            
            // Extraer datos del nuevo formato
            $projects = $result['data']['projects'] ?? [];
            $stats = $result['data']['stats'] ?? [];
            $duration = $result['duration'] ?? 0;
            
            Log::info('Scraping de Workana completado', [
                'projects_count' => count($projects),
                'duration' => $duration,
                'stats' => $stats,
                'platform' => $result['platform'] ?? 'unknown',
                'operation' => $result['operation'] ?? 'unknown'
            ]);
            
            // Mantener compatibilidad con el formato anterior
            return [
                'success' => true,
                'projects' => $projects,
                'duration' => $duration,
                'stats' => $stats,
                'platform' => $result['platform'] ?? 'workana',
                'operation' => $result['operation'] ?? 'scrape',
                'message' => $result['message'] ?? 'Scraping completed successfully',
                'timestamp' => $result['timestamp'] ?? now()->toISOString()
            ];
            
        } catch (\Exception $e) {
            Log::error('Error solicitando scraping de Workana', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Ejecutar scraping usando comando de Artisan
     */
    public function executeScrapingCommand($platform = 'workana', $options = [])
    {
        try {
            Log::info("Ejecutando comando de scraping para {$platform}", $options);
            
            $command = "scrape:{$platform}";
            $artisanOptions = [];
            
            if (isset($options['silent']) && $options['silent']) {
                $artisanOptions['--silent'] = true;
            }
            
            $exitCode = Artisan::call($command, $artisanOptions);
            
            if ($exitCode !== 0) {
                throw new \Exception("Error ejecutando comando de scraping. Código: {$exitCode}");
            }
            
            $output = Artisan::output();
            
            Log::info("Comando de scraping para {$platform} completado", [
                'exit_code' => $exitCode,
                'output' => $output
            ]);
            
            return [
                'success' => true,
                'exit_code' => $exitCode,
                'output' => $output
            ];
            
        } catch (\Exception $e) {
            Log::error("Error ejecutando comando de scraping para {$platform}", ['error' => $e->getMessage()]);
            throw $e;
        }
    }



    /**
     * Obtener estadísticas del scraping
     */
    public function getScrapingStats()
    {
        try {
            // Por ahora retornamos estadísticas básicas
            // En el futuro esto podría consultar logs o base de datos
            return [
                'last_scraping' => null,
                'total_scrapings' => 0,
                'success_rate' => 0,
                'average_duration' => 0
            ];
        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de scraping', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Obtener el código de retorno del último comando ejecutado
     */
    private function getLastReturnCode()
    {
        return $GLOBALS['?'] ?? 0;
    }

    /**
     * Extraer JSON válido del output del comando
     */
    private function extractJsonFromOutput(string $output): ?string
    {
        Log::info('Output del comando: ' . $output);
        // Patrones para encontrar el inicio del JSON
        $patterns = [
            '/\{\s*"success"/',           // {"success" con espacios opcionales
            '/\{\n\s*"success"/',         // { con nueva línea y espacios
            '/\{\r?\n\s*"success"/',      // { con CRLF y espacios
            '/\{\s*\n\s*"success"/',      // { con espacios, nueva línea y espacios
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $output, $matches, PREG_OFFSET_CAPTURE)) {
                $startPos = $matches[0][1];
                $jsonPart = substr($output, $startPos);
                
                // Intentar parsear el JSON para verificar que es válido
                $result = json_decode($jsonPart, true);
                if (json_last_error() === JSON_ERROR_NONE && isset($result['success'])) {
                    return $jsonPart;
                }
            }
        }
        
        // Si no se encuentra con patrones específicos, buscar cualquier JSON válido
        $braceCount = 0;
        $startPos = -1;
        $inString = false;
        $escapeNext = false;
        
        for ($i = 0; $i < strlen($output); $i++) {
            $char = $output[$i];
            
            if ($escapeNext) {
                $escapeNext = false;
                continue;
            }
            
            if ($char === '\\') {
                $escapeNext = true;
                continue;
            }
            
            if ($char === '"' && !$escapeNext) {
                $inString = !$inString;
                continue;
            }
            
            if (!$inString) {
                if ($char === '{') {
                    if ($braceCount === 0) {
                        $startPos = $i;
                    }
                    $braceCount++;
                } elseif ($char === '}') {
                    $braceCount--;
                    if ($braceCount === 0 && $startPos !== -1) {
                        $jsonPart = substr($output, $startPos, $i - $startPos + 1);
                        $result = json_decode($jsonPart, true);
                        if (json_last_error() === JSON_ERROR_NONE && isset($result['success'])) {
                            return $jsonPart;
                        }
                        $startPos = -1;
                    }
                }
            }
        }
        
        return null;
    }
}