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
        $this->scriptPath = base_path('apps/api2/cli.js');
    }

    /**
     * Ejecutar scraping de Workana usando Node.js
     */
    public function scrapeWorkana($options = [])
    {
        try {
            Log::info('Solicitando scraping de Workana desde Node.js', $options);

            $quietFlag = isset($options['silent']) && $options['silent'] ? '--quiet' : '';
            $command = "{$this->nodePath} {$this->scriptPath} scrape-workana {$quietFlag} 2>&1";
            
            $output = shell_exec($command);
            $returnCode = $this->getLastReturnCode();
            
            if ($returnCode !== 0) {
                throw new \Exception("Error ejecutando Node.js scraper. Código: {$returnCode}, Output: {$output}");
            }
            
            $result = json_decode($output, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Error parseando JSON de Node.js: " . json_last_error_msg() . "\nOutput: {$output}");
            }
            
            if (!$result['success']) {
                throw new \Exception("Error en scraping: " . ($result['error']['message'] ?? 'Error desconocido'));
            }
            
            Log::info('Scraping de Workana completado', [
                'projects_count' => count($result['projects']),
                'duration' => $result['duration'] ?? 0
            ]);
            
            return $result;
            
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
     * Verificar salud del servicio de scraping
     */
    public function healthCheck()
    {
        try {
            // Verificar que Node.js esté disponible
            $nodeVersion = shell_exec("{$this->nodePath} --version 2>&1");
            $nodeAvailable = !empty($nodeVersion) && strpos($nodeVersion, 'v') === 0;
            
            // Verificar que el script existe
            $scriptExists = file_exists($this->scriptPath);
            
            // Verificar que las dependencias estén instaladas
            $packageJsonExists = file_exists(dirname($this->scriptPath) . '/package.json');
            $nodeModulesExists = file_exists(dirname($this->scriptPath) . '/node_modules');
            
            $status = 'healthy';
            $issues = [];
            
            if (!$nodeAvailable) {
                $status = 'unhealthy';
                $issues[] = 'Node.js no disponible';
            }
            
            if (!$scriptExists) {
                $status = 'unhealthy';
                $issues[] = 'Script de scraping no encontrado';
            }
            
            if (!$packageJsonExists) {
                $status = 'unhealthy';
                $issues[] = 'package.json no encontrado';
            }
            
            if (!$nodeModulesExists) {
                $status = 'unhealthy';
                $issues[] = 'Dependencias de Node.js no instaladas';
            }
            
            return [
                'node_scraper' => [
                    'status' => $status,
                    'node_version' => $nodeVersion ? trim($nodeVersion) : null,
                    'script_path' => $this->scriptPath,
                    'script_exists' => $scriptExists,
                    'package_json_exists' => $packageJsonExists,
                    'node_modules_exists' => $nodeModulesExists,
                    'issues' => $issues
                ]
            ];
            
        } catch (\Exception $e) {
            return [
                'node_scraper' => [
                    'status' => 'unreachable',
                    'error' => $e->getMessage()
                ]
            ];
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
}