<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\Request;
use App\Http\Responses\ApiResponse;

class GenericException extends Exception
{
    public function render(Request $request)
    {
        return ApiResponse::error($this->getMessage(), 500);
    }
}