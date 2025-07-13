<?php

namespace App\Services;

use App\Models\User;
use App\Models\RegistrationToken;
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
            throw new \Exception('El sistema ya está inicializado. No se puede registrar un administrador adicional.');
        }

        $professionalProfile = $this->readContentFile('profesional-profile.txt');
        $proposalDirectives = $this->readContentFile('proposal-directives.txt');

        $user = User::create([
            'email' => $email,
            'password' => Hash::make($password),
            'telegram_user' => '',
            'role' => 'ADMIN',
        ]);

        Log::info('Administrador registrado exitosamente', ['user_id' => $user->id, 'email' => $email]);

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
            throw new \Exception('Credenciales inválidas');
        }

        if (!in_array($user->role, ['ADMIN', 'USER'])) {
            throw new \Exception('Acceso denegado. Rol de usuario inválido.');
        }

        if (!Hash::check($password, $user->password)) {
            throw new \Exception('Credenciales inválidas');
        }

        $token = JWTAuth::fromUser($user);

        Log::info('Login exitoso', ['user_id' => $user->id, 'email' => $email]);

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
            throw new \Exception('Token de registro inválido');
        }

        if (!$registrationToken->isValid()) {
            throw new \Exception('Token de registro ya utilizado');
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

        Log::info('Usuario registrado con token exitosamente', [
            'userId' => $user->id,
            'email' => $email,
            'registrationToken' => $token
        ]);

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

        try {
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
        } catch (\Exception $e) {
            $data['user'] = ['isAuthenticated' => false];
        }

        return $data;
    }

    private function readContentFile(string $filename): ?string
    {
        try {
            $filePath = base_path('../api/' . $filename);
            if (file_exists($filePath)) {
                return trim(file_get_contents($filePath));
            }
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}