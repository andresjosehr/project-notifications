<?php

namespace App\Services;

use App\Models\User;
use App\Models\ExternalCredential;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;

class UserManagementService
{
    protected $externalCredentialService;

    public function __construct(ExternalCredentialService $externalCredentialService)
    {
        $this->externalCredentialService = $externalCredentialService;
    }

    public function getAllUsers(): Collection
    {
        return User::with(['externalCredentials'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getUserById(int $userId): User
    {
        $user = User::with(['externalCredentials'])->find($userId);
        
        if (!$user) {
            $context = [
                'user_id' => $userId,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception('Usuario no encontrado', 0, null, $context);
        }

        return $user;
    }

    public function createUser(string $email, string $password, string $telegramUser, string $role = 'USER'): User
    {
        $user = User::create([
            'email' => $email,
            'password' => Hash::make($password),
            'telegram_user' => $telegramUser,
            'role' => $role,
            'is_active' => true
        ]);

        // Log removido - información innecesaria en producción

        return $user;
    }

    public function updateUser(User $user, array $updateData, ?string $password = null, array $workanaCredentials = []): User
    {
        if ($password) {
            $updateData['password'] = Hash::make($password);
        }

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        if (!empty($workanaCredentials['email']) || !empty($workanaCredentials['password'])) {
            $this->updateExternalCredentials($user, $workanaCredentials);
        }

        $user->load(['externalCredentials']);

        // Log removido - información innecesaria en producción

        return $user;
    }

    public function deleteUser(User $user): bool
    {
        $email = $user->email;
        $userId = $user->id;
        
        $deleted = $user->delete();

        if ($deleted) {
            // Log removido - información innecesaria en producción
        }

        return $deleted;
    }

    public function getUserStats(): array
    {
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        
        $usersWithValidSession = User::whereHas('accessTokens', function($query) {
            $query->valid();
        })->orWhereHas('sessions', function($query) {
            $query->where('last_activity', '>', now()->subHours(24)->timestamp);
        })->count();

        return [
            'total' => $totalUsers,
            'active' => $activeUsers,
            'inactive' => $totalUsers - $activeUsers,
            'withValidSession' => $usersWithValidSession
        ];
    }

    public function formatUserData(User $user): array
    {
        $userData = $user->toArray();
        $userData['credentials'] = $user->externalCredentials->map(function($credential) {
            return [
                'id' => $credential->id,
                'platform' => $credential->platform,
                'email' => $credential->email,
                'isActive' => $credential->is_active
            ];
        });
        unset($userData['external_credentials']);
        
        return $userData;
    }

    private function updateExternalCredentials(User $user, array $workanaCredentials): void
    {
        $workanaCredential = ExternalCredential::where('user_id', $user->id)
            ->where('platform', 'workana')
            ->first();

        $credentialData = [
            'user_id' => $user->id,
            'platform' => 'workana',
            'is_active' => true
        ];

        if (!empty($workanaCredentials['email'])) {
            $credentialData['email'] = $workanaCredentials['email'];
        }

        if (!empty($workanaCredentials['password'])) {
            $credentialData['password'] = $workanaCredentials['password'];
        }

        if ($workanaCredential) {
            $workanaCredential->update($credentialData);
        } else {
            ExternalCredential::create($credentialData);
        }
    }
}