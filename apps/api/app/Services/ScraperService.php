<?php

namespace App\Services;

use App\Exceptions\GenericException;
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
        // Log removido - información innecesaria en producción

        $quietFlag = isset($options['silent']) && $options['silent'] ? '--quiet' : '';
        $command = "cd " . base_path() . " && {$this->nodePath} {$this->scriptPath} scrape-workana {$quietFlag} 2>&1";
        
        $output = shell_exec($command);
        $returnCode = $this->getLastReturnCode();

        // Log removido - información innecesaria en producción
        
        if ($returnCode !== 0) {
            $context = [
                'return_code' => $returnCode,
                'output' => $output,
                'command' => $command,
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Error ejecutando Node.js scraper. Código: {$returnCode} - Context: " . json_encode($context));
        }
        
        // Extraer JSON válido del output
        $jsonOutput = $this->extractJsonFromOutput($output);
        
        if ($jsonOutput === null) {
            $context = [
                'output' => $output,
                'command' => $command,
                'return_code' => $returnCode,
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("No se encontró JSON válido en el output: {$output} - Context: " . json_encode($context));
        }
        
        $result = json_decode($jsonOutput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $context = [
                'json_error' => json_last_error_msg(),
                'output' => $output,
                'command' => $command,
                'return_code' => $returnCode,
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Error parseando JSON de Node.js: " . json_last_error_msg() . " - Context: " . json_encode($context));
        }
        
        // Verificar el nuevo formato de respuesta estandarizado
        if (!isset($result['success'])) {
            $context = [
                'result' => $result,
                'command' => $command,
                'return_code' => $returnCode,
                'options' => $options,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Formato de respuesta inválido: falta campo 'success' - Context: " . json_encode($context));
        }
        
        if (!$result['success']) {
            $errorMessage = $result['error']['message'] ?? 'Error desconocido';
            $errorType = $result['error']['type'] ?? 'UnknownError';
            $context = [
                'error_type' => $errorType,
                'error_message' => $errorMessage,
                'command' => $command,
                'return_code' => $returnCode,
                'options' => $options,
                'result' => $result,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Error en scraping ({$errorType}): {$errorMessage} - Context: " . json_encode($context));
        }
        
        // Extraer datos del nuevo formato
        $projects = $result['data']['projects'] ?? [];
        $stats = $result['data']['stats'] ?? [];
        $duration = $result['duration'] ?? 0;
        
        // Log removido - información innecesaria en producción
        
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
    }

    /**
     * Ejecutar scraping usando comando de Artisan
     */
    public function executeScrapingCommand($platform = 'workana', $options = [])
    {
        // Log removido - información innecesaria en producción
        
        $command = "scrape:{$platform}";
        $artisanOptions = [];
        
        if (isset($options['silent']) && $options['silent']) {
            $artisanOptions['--silent'] = true;
        }
        
        $exitCode = Artisan::call($command, $artisanOptions);
        
        if ($exitCode !== 0) {
            $context = [
                'exit_code' => $exitCode,
                'platform' => $platform,
                'command' => $exitCode,
                'options' => $options,
                'output' => $output,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Error ejecutando comando de scraping. Código: {$exitCode} - Context: " . json_encode($context));
        }
        
        $output = Artisan::output();
        
        // Log removido - información innecesaria en producción
        
        return [
            'success' => true,
            'exit_code' => $exitCode,
            'output' => $output
        ];
    }



    /**
     * Obtener estadísticas del scraping
     */
    public function getScrapingStats()
    {
        // Por ahora retornamos estadísticas básicas
        // En el futuro esto podría consultar logs o base de datos
        return [
            'last_scraping' => null,
            'total_scrapings' => 0,
            'success_rate' => 0,
            'average_duration' => 0
        ];
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
        // Log removido - información innecesaria en producción
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