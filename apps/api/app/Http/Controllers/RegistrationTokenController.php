<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminRequest;
use App\Http\Requests\TokenIndexRequest;
use App\Http\Requests\TokenCleanupRequest;
use App\Http\Responses\ApiResponse;
use App\Services\RegistrationTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegistrationTokenController extends Controller
{
    protected $tokenService;

    public function __construct(RegistrationTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }
    public function generate(AdminRequest $request): JsonResponse
    {
        $user = Auth::user();
        $tokenData = $this->tokenService->generateToken($user->id);
        
        return ApiResponse::success($tokenData);
    }

    public function index(TokenIndexRequest $request): JsonResponse
    {
        $offset = $request->getOffset();
        $limit = $request->getLimit();
        
        $data = $this->tokenService->getTokensList($offset, $limit);
        
        return ApiResponse::success($data);
    }

    public function stats(AdminRequest $request): JsonResponse
    {
        $stats = $this->tokenService->getTokenStats();
        
        return ApiResponse::success($stats);
    }

    public function delete(AdminRequest $request, $id): JsonResponse
    {
        $this->tokenService->deleteToken($id);
        
        return ApiResponse::success(['deleted' => true], 'Token eliminado exitosamente');
    }

    public function cleanup(TokenCleanupRequest $request): JsonResponse
    {
        $days = $request->getDays();
        $result = $this->tokenService->cleanupOldTokens($days);
        
        return ApiResponse::success($result, "Se eliminaron {$result['deleted_count']} tokens");
    }

    public function validate($token): JsonResponse
    {
        $result = $this->tokenService->validateToken($token);
        
        return ApiResponse::success($result);
    }
}
