<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScrapingRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'silent' => [
                'sometimes',
                'boolean'
            ],
            'platform' => [
                'sometimes',
                'string',
                Rule::in(['workana', 'freelancer', 'upwork', 'fiverr', 'guru'])
            ]
        ];
    }

    public function messages()
    {
        return [
            'silent.boolean' => 'El parámetro silent debe ser verdadero o falso',
            'platform.in' => 'La plataforma debe ser una de: workana, freelancer, upwork, fiverr, guru'
        ];
    }

    protected function prepareForValidation()
    {
        if (!$this->has('silent')) {
            $this->merge(['silent' => false]);
        }
        
        if (!$this->has('platform')) {
            $this->merge(['platform' => 'workana']);
        }
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

    public function isSilent(): bool
    {
        return $this->validated()['silent'];
    }

    public function getPlatform(): string
    {
        return $this->validated()['platform'];
    }

    public function getOptions(): array
    {
        return [
            'silent' => $this->isSilent()
        ];
    }
}