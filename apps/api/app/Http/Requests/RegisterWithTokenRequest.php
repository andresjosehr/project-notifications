<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterWithTokenRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'token' => [
                'required',
                'string'
            ],
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
                'sometimes',
                'string',
                'max:255'
            ]
        ];
    }

    public function messages()
    {
        return [
            'token.required' => 'El token de registro es obligatorio',
            'email.required' => 'El email es obligatorio',
            'email.email' => 'El email debe tener un formato válido',
            'email.max' => 'El email no puede exceder los 255 caracteres',
            'email.unique' => 'Este email ya está registrado',
            'password.required' => 'La contraseña es obligatoria',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres',
            'telegram_user.max' => 'El usuario de Telegram no puede exceder los 255 caracteres'
        ];
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

    public function getToken(): string
    {
        return $this->validated()['token'];
    }

    public function getEmail(): string
    {
        return $this->validated()['email'];
    }

    public function getPassword(): string
    {
        return $this->validated()['password'];
    }

    public function getTelegramUser(): ?string
    {
        return $this->validated()['telegram_user'] ?? null;
    }
}