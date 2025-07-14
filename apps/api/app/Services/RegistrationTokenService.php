<?php

namespace App\Services;

use App\Exceptions\GenericException;
use App\Models\RegistrationToken;
use Illuminate\Support\Facades\Log;

class RegistrationTokenService
{
    public function generateToken(int $adminUserId): array
    {
        // Log removido - información innecesaria en producción
        
        $token = RegistrationToken::generateToken($adminUserId);
        
        // Log removido - información innecesaria en producción
        
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
            $context = [
                'token_id' => $tokenId,
                'token_found' => false,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Token no encontrado - Context: ' . json_encode($context));
        }

        // Log removido - información innecesaria en producción
        
        return $token->delete();
    }

    public function cleanupOldTokens(int $days = 30): array
    {
        // Log removido - información innecesaria en producción
        
        $deleted = RegistrationToken::cleanupOldTokens($days);
        
        // Log removido - información innecesaria en producción
        
        return [
            'deleted_count' => $deleted,
            'days' => $days
        ];
    }

    public function validateToken(string $token): array
    {
        $isValid = RegistrationToken::isValidToken($token);
        
        // Log removido - información innecesaria en producción
        
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