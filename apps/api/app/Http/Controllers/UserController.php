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
        $data = $this->authService->checkInitialization();
        return ApiResponse::success($data);
    }

    public function registerAdmin(RegisterAdminRequest $request)
    {
        $data = $this->authService->registerAdmin(
            $request->getEmail(),
            $request->getPassword()
        );
        
        return ApiResponse::success($data, 'Administrador registrado exitosamente. Ya puedes iniciar sesión.', 201);
    }

    public function login(LoginRequest $request)
    {
        $data = $this->authService->login(
            $request->getEmail(),
            $request->getPassword()
        );
        
        return ApiResponse::success($data);
    }

    public function status(Request $request)
    {
        $data = $this->authService->getStatus();
        return ApiResponse::success($data);
    }

    public function registerWithToken(RegisterWithTokenRequest $request)
    {
        $data = $this->authService->registerWithToken(
            $request->getToken(),
            $request->getEmail(),
            $request->getPassword(),
            $request->getTelegramUser()
        );
        
        return ApiResponse::success($data, 'Usuario registrado exitosamente', 201);
    }

    // Token Management Methods
    public function getAllTokens(TokenIndexRequest $request)
    {
        $data = $this->tokenService->getTokensList(
            $request->getOffset(),
            $request->getLimit()
        );
        
        return ApiResponse::success($data);
    }

    public function getTokenStats(AdminRequest $request)
    {
        $data = $this->tokenService->getTokenStats();
        return ApiResponse::success($data);
    }

    public function generateToken(AdminRequest $request)
    {
        $user = auth()->user();
        $data = $this->tokenService->generateToken($user->id);
        
        return ApiResponse::success($data, 'Token de registro generado exitosamente');
    }

    public function deleteToken(AdminRequest $request, $id)
    {
        $this->tokenService->deleteToken($id);
        return ApiResponse::success(['deleted' => true], 'Token eliminado exitosamente');
    }

    public function cleanupTokens(TokenCleanupRequest $request)
    {
        $days = $request->getDays();
        $result = $this->tokenService->cleanupOldTokens($days);
        
        return ApiResponse::success($result, $result['deleted_count'] . ' tokens antiguos eliminados');
    }

    public function validateToken(Request $request, $token)
    {
        $result = $this->tokenService->validateToken($token);
        return ApiResponse::success($result);
    }

    // User Management Methods
    public function index(AdminRequest $request)
    {
        $users = $this->userService->getAllUsers();
        
        return ApiResponse::success([
            'users' => $users,
            'count' => $users->count()
        ]);
    }

    public function show(UserAccessRequest $request, User $user)
    {
        $userData = $this->userService->formatUserData($user);
        return ApiResponse::success($userData);
    }

    public function store(CreateUserRequest $request)
    {
        $user = $this->userService->createUser(
            $request->getEmail(),
            $request->getPassword(),
            $request->getTelegramUser(),
            $request->getRole()
        );

        return ApiResponse::success($user, 'Usuario creado exitosamente', 201);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
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
    }

    public function destroy(AdminRequest $request, User $user)
    {
        $this->userService->deleteUser($user);
        return ApiResponse::success(['deleted' => true], 'Usuario eliminado exitosamente');
    }

    public function stats(AdminRequest $request)
    {
        $stats = $this->userService->getUserStats();
        return ApiResponse::success($stats);
    }
}