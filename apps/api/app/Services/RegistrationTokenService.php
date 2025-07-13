<?php

namespace App\Services;

use App\Models\RegistrationToken;
use Illuminate\Support\Facades\Log;

class RegistrationTokenService
{
    public function generateToken(int $adminUserId): array
    {
        Log::info('Generando nuevo token de registro', ['admin_id' => $adminUserId]);
        
        $token = RegistrationToken::generateToken($adminUserId);
        
        Log::info('Token generado exitosamente', ['token_id' => $token->id]);
        
        return [
            'token' => $token->token,
            'registration_url' => url("/register?token={$token->token}"),
            'id' => $token->id,
            'created_at' => $token->created_at
        ];
    }

    public function getTokensList(int $offset = 0, int $limit = 10): array
    {
        $tokens = RegistrationToken::with(['createdByAdmin', 'registeredUser'])
            ->orderBy('created_at', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get();

        $total = RegistrationToken::count();

        return [
            'tokens' => $tokens,
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit
        ];
    }

    public function getTokenStats(): array
    {
        return RegistrationToken::getTokenStats();
    }

    public function deleteToken(string $tokenId): bool
    {
        $token = RegistrationToken::find($tokenId);
        
        if (!$token) {
            throw new \Exception('Token no encontrado');
        }

        Log::info('Eliminando token', ['token_id' => $tokenId]);
        
        return $token->delete();
    }

    public function cleanupOldTokens(int $days = 30): array
    {
        Log::info('Iniciando limpieza de tokens antiguos', ['days' => $days]);
        
        $deleted = RegistrationToken::cleanupOldTokens($days);
        
        Log::info('Limpieza completada', ['deleted_count' => $deleted, 'days' => $days]);
        
        return [
            'deleted_count' => $deleted,
            'days' => $days
        ];
    }

    public function validateToken(string $token): array
    {
        $isValid = RegistrationToken::isValidToken($token);
        
        Log::info('Validación de token', ['token' => $token, 'valid' => $isValid]);
        
        return [
            'valid' => $isValid,
            'token' => $token
        ];
    }

    public function getTokenById(string $tokenId): ?RegistrationToken
    {
        return RegistrationToken::find($tokenId);
    }

    public function getTokenByValue(string $tokenValue): ?RegistrationToken
    {
        return RegistrationToken::where('token', $tokenValue)->first();
    }
}