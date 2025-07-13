<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role === 'ADMIN';
    }

    public function rules()
    {
        $userId = $this->route('user')->id ?? null;
        
        return [
            'email' => [
                'sometimes',
                'email',
                'max:255',
                'unique:users,email,' . $userId
            ],
            'password' => [
                'sometimes',
                'string',
                'min:6'
            ],
            'telegramUser' => [
                'sometimes',
                'string',
                'max:255'
            ],
            'role' => [
                'sometimes',
                Rule::in(['USER', 'ADMIN'])
            ],
            'workanaEmail' => [
                'sometimes',
                'nullable',
                'email',
                'max:255'
            ],
            'workanaPassword' => [
                'sometimes',
                'nullable',
                'string'
            ],
            'proposalDirectives' => [
                'sometimes',
                'string',
                'max:5000'
            ],
            'professionalProfile' => [
                'sometimes',
                'string',
                'max:5000'
            ]
        ];
    }

    public function messages()
    {
        return [
            'email.email' => 'El email debe tener un formato válido',
            'email.max' => 'El email no puede exceder los 255 caracteres',
            'email.unique' => 'Este email ya está registrado',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres',
            'telegramUser.max' => 'El usuario de Telegram no puede exceder los 255 caracteres',
            'role.in' => 'El rol debe ser USER o ADMIN',
            'workanaEmail.email' => 'El email de Workana debe tener un formato válido',
            'workanaEmail.max' => 'El email de Workana no puede exceder los 255 caracteres',
            'proposalDirectives.max' => 'Las directivas de propuesta no pueden exceder los 5000 caracteres',
            'professionalProfile.max' => 'El perfil profesional no puede exceder los 5000 caracteres'
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

    public function getUpdateData(): array
    {
        $data = [];
        $validated = $this->validated();
        
        if (isset($validated['email'])) $data['email'] = $validated['email'];
        if (isset($validated['telegramUser'])) $data['telegram_user'] = $validated['telegramUser'];
        if (isset($validated['role'])) $data['role'] = $validated['role'];
        if (isset($validated['proposalDirectives'])) $data['proposal_directives'] = $validated['proposalDirectives'];
        if (isset($validated['professionalProfile'])) $data['professional_profile'] = $validated['professionalProfile'];
        
        return $data;
    }

    public function getPassword(): ?string
    {
        return $this->validated()['password'] ?? null;
    }

    public function getWorkanaCredentials(): array
    {
        return [
            'email' => $this->validated()['workanaEmail'] ?? null,
            'password' => $this->validated()['workanaPassword'] ?? null
        ];
    }
}