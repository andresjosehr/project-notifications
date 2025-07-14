<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserAccessRequest extends FormRequest
{
    public function authorize()
    {
        $user = auth()->user();
        
        if (!$user) {
            return false;
        }

        // Los administradores pueden acceder a cualquier usuario
        if ($user->role === 'ADMIN') {
            return true;
        }

        // Los usuarios regulares solo pueden acceder a su propia información
        $requestedUserId = $this->route('user')->id ?? null;
        
        if (!$requestedUserId) {
            return false;
        }

        return $user->id == $requestedUserId;
    }

    public function rules()
    {
        return [];
    }

    protected function failedAuthorization()
    {
        throw new \Illuminate\Http\Exceptions\HttpResponseException(
            response()->json([
                'success' => false,
                'error' => 'No autorizado para acceder a esta información de usuario'
            ], 403)
        );
    }
} 