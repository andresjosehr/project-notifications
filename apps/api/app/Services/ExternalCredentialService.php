<?php

namespace App\Services;

use App\Models\ExternalCredential;
use Illuminate\Support\Facades\Log;

class ExternalCredentialService
{
    public function getUserSessionData(int $userId, string $platform): ?string
    {
        $credentials = ExternalCredential::where('user_id', $userId)
            ->where('platform', $platform)
            ->first();
            
        if ($credentials && $credentials->session_data) {
            return $credentials->session_data;
        }
        
        return null;
    }

    public function getUserCredentials(int $userId, string $platform): ?ExternalCredential
    {
        return ExternalCredential::where('user_id', $userId)
            ->where('platform', $platform)
            ->first();
    }

    public function hasValidCredentials(int $userId, string $platform): bool
    {
        $credentials = $this->getUserCredentials($userId, $platform);
        
        return $credentials && 
               !empty($credentials->email) && 
               !empty($credentials->password);
    }

    public function updateSessionData(int $userId, string $platform, string $sessionData): bool
    {
        $credentials = $this->getUserCredentials($userId, $platform);
        
        if (!$credentials) {
            return false;
        }

        $credentials->session_data = $sessionData;
        return $credentials->save();
    }
}