<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Intentar autenticar usando JWT
            $user = JWTAuth::parseToken()->authenticate();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no encontrado'
                ], 401);
            }

            // Verificar si el usuario está activo
            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario inactivo'
                ], 401);
            }

            return $next($request);

        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Token de autenticación requerido o inválido'
            ], 401);
        }
    }
}