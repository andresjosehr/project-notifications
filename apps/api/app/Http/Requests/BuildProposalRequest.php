<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BuildProposalRequest extends FormRequest
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
                'max:255',
                'regex:/^[a-zA-Z0-9_-]+$/'
            ],
            'project_id' => [
                'sometimes',
                'string',
                'min:1',
                'max:255',
                'regex:/^[a-zA-Z0-9_-]+$/'
            ],
            'userId' => [
                'required',
                'integer',
                'min:1',
                'exists:users,id'
            ],
            'platform' => [
                'sometimes',
                'string',
                Rule::in(['workana', 'freelancer', 'upwork', 'fiverr', 'guru'])
            ],
            'language' => [
                'sometimes',
                'string',
                'size:2',
                Rule::in(['es', 'en', 'pt', 'fr'])
            ],
            'tone' => [
                'sometimes',
                'string',
                Rule::in(['professional', 'casual', 'technical', 'creative'])
            ],
            'max_words' => [
                'sometimes',
                'integer',
                'min:50',
                'max:2000'
            ],
            'include_portfolio' => [
                'sometimes',
                'boolean'
            ],
            'custom_instructions' => [
                'sometimes',
                'string',
                'max:1000'
            ]
        ];
    }

    public function messages()
    {
        return [
            'projectId.required' => 'El ID del proyecto es obligatorio',
            'projectId.regex' => 'El ID del proyecto contiene caracteres no válidos',
            'projectId.min' => 'El ID del proyecto no puede estar vacío',
            'projectId.max' => 'El ID del proyecto no puede exceder los 255 caracteres',
            
            'project_id.regex' => 'El ID del proyecto contiene caracteres no válidos',
            'project_id.min' => 'El ID del proyecto no puede estar vacío',
            'project_id.max' => 'El ID del proyecto no puede exceder los 255 caracteres',
            
            'userId.required' => 'El ID del usuario es obligatorio',
            'userId.integer' => 'El ID del usuario debe ser un número entero',
            'userId.min' => 'El ID del usuario debe ser mayor a 0',
            'userId.exists' => 'El usuario especificado no existe',
            
            'platform.in' => 'La plataforma debe ser una de: workana, freelancer, upwork, fiverr, guru',
            
            'language.size' => 'El idioma debe ser un código de 2 caracteres (es, en, pt, fr)',
            'language.in' => 'El idioma debe ser uno de: es, en, pt, fr',
            
            'tone.in' => 'El tono debe ser uno de: professional, casual, technical, creative',
            
            'max_words.integer' => 'El máximo de palabras debe ser un número entero',
            'max_words.min' => 'El máximo de palabras debe ser al menos 50',
            'max_words.max' => 'El máximo de palabras no puede exceder 2000',
            
            'include_portfolio.boolean' => 'La opción de incluir portafolio debe ser verdadero o falso',
            
            'custom_instructions.max' => 'Las instrucciones personalizadas no pueden exceder los 1000 caracteres'
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('project_id') && !$this->has('projectId')) {
            $this->merge(['projectId' => $this->project_id]);
        }
        
        if (!$this->has('platform')) {
            $this->merge(['platform' => 'workana']);
        }
        
        if (!$this->has('language')) {
            $this->merge(['language' => 'es']);
        }
        
        if (!$this->has('tone')) {
            $this->merge(['tone' => 'professional']);
        }
        
        if ($this->has('max_words')) {
            $this->merge(['max_words' => (int) $this->input('max_words')]);
        }
    }
    
    public function attributes()
    {
        return [
            'projectId' => 'ID del proyecto',
            'project_id' => 'ID del proyecto',
            'userId' => 'ID del usuario',
            'platform' => 'plataforma',
            'language' => 'idioma',
            'tone' => 'tono',
            'max_words' => 'máximo de palabras',
            'include_portfolio' => 'incluir portafolio',
            'custom_instructions' => 'instrucciones personalizadas'
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
    
    public function getPlatform(): string
    {
        return $this->validated()['platform'] ?? 'workana';
    }
    
    public function getOptions(): array
    {
        return $this->except(['projectId', 'project_id', 'userId', 'platform']);
    }
}