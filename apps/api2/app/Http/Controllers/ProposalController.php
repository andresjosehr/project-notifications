<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\ExternalCredential;

class ProposalController extends Controller
{
    /**
     * Enviar propuesta validando parámetros, sesión y ejecutando comando Artisan
     */
    public function send(Request $request)
    {
        try {
            // Validar campos requeridos
            $request->validate([
                'projectId' => 'required|string',
                'userId' => 'required|integer',
                'proposalContent' => 'required|string',
                'platform' => 'required|string|in:workana'
            ]);
            
            $projectId = $request->input('projectId');
            $userId = $request->input('userId');
            $proposalContent = $request->input('proposalContent');
            $platform = $request->input('platform');
            
            // Verificar que el usuario existe
            $user = User::find($userId);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no encontrado'
                ], 404);
            }
            
            // Obtener datos de sesión del usuario
            $sessionData = $this->getUserSessionData($userId, $platform);
            if (!$sessionData) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontraron datos de sesión para el usuario'
                ], 400);
            }
            
            // Ejecutar comando Artisan
            $result = $this->executeProposalCommand($sessionData, $proposalContent);
            
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Propuesta enviada correctamente',
                    'data' => [
                        'projectId' => $projectId,
                        'userId' => $userId,
                        'platform' => $platform,
                        'proposalSent' => true
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Error enviando propuesta: ' . $result['error']
                ], 400);
            }
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos de entrada inválidos',
                'details' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error enviando propuesta', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Obtener datos de sesión del usuario
     */
    private function getUserSessionData($userId, $platform)
    {
        $credentials = ExternalCredential::where('user_id', $userId)
            ->where('platform', $platform)
            ->first();
            
        if ($credentials && $credentials->session_data) {
            $sessionData = $credentials->session_data;
            
            // Validar que sessionData sea un array válido
            if (is_array($sessionData)) {
                return $sessionData;
            }
        }
        
        return null;
    }
    
    /**
     * Ejecutar comando Artisan para enviar propuesta
     */
    private function executeProposalCommand($sessionData, $proposalContent)
    {
        try {
            $command = "php artisan workana:send-proposal " .
                "'" . addslashes(json_encode($sessionData)) . "' " .
                "'" . addslashes($proposalContent) . "'";
            
            $output = shell_exec($command . " 2>&1");
            $exitCode = shell_exec("echo $?");
            
            if ($exitCode == 0) {
                return [
                    'success' => true,
                    'output' => trim($output)
                ];
            } else {
                return [
                    'success' => false,
                    'error' => trim($output)
                ];
            }
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
} 