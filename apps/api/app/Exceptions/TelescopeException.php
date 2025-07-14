<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class TelescopeException extends Exception
{
    protected $context;
    protected $userId;
    protected $requestData;
    protected $operation;

    public function __construct($message = "", $code = 0, Exception $previous = null, array $context = [])
    {
        parent::__construct($message, $code, $previous);
        
        $this->context = $context;
        $this->userId = Auth::id();
        $this->requestData = $this->getRequestData();
        $this->operation = $context['operation'] ?? 'unknown';
    }

    public function getContext(): array
    {
        return [
            'user_id' => $this->userId,
            'operation' => $this->operation,
            'request_data' => $this->requestData,
            'context' => $this->context,
            'timestamp' => now()->toISOString(),
            'environment' => config('app.env'),
            'url' => Request::fullUrl(),
            'method' => Request::method(),
            'user_agent' => Request::userAgent(),
            'ip' => Request::ip(),
        ];
    }

    protected function getRequestData(): array
    {
        $data = [];
        
        // Datos de la petición (sin información sensible)
        if (Request::isMethod('GET')) {
            $data['query'] = Request::query();
        } else {
            $data['input'] = Request::except(['password', 'token', 'api_key']);
        }
        
        // Headers relevantes (sin información sensible)
        $headers = Request::headers();
        $data['headers'] = [
            'content-type' => $headers->get('content-type'),
            'accept' => $headers->get('accept'),
            'user-agent' => $headers->get('user-agent'),
        ];
        
        return $data;
    }

    public function getTelescopeData(): array
    {
        return [
            'message' => $this->getMessage(),
            'code' => $this->getCode(),
            'file' => $this->getFile(),
            'line' => $this->getLine(),
            'trace' => $this->getTraceAsString(),
            'context' => $this->getContext(),
        ];
    }
} 