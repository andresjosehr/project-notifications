<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TokenCleanupRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role === 'ADMIN';
    }

    public function rules()
    {
        return [
            'days' => [
                'sometimes',
                'integer',
                'min:1',
                'max:365'
            ]
        ];
    }

    public function messages()
    {
        return [
            'days.integer' => 'Los días deben ser un número entero',
            'days.min' => 'Los días deben ser al menos 1',
            'days.max' => 'Los días no pueden ser más de 365'
        ];
    }

    protected function prepareForValidation()
    {
        if (!$this->has('days')) {
            $this->merge(['days' => 30]);
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

    public function getDays(): int
    {
        return $this->validated()['days'];
    }
}