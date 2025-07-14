<?php

namespace App\Services;

use App\Models\User;
use App\Models\RegistrationToken;
use App\Exceptions\GenericException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthenticationService
{
    public function checkInitialization(): array
    {
        $userCount = User::count();
        
        return [
            'isInitialized' => $userCount > 0,
            'userCount' => $userCount
        ];
    }

    public function registerAdmin(string $email, string $password): array
    {
        $userCount = User::count();
        if ($userCount > 0) {
            $context = [
                'user_count' => $userCount,
                'email' => $email,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('El sistema ya está inicializado. No se puede registrar un administrador adicional. - Context: ' . json_encode($context));
        }

        $professionalProfile = $this->readContentFile('profesional-profile.txt');
        $proposalDirectives = $this->readContentFile('proposal-directives.txt');

        $user = User::create([
            'email' => $email,
            'password' => Hash::make($password),
            'telegram_user' => '',
            'role' => 'ADMIN',
        ]);

        // Log removido - información innecesaria en producción

        return [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role
        ];
    }

    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)
                   ->where('is_active', true)
                   ->first();

        if (!$user) {
            $context = [
                'email' => $email,
                'user_found' => false,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Credenciales inválidas - Context: ' . json_encode($context));
        }

        if (!in_array($user->role, ['ADMIN', 'USER'])) {
            $context = [
                'user_id' => $user->id,
                'email' => $email,
                'role' => $user->role,
                'valid_roles' => ['ADMIN', 'USER'],
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Acceso denegado. Rol de usuario inválido. - Context: ' . json_encode($context));
        }

        if (!Hash::check($password, $user->password)) {
            $context = [
                'email' => $email,
                'user_id' => $user->id,
                'password_check' => false,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Credenciales inválidas - Context: ' . json_encode($context));
        }

        $token = JWTAuth::fromUser($user);

        // Log removido - información innecesaria en producción

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role
            ]
        ];
    }

    public function registerWithToken(string $token, string $email, string $password, ?string $telegramUser = null): array
    {
        $registrationToken = RegistrationToken::where('token', $token)->first();
        
        if (!$registrationToken) {
            $context = [
                'token' => $token,
                'token_found' => false,
                'email' => $email,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Token de registro inválido - Context: ' . json_encode($context));
        }

        if (!$registrationToken->isValid()) {
            $context = [
                'token_id' => $registrationToken->id,
                'token' => $token,
                'is_valid' => false,
                'email' => $email,
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException('Token de registro ya utilizado - Context: ' . json_encode($context));
        }

        $user = User::create([
            'email' => $email,
            'password' => Hash::make($password),
            'telegram_user' => $telegramUser,
            'role' => 'USER',
            'is_active' => true
        ]);

        $registrationToken->markAsUsed($user->id);

        $jwtToken = JWTAuth::fromUser($user);

        // Log removido - información innecesaria en producción

        return [
            'token' => $jwtToken,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'telegram_user' => $user->telegram_user
            ]
        ];
    }

    public function getStatus(): array
    {
        $data = [
            'app' => 'Laravel API v2.0',
            'status' => 'running',
            'timestamp' => now()->toISOString()
        ];

        $user = JWTAuth::parseToken()->authenticate();
        if ($user) {
            $data['user'] = [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'isAuthenticated' => true
            ];
        } else {
            $data['user'] = ['isAuthenticated' => false];
        }

        return $data;
    }

    private function readContentFile(string $filename): ?string
    {
        $filePath = base_path('../api/' . $filename);
        if (file_exists($filePath)) {
            return trim(file_get_contents($filePath));
        }
        return null;
    }
}