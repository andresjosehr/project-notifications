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
        try {
            $user = Auth::user();
            $tokenData = $this->tokenService->generateToken($user->id);
            
            return ApiResponse::success($tokenData);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function index(TokenIndexRequest $request): JsonResponse
    {
        try {
            $offset = $request->getOffset();
            $limit = $request->getLimit();
            
            $data = $this->tokenService->getTokensList($offset, $limit);
            
            return ApiResponse::success($data);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function stats(AdminRequest $request): JsonResponse
    {
        try {
            $stats = $this->tokenService->getTokenStats();
            
            return ApiResponse::success($stats);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function delete(AdminRequest $request, $id): JsonResponse
    {
        try {
            $this->tokenService->deleteToken($id);
            
            return ApiResponse::success(['deleted' => true], 'Token eliminado exitosamente');
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'no encontrado')) {
                return ApiResponse::notFound($e->getMessage());
            }
            return ApiResponse::error($e->getMessage());
        }
    }

    public function cleanup(TokenCleanupRequest $request): JsonResponse
    {
        try {
            $days = $request->getDays();
            $result = $this->tokenService->cleanupOldTokens($days);
            
            return ApiResponse::success($result, "Se eliminaron {$result['deleted_count']} tokens");
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }

    public function validate($token): JsonResponse
    {
        try {
            $result = $this->tokenService->validateToken($token);
            
            return ApiResponse::success($result);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage());
        }
    }
}
