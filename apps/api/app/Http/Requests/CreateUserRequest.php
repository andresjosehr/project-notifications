<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateUserRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role === 'ADMIN';
    }

    public function rules()
    {
        return [
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email'
            ],
            'password' => [
                'required',
                'string',
                'min:6'
            ],
            'telegram_user' => [
                'required',
                'string',
                'max:255'
            ],
            'role' => [
                'sometimes',
                Rule::in(['USER', 'ADMIN'])
            ]
        ];
    }

    public function messages()
    {
        return [
            'email.required' => 'El email es obligatorio',
            'email.email' => 'El email debe tener un formato válido',
            'email.max' => 'El email no puede exceder los 255 caracteres',
            'email.unique' => 'Este email ya está registrado',
            'password.required' => 'La contraseña es obligatoria',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres',
            'telegram_user.required' => 'El usuario de Telegram es obligatorio',
            'telegram_user.max' => 'El usuario de Telegram no puede exceder los 255 caracteres',
            'role.in' => 'El rol debe ser USER o ADMIN'
        ];
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

    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        $errors = $validator->errors()->toArray();
        
        throw new \Illuminate\Http\Exceptions\HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Los datos proporcionados no son válidos',
                'errors' => $errors
            ], 422)
        );
    }

    public function getEmail(): string
    {
        return $this->validated()['email'];
    }

    public function getPassword(): string
    {
        return $this->validated()['password'];
    }

    public function getTelegramUser(): string
    {
        return $this->validated()['telegram_user'];
    }

    public function getRole(): string
    {
        return $this->validated()['role'] ?? 'USER';
    }
}