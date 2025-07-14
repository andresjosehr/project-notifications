<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Exception;

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
     * Ejecutar comando externo de Node.js con manejo de errores estandarizado
     */
    protected function executeNodeCommand(string $command, array $context = []): array
    {
        // Asegurar que se ejecute desde el directorio correcto
        $command = "cd " . base_path() . " && " . $command;
        $output = shell_exec($command);
        
        if (empty($output)) {
            $exceptionContext = [
                'context' => $context,
                'command' => $command,
                'timestamp' => now()->toISOString()
            ];
            throw new Exception("No se recibió output del comando: {$command} - Context: " . json_encode($exceptionContext));
        }

        $result = json_decode($output, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $exceptionContext = [
                'json_error' => json_last_error_msg(),
                'output' => $output,
                'command' => $command,
                'context' => $context,
                'timestamp' => now()->toISOString()
            ];
            throw new Exception("Error parseando JSON: " . json_last_error_msg() . " - Context: " . json_encode($exceptionContext));
        }

        // Validar formato estándar de respuesta
        if (!isset($result['success'])) {
            $exceptionContext = [
                'result' => $result,
                'command' => $command,
                'context' => $context,
                'timestamp' => now()->toISOString()
            ];
            throw new Exception("Respuesta inválida del comando Node.js - falta campo 'success' - Context: " . json_encode($exceptionContext));
        }

        return $result;
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