<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role === 'ADMIN';
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
                'error' => 'No autorizado'
            ], 403)
        );
    }
}