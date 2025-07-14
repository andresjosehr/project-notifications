<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use App\Http\Responses\ApiResponse;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<\Throwable>, \Psr\Log\LogLevel::*>
     */
    protected $levels = [
        //
    ];

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<\Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed to the session on validation exceptions.
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
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // Si es una petición AJAX o API (espera JSON), devolver respuesta JSON con formato ApiResponse
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->renderApiResponse($request, $e);
        }

        // Para peticiones web normales, usar el comportamiento por defecto de Laravel
        return parent::render($request, $e);
    }

    /**
     * Renderiza una respuesta API consistente para todas las excepciones
     */
    protected function renderApiResponse(Request $request, Throwable $e)
    {
        // Logging detallado para debugging
        Log::error('Exception capturada por Handler global', [
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'user_id' => auth()->id(),
            'trace' => $e->getTraceAsString()
        ]);

        // Determinar el código de estado HTTP apropiado
        $statusCode = $this->getStatusCode($e);

        // Crear respuesta usando ApiResponse para mantener consistencia
        return ApiResponse::error(
            $e->getMessage() ?: 'Ha ocurrido un error inesperado',
            $statusCode
        );
    }

    /**
     * Determina el código de estado HTTP apropiado para la excepción
     */
    protected function getStatusCode(Throwable $e): int
    {
        // Si la excepción ya tiene un código de estado HTTP, usarlo
        if (method_exists($e, 'getStatusCode')) {
            return $e->getStatusCode();
        }

        // Códigos específicos basados en el tipo de excepción
        switch (true) {
            case $e instanceof \Illuminate\Auth\AuthenticationException:
                return Response::HTTP_UNAUTHORIZED; // 401

            case $e instanceof \Illuminate\Auth\Access\AuthorizationException:
                return Response::HTTP_FORBIDDEN; // 403

            case $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException:
                return Response::HTTP_NOT_FOUND; // 404

            case $e instanceof \Illuminate\Validation\ValidationException:
                return Response::HTTP_UNPROCESSABLE_ENTITY; // 422

            case $e instanceof \Illuminate\Http\Exceptions\ThrottleRequestsException:
                return Response::HTTP_TOO_MANY_REQUESTS; // 429

            case $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException:
                return Response::HTTP_NOT_FOUND; // 404

            case $e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException:
                return Response::HTTP_METHOD_NOT_ALLOWED; // 405

            default:
                return Response::HTTP_INTERNAL_SERVER_ERROR; // 500
        }
    }
}