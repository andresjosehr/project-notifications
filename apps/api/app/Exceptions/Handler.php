<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Support\Facades\Log;
use Throwable;
use App\Exceptions\TelescopeException;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            $this->logExceptionForTelescope($e);
        });
    }

    /**
     * Log exception with enriched context for Telescope
     */
    protected function logExceptionForTelescope(Throwable $e): void
    {
        $context = [
            'exception_class' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ];

        // Si es una TelescopeException, usar su contexto enriquecido
        if ($e instanceof TelescopeException) {
            $context = array_merge($context, $e->getTelescopeData());
        } else {
            // Enriquecer excepciones regulares con contexto básico
            $context = array_merge($context, [
                'user_id' => auth()->id(),
                'url' => request()->fullUrl(),
                'method' => request()->method(),
                'user_agent' => request()->userAgent(),
                'ip' => request()->ip(),
                'timestamp' => now()->toISOString(),
                'environment' => config('app.env'),
            ]);
        }

        Log::error('Exception captured for Telescope', $context);
    }

    /**
     * Report or log an exception.
     */
    public function report(Throwable $e): void
    {
        // Solo reportar en producción si es una excepción importante
        if (app()->environment('production')) {
            // Filtrar excepciones que no necesitan ser reportadas
            if ($this->shouldReport($e)) {
                parent::report($e);
            }
        } else {
            parent::report($e);
        }
    }

    /**
     * Determine if the exception should be reported.
     */
    protected function shouldReport(Throwable $e): bool
    {
        // No reportar excepciones de validación o autenticación
        $dontReport = [
            \Illuminate\Validation\ValidationException::class,
            \Illuminate\Auth\AuthenticationException::class,
            \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
        ];

        foreach ($dontReport as $exceptionClass) {
            if ($e instanceof $exceptionClass) {
                return false;
            }
        }

        return true;
    }
} 