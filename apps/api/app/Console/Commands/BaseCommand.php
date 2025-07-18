<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Exceptions\GenericException;

abstract class BaseCommand extends Command
{
    /**
     * Formato estándar para respuestas de comandos
     */
    protected function standardResponse(array $data): array
    {
        return [
            'success' => true,
            'platform' => $data['platform'] ?? 'workana',
            'operation' => $data['operation'] ?? $this->getName(),
            'data' => $data['data'] ?? [],
            'message' => $data['message'] ?? '',
            'duration' => $data['duration'] ?? null
        ];
    }

    /**
     * Formato estándar para errores de comandos
     */
    protected function standardError(string $message, string $type = 'command_error', array $context = []): array
    {
        return [
            'success' => false,
            'platform' => $context['platform'] ?? 'workana',
            'operation' => $context['operation'] ?? $this->getName(),
            'error' => [
                'type' => $type,
                'message' => $message
            ],
            'context' => $context
        ];
    }

    /**
     * Manejo centralizado de errores para comandos
     */
    protected function handleError(Exception $e, array $context = []): int
    {
        $error = $this->standardError($e->getMessage(), 'exception', $context);
        
        Log::error("Error en comando {$this->getName()}", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'context' => $context
        ]);

        $this->error(json_encode($error, JSON_UNESCAPED_UNICODE));
        
        return 1;
    }

    /**
     * Manejo centralizado de respuestas exitosas
     */
    protected function handleSuccess(array $data = []): int
    {
        $response = $this->standardResponse($data);
        
        $this->info(json_encode($response, JSON_UNESCAPED_UNICODE));
        
        return 0;
    }

    /**
     * Ejecutar comando externo de Node.js y retornar resultado en crudo
     * CAMBIO CRÍTICO: NO lanza excepciones, retorna valores en crudo
     */
    protected function executeNodeCommand(string $command, array $context = []): array
    {
        // Asegurar que se ejecute desde el directorio correcto
        $command = "cd " . base_path() . " && " . $command;
        $output = shell_exec($command);
        
        if (empty($output)) {
            // Retornar error en formato estándar en lugar de lanzar excepción
            return [
                'success' => false,
                'error' => [
                    'type' => 'no_output',
                    'message' => "No se recibió output del comando: {$command}"
                ],
                'context' => $context,
                'timestamp' => now()->toISOString()
            ];
        }

        // Extraer JSON del output - el CLI puede tener mensajes de error antes del JSON
        $cleanedOutput = $this->extractJsonFromOutput($output);
        
        $result = json_decode($cleanedOutput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Si falla el parsing del JSON limpio, intentar parsear línea por línea
            $result = $this->parseOutputByLines($output);
            
            if (!$result) {
                // Retornar error en formato estándar en lugar de lanzar excepción
                return [
                    'success' => false,
                    'error' => [
                        'type' => 'json_parse_error',
                        'message' => "Error parseando JSON: " . json_last_error_msg()
                    ],
                    'context' => $context,
                    'output' => $output,
                    'cleaned_output' => $cleanedOutput,
                    'timestamp' => now()->toISOString()
                ];
            }
        }

        return $result;
    }

   

    /**
     * Extraer JSON válido del output del CLI
     */
    private function extractJsonFromOutput(string $output): string
    {
        $lines = explode("\n", trim($output));
        
        // Buscar líneas que empiecen con { o [ (inicio de JSON)
        foreach ($lines as $line) {
            $trimmedLine = trim($line);
            if (str_starts_with($trimmedLine, '{') || str_starts_with($trimmedLine, '[')) {
                // Encontrar el JSON completo (puede ser multilinea)
                $jsonStart = strpos($output, $trimmedLine);
                $jsonContent = substr($output, $jsonStart);
                
                // Intentar encontrar el final del JSON
                $braceCount = 0;
                $inString = false;
                $escaped = false;
                $jsonEnd = 0;
                
                for ($i = 0; $i < strlen($jsonContent); $i++) {
                    $char = $jsonContent[$i];
                    
                    if (!$inString) {
                        if ($char === '{') {
                            $braceCount++;
                        } elseif ($char === '}') {
                            $braceCount--;
                            if ($braceCount === 0) {
                                $jsonEnd = $i + 1;
                                break;
                            }
                        } elseif ($char === '"') {
                            $inString = true;
                        }
                    } else {
                        if ($char === '"' && !$escaped) {
                            $inString = false;
                        }
                        $escaped = ($char === '\\' && !$escaped);
                    }
                }
                
                if ($jsonEnd > 0) {
                    return substr($jsonContent, 0, $jsonEnd);
                } else {
                    return $jsonContent; // Fallback si no podemos determinar el final
                }
            }
        }
        
        return $output; // Fallback: devolver output original
    }

    /**
     * Parsear output línea por línea buscando JSON válido
     */
    private function parseOutputByLines(string $output): ?array
    {
        $lines = explode("\n", trim($output));
        
        foreach ($lines as $line) {
            $trimmedLine = trim($line);
            if (str_starts_with($trimmedLine, '{')) {
                $result = json_decode($trimmedLine, true);
                if (json_last_error() === JSON_ERROR_NONE && isset($result['success'])) {
                    return $result;
                }
            }
        }
        
        // Intentar con el output completo sin las primeras líneas de error
        $filteredLines = array_filter($lines, function($line) {
            $trimmed = trim($line);
            return !str_starts_with($trimmed, '❌') && 
                   !str_starts_with($trimmed, 'Error:') && 
                   !empty($trimmed);
        });
        
        $filteredOutput = implode("\n", $filteredLines);
        $result = json_decode($filteredOutput, true);
        
        if (json_last_error() === JSON_ERROR_NONE && isset($result['success'])) {
            return $result;
        }
        
        return null;
    }

    /**
     * Validar argumentos requeridos
     */
    protected function validateRequiredArguments(array $required): bool
    {
        foreach ($required as $arg) {
            if (empty($this->argument($arg))) {
                $this->error("Argumento requerido faltante: {$arg}");
                return false;
            }
        }
        return true;
    }

    /**
     * Log de información estructurada - DESHABILITADO EN PRODUCCIÓN
     */
    protected function logInfo(string $message, array $context = []): void
    {
        // Log removido - información innecesaria en producción
        // Solo se mantiene para compatibilidad
    }

    /**
     * Log de warning estructurado
     */
    protected function logWarning(string $message, array $context = []): void
    {
        Log::warning($message, array_merge([
            'command' => $this->getName(),
            'platform' => 'workana'
        ], $context));
    }
}