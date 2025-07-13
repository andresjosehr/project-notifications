<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchProjectsRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'query' => 'sometimes|string|max:255',
            'platform' => 'sometimes|string|max:50',
            'limit' => 'sometimes|integer|min:1|max:100',
        ];
    }

    public function messages()
    {
        return [
            'query.max' => 'La consulta no puede exceder los 255 caracteres',
            'platform.max' => 'El nombre de la plataforma no puede exceder los 50 caracteres',
            'limit.min' => 'El límite debe ser al menos 1',
            'limit.max' => 'El límite no puede ser mayor a 100',
        ];
    }
}