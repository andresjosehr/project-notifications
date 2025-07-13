<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendProposalRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check();
    }

    public function rules()
    {
        return [
            'projectId' => [
                'required',
                'string',
                'min:1',
                'max:255'
            ],
            'userId' => [
                'required',
                'integer',
                'min:1',
                'exists:users,id'
            ],
            'proposalContent' => [
                'required',
                'string',
                'min:10',
                'max:5000'
            ],
            'platform' => [
                'required',
                'string',
                Rule::in(['workana', 'freelancer', 'upwork', 'fiverr', 'guru'])
            ]
        ];
    }

    public function messages()
    {
        return [
            'projectId.required' => 'El ID del proyecto es obligatorio',
            'projectId.min' => 'El ID del proyecto no puede estar vacío',
            'projectId.max' => 'El ID del proyecto no puede exceder los 255 caracteres',
            
            'userId.required' => 'El ID del usuario es obligatorio',
            'userId.integer' => 'El ID del usuario debe ser un número entero',
            'userId.min' => 'El ID del usuario debe ser mayor a 0',
            'userId.exists' => 'El usuario especificado no existe',
            
            'proposalContent.required' => 'El contenido de la propuesta es obligatorio',
            'proposalContent.min' => 'La propuesta debe tener al menos 10 caracteres',
            'proposalContent.max' => 'La propuesta no puede exceder los 5000 caracteres',
            
            'platform.required' => 'La plataforma es obligatoria',
            'platform.in' => 'La plataforma debe ser una de: workana, freelancer, upwork, fiverr, guru'
        ];
    }

    public function attributes()
    {
        return [
            'projectId' => 'ID del proyecto',
            'userId' => 'ID del usuario',
            'proposalContent' => 'contenido de la propuesta',
            'platform' => 'plataforma'
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

    public function getProjectId(): string
    {
        return $this->validated()['projectId'];
    }

    public function getUserId(): int
    {
        return $this->validated()['userId'];
    }

    public function getProposalContent(): string
    {
        return $this->validated()['proposalContent'];
    }

    public function getPlatform(): string
    {
        return $this->validated()['platform'];
    }
}