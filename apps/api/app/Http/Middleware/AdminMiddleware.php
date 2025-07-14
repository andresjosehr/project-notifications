<?php

namespace App\Http\Middleware;

use App\Exceptions\GenericException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Facades\JWTAuth;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = JWTAuth::parseToken()->authenticate();

        if (!$user || $user->role !== 'ADMIN') {
            return response()->json([
                'success' => false,
                'error' => 'Acceso denegado. Requiere permisos de administrador.'
            ], 403);
        }

        return $next($request);
    }
}