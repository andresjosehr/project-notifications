<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TokenIndexRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role === 'ADMIN';
    }

    public function rules()
    {
        return [
            'offset' => [
                'sometimes',
                'integer',
                'min:0'
            ],
            'limit' => [
                'sometimes',
                'integer',
                'min:1',
                'max:100'
            ]
        ];
    }

    public function messages()
    {
        return [
            'offset.integer' => 'El offset debe ser un número entero',
            'offset.min' => 'El offset debe ser mayor o igual a 0',
            'limit.integer' => 'El límite debe ser un número entero',
            'limit.min' => 'El límite debe ser al menos 1',
            'limit.max' => 'El límite no puede ser mayor a 100'
        ];
    }

    protected function prepareForValidation()
    {
        if (!$this->has('offset')) {
            $this->merge(['offset' => 0]);
        }
        
        if (!$this->has('limit')) {
            $this->merge(['limit' => 10]);
        }
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

    public function getOffset(): int
    {
        return $this->validated()['offset'];
    }

    public function getLimit(): int
    {
        return $this->validated()['limit'];
    }
}