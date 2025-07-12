<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrationToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class RegistrationTokenController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $token = RegistrationToken::generateToken($user->id);
        
        return response()->json([
            'token' => $token->token,
            'registration_url' => url("/register?token={$token->token}"),
            'id' => $token->id,
            'created_at' => $token->created_at
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $offset = $request->get('offset', 0);
        $limit = $request->get('limit', 10);

        $tokens = RegistrationToken::with(['createdByAdmin', 'registeredUser'])
            ->orderBy('created_at', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get();

        $total = RegistrationToken::count();

        return response()->json([
            'tokens' => $tokens,
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit
        ]);
    }

    public function stats(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json(RegistrationToken::getTokenStats());
    }

    public function delete(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $token = RegistrationToken::find($id);
        
        if (!$token) {
            return response()->json(['error' => 'Token not found'], 404);
        }

        $token->delete();

        return response()->json(['success' => true]);
    }

    public function cleanup(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $days = $request->get('days', 30);
        $deleted = RegistrationToken::cleanupOldTokens($days);

        return response()->json([
            'deleted_count' => $deleted,
            'days' => $days
        ]);
    }

    public function validate(Request $request, $token): JsonResponse
    {
        $isValid = RegistrationToken::isValidToken($token);
        
        return response()->json([
            'valid' => $isValid,
            'token' => $token
        ]);
    }
}
