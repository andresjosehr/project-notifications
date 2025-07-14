<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterAdminRequest;
use App\Http\Requests\RegisterWithTokenRequest;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\AdminRequest;
use App\Http\Requests\UserAccessRequest;
use App\Http\Requests\TokenIndexRequest;
use App\Http\Requests\TokenCleanupRequest;
use App\Http\Responses\ApiResponse;
use App\Services\AuthenticationService;
use App\Services\UserManagementService;
use App\Services\RegistrationTokenService;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    protected $authService;
    protected $userService;
    protected $tokenService;

    public function __construct(
        AuthenticationService $authService,
        UserManagementService $userService,
        RegistrationTokenService $tokenService
    ) {
        $this->authService = $authService;
        $this->userService = $userService;
        $this->tokenService = $tokenService;
    }

    public function checkInitialization()
    {
        try {
            $data = $this->authService->checkInitialization();
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function registerAdmin(RegisterAdminRequest $request)
    {
        try {
            $data = $this->authService->registerAdmin(
                $request->getEmail(),
                $request->getPassword()
            );
            
            return ApiResponse::success($data, 'Administrador registrado exitosamente. Ya puedes iniciar sesión.', 201);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function login(LoginRequest $request)
    {
        try {
            $data = $this->authService->login(
                $request->getEmail(),
                $request->getPassword()
            );
            
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 401);
        }
    }

    public function status(Request $request)
    {
        try {
            $data = $this->authService->getStatus();
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function registerWithToken(RegisterWithTokenRequest $request)
    {
        try {
            $data = $this->authService->registerWithToken(
                $request->getToken(),
                $request->getEmail(),
                $request->getPassword(),
                $request->getTelegramUser()
            );
            
            return ApiResponse::success($data, 'Usuario registrado exitosamente', 201);
        } catch (\Exception $e) {
            Log::error('Error en registro con token', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    // Token Management Methods
    public function getAllTokens(TokenIndexRequest $request)
    {
        try {
            $data = $this->tokenService->getTokensList(
                $request->getOffset(),
                $request->getLimit()
            );
            
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            Log::error('Error obteniendo tokens', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function getTokenStats(AdminRequest $request)
    {
        try {
            $data = $this->tokenService->getTokenStats();
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de tokens', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function generateToken(AdminRequest $request)
    {
        try {
            $user = auth()->user();
            $data = $this->tokenService->generateToken($user->id);
            
            return ApiResponse::success($data, 'Token de registro generado exitosamente');
        } catch (\Exception $e) {
            Log::error('Error generando token de registro', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function deleteToken(AdminRequest $request, $id)
    {
        try {
            $this->tokenService->deleteToken($id);
            return ApiResponse::success(['deleted' => true], 'Token eliminado exitosamente');
        } catch (\Exception $e) {
            Log::error('Error eliminando token', ['error' => $e->getMessage()]);
            
            if (str_contains($e->getMessage(), 'no encontrado')) {
                return ApiResponse::notFound($e->getMessage());
            }
            
            return ApiResponse::error($e->getMessage());
        }
    }

    public function cleanupTokens(TokenCleanupRequest $request)
    {
        try {
            $days = $request->getDays();
            $result = $this->tokenService->cleanupOldTokens($days);
            
            return ApiResponse::success($result, $result['deleted_count'] . ' tokens antiguos eliminados');
        } catch (\Exception $e) {
            Log::error('Error limpiando tokens antiguos', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function validateToken(Request $request, $token)
    {
        try {
            $result = $this->tokenService->validateToken($token);
            return ApiResponse::success($result);
        } catch (\Exception $e) {
            Log::error('Error validando token', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    // User Management Methods
    public function index(AdminRequest $request)
    {
        try {
            $users = $this->userService->getAllUsers();
            
            return ApiResponse::success([
                'users' => $users,
                'count' => $users->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error obteniendo todos los usuarios', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function show(UserAccessRequest $request, User $user)
    {
        try {
            $userData = $this->userService->formatUserData($user);
            return ApiResponse::success($userData);
        } catch (\Exception $e) {
            Log::error('Error obteniendo usuario por ID', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function store(CreateUserRequest $request)
    {
        try {
            $user = $this->userService->createUser(
                $request->getEmail(),
                $request->getPassword(),
                $request->getTelegramUser(),
                $request->getRole()
            );

            return ApiResponse::success($user, 'Usuario creado exitosamente', 201);
        } catch (\Exception $e) {
            Log::error('Error creando usuario', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        try {
            $updateData = $request->getUpdateData();
            $password = $request->getPassword();
            $workanaCredentials = $request->getWorkanaCredentials();

            $updatedUser = $this->userService->updateUser(
                $user,
                $updateData,
                $password,
                $workanaCredentials
            );

            $userData = $this->userService->formatUserData($updatedUser);

            return ApiResponse::success($userData, 'Usuario actualizado exitosamente');
        } catch (\Exception $e) {
            Log::error('Error actualizando usuario', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(AdminRequest $request, User $user)
    {
        try {
            $this->userService->deleteUser($user);
            return ApiResponse::success(['deleted' => true], 'Usuario eliminado exitosamente');
        } catch (\Exception $e) {
            Log::error('Error eliminando usuario', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function stats(AdminRequest $request)
    {
        try {
            $stats = $this->userService->getUserStats();
            return ApiResponse::success($stats);
        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de usuarios', ['error' => $e->getMessage()]);
            return ApiResponse::error($e->getMessage());
        }
    }
}