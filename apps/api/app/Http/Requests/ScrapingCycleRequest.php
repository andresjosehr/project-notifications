<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScrapingCycleRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'iteration' => 'sometimes|integer|min:0',
            'platform' => 'sometimes|string',
            'limit' => 'sometimes|integer|min:1|max:1000',
        ];
    }

    public function messages()
    {
        return [
            'iteration.integer' => 'La iteración debe ser un número entero',
            'iteration.min' => 'La iteración debe ser mayor o igual a 0',
            'limit.min' => 'El límite debe ser al menos 1',
            'limit.max' => 'El límite no puede ser mayor a 1000',
        ];
    }
}