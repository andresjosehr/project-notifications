<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success($data = null, string $message = null, int $status = 200): JsonResponse
    {
        $response = ['success' => true];
        
        if ($message) {
            $response['message'] = $message;
        }
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        return response()->json($response, $status);
    }

    public static function error(string $message, int $status = 500, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'error' => $message
        ];
        
        if ($errors) {
            $response['errors'] = $errors;
        }
        
        return response()->json($response, $status);
    }

    public static function notFound(string $message = 'Recurso no encontrado'): JsonResponse
    {
        return self::error($message, 404);
    }

    public static function badRequest(string $message = 'Solicitud inválida'): JsonResponse
    {
        return self::error($message, 400);
    }

    public static function unauthorized(string $message = 'No autorizado'): JsonResponse
    {
        return self::error($message, 401);
    }

    public static function forbidden(string $message = 'Prohibido'): JsonResponse
    {
        return self::error($message, 403);
    }
}