<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LoggingMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $duration = microtime(true) - $startTime;
        
        // Solo logear errores y operaciones críticas
        if ($response->getStatusCode() >= 400) {
            $this->logError($request, $response, $duration);
        } elseif ($this->isCriticalOperation($request)) {
            $this->logCriticalOperation($request, $response, $duration);
        }
        
        return $response;
    }

    /**
     * Log error responses
     */
    protected function logError(Request $request, Response $response, float $duration): void
    {
        Log::error('HTTP Error Response', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'status_code' => $response->getStatusCode(),
            'duration' => round($duration * 1000, 2) . 'ms',
            'user_id' => auth()->id(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_data' => $this->getSanitizedRequestData($request),
        ]);
    }

    /**
     * Log critical operations (scraping, propuestas, etc.)
     */
    protected function logCriticalOperation(Request $request, Response $response, float $duration): void
    {
        Log::warning('Critical Operation Executed', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'status_code' => $response->getStatusCode(),
            'duration' => round($duration * 1000, 2) . 'ms',
            'user_id' => auth()->id(),
            'operation_type' => $this->getOperationType($request),
        ]);
    }

    /**
     * Determine if this is a critical operation
     */
    protected function isCriticalOperation(Request $request): bool
    {
        $criticalPaths = [
            'scraping',
            'proposals',
            'projects',
            'admin',
        ];

        $path = $request->path();
        
        foreach ($criticalPaths as $criticalPath) {
            if (str_contains($path, $criticalPath)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get operation type for logging
     */
    protected function getOperationType(Request $request): string
    {
        $path = $request->path();
        
        if (str_contains($path, 'scraping')) {
            return 'scraping_operation';
        }
        
        if (str_contains($path, 'proposals')) {
            return 'proposal_operation';
        }
        
        if (str_contains($path, 'projects')) {
            return 'project_operation';
        }
        
        if (str_contains($path, 'admin')) {
            return 'admin_operation';
        }
        
        return 'general_operation';
    }

    /**
     * Get sanitized request data (without sensitive information)
     */
    protected function getSanitizedRequestData(Request $request): array
    {
        $data = [];
        
        if ($request->isMethod('GET')) {
            $data['query'] = $request->query();
        } else {
            $data['input'] = $request->except([
                'password',
                'token',
                'api_key',
                'secret',
                'authorization'
            ]);
        }
        
        return $data;
    }
} 