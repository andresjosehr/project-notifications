<?php

namespace App\Services;

use App\Models\User;
use App\Models\Project;
use App\Models\UserProposal;

class ProposalSubmissionService
{
    protected $credentialService;
    protected $commandService;

    public function __construct(
        ExternalCredentialService $credentialService,
        PlatformCommandService $commandService
    ) {
        $this->credentialService = $credentialService;
        $this->commandService = $commandService;
    }

    public function sendProposal(
        string $projectId,
        int $userId,
        string $proposalContent,
        ?string $platform = null
    ): array {
        $project = $this->validateProject($projectId);
        
        // Si no se proporciona platform, obtenerlo del proyecto
        if (!$platform) {
            $platform = $project->platform;
        }

        // Log removido - información innecesaria en producción

        // Validar si ya existe una propuesta para este usuario y proyecto
        if ($this->proposalAlreadyExists($userId, $projectId, $platform)) {
            throw new \Exception('Ya se ha enviado una propuesta para este proyecto');
        }

        $user = $this->validateUser($userId);
        $sessionData = $this->getOrCreateSessionData($userId, $platform);
        $projectLink = $this->formatProjectLink($project->link, $platform);

        $result = $this->commandService->executeSendProposal(
            $sessionData,
            $proposalContent,
            $projectLink
        );

        if ($result['success']) {
            // Guardar el registro en user_proposal
            $this->saveProposalRecord($userId, $projectId, $platform, $proposalContent);

            // Log removido - información innecesaria en producción

            return [
                'success' => true,
                'message' => 'Propuesta enviada correctamente',
                'data' => [
                    'projectId' => $projectId,
                    'userId' => $userId,
                    'platform' => $platform,
                    'proposalSent' => true,
                    'fallback' => $result['fallback'] ?? false
                ]
            ];
        }

        // Crear una excepción que preserve la información estructurada del error
        $this->handleProposalError($result);
    }

    private function validateProject(string $projectId): Project
    {
        $project = Project::find($projectId);
        
        if (!$project) {
            throw new \Exception('Proyecto no encontrado');
        }

        return $project;
    }

    private function validateUser(int $userId): User
    {
        $user = User::find($userId);
        
        if (!$user) {
            throw new \Exception('Usuario no encontrado');
        }

        return $user;
    }

    private function getOrCreateSessionData(int $userId, string $platform): string
    {
        $sessionData = $this->credentialService->getUserSessionData($userId, $platform);
        
        if (!$sessionData) {
            // Log removido - información innecesaria en producción
            $loginResult = $this->attemptLogin($userId, $platform);
            
            if (!$loginResult['success']) {
                // Extraer mensaje específico del error de login
                $specificError = $this->extractSpecificErrorMessage($loginResult['error']);
                $errorMessage = $specificError ?: $loginResult['error'];
                
                throw new \Exception(
                    'No se encontraron datos de sesión válidos. ' . $errorMessage
                );
            }
            
            $sessionData = $loginResult['sessionData'];

            $sessionData = $this->credentialService->getUserSessionData($userId, $platform);
        }

        return $sessionData;
    }

    private function attemptLogin(int $userId, string $platform): array
    {
        if (!$this->credentialService->hasValidCredentials($userId, $platform)) {
            return [
                'success' => false,
                'error' => 'No se encontraron credenciales de ' . $platform . ' para el usuario'
            ];
        }

        $credentials = $this->credentialService->getUserCredentials($userId, $platform);
        
        return $this->commandService->executeLogin(
            $userId,
            $credentials->email,
            $credentials->password
        );
    }

    private function formatProjectLink(string $originalLink, string $platform): string
    {
        if ($platform !== 'workana') {
            return $originalLink;
        }

        $projectLink = str_replace(
            'https://www.workana.com/job/',
            'https://www.workana.com/messages/bid/',
            $originalLink
        );
        
        $projectLink = str_replace('?tab=message&ref=project_view', '', $projectLink);
        $projectLink .= '/?tab=message&ref=project_view';

        return $projectLink;
    }

    /**
     * Verifica si ya existe una propuesta para el usuario y proyecto
     */
    private function proposalAlreadyExists(int $userId, string $projectId, string $platform): bool
    {
        return UserProposal::where('user_id', $userId)
            ->where('project_id', $projectId)
            ->where('project_platform', $platform)
            ->exists();
    }

    /**
     * Guarda el registro de la propuesta enviada
     */
    private function saveProposalRecord(int $userId, string $projectId, string $platform, string $proposalContent): void
    {
        try {
            UserProposal::create([
                'user_id' => $userId,
                'project_id' => $projectId,
                'project_platform' => $platform,
                'proposal_sent_at' => now(),
                'proposal_content' => $proposalContent,
                'status' => 'sent'
            ]);

            // Log removido - información innecesaria en producción
        } catch (\Exception $e) {
            // No lanzar excepción aquí para no afectar el flujo principal
            // Solo manejar el error silenciosamente
        }
    }

    /**
     * Obtiene estadísticas de propuestas para un usuario
     */
    public function getUserProposalStats(int $userId, ?string $platform = null): array
    {
        $query = UserProposal::where('user_id', $userId);
        
        if ($platform) {
            $query->where('project_platform', $platform);
        }

        $totalProposals = $query->count();
        $recentProposals = $query->where('proposal_sent_at', '>=', now()->subDays(7))->count();
        
        $statusStats = $query->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $platformStats = UserProposal::where('user_id', $userId)
            ->selectRaw('project_platform, COUNT(*) as count')
            ->groupBy('project_platform')
            ->pluck('count', 'project_platform')
            ->toArray();

        return [
            'total_proposals' => $totalProposals,
            'recent_proposals' => $recentProposals,
            'status_distribution' => $statusStats,
            'platform_distribution' => $platformStats,
            'user_id' => $userId,
            'platform' => $platform ?? 'all'
        ];
    }

    /**
     * Verifica si un usuario puede enviar propuesta a un proyecto específico
     */
    public function canSendProposal(int $userId, string $projectId, string $platform): array
    {
        $exists = $this->proposalAlreadyExists($userId, $projectId, $platform);
        
        return [
            'can_send' => !$exists,
            'already_sent' => $exists,
            'user_id' => $userId,
            'project_id' => $projectId,
            'platform' => $platform
        ];
    }

    /**
     * Obtiene el historial de propuestas de un usuario con paginación
     */
    public function getUserProposalHistory(int $userId, array $options = []): array
    {
        $platform = $options['platform'] ?? null;
        $limit = $options['limit'] ?? 20;
        $offset = $options['offset'] ?? 0;
        $status = $options['status'] ?? null;

        $query = UserProposal::with(['project', 'user'])
            ->where('user_id', $userId);

        if ($platform) {
            $query->where('project_platform', $platform);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $proposals = $query->orderBy('proposal_sent_at', 'desc')
            ->skip($offset)
            ->take($limit)
            ->get();

        $total = $query->count();

        return [
            'proposals' => $proposals,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ];
    }

    /**
     * Maneja errores de propuestas preservando información estructurada
     */
    private function handleProposalError(array $result): void
    {
        $error = $result['error'] ?? null;
        $data = $result['data'] ?? [];

        // Si tenemos información estructurada del error (nueva implementación)
        if (is_array($error) && isset($data['errorType'])) {
            $errorType = $data['errorType'];
            $userMessage = $data['userMessage'] ?? $error['message'] ?? 'Error desconocido';
            $category = $data['category'] ?? 'unknown';
            $suggestions = $data['suggestions'] ?? [];

            // Crear mensaje de error específico según el tipo
            switch ($errorType) {
                case 'INVALID_CREDENTIALS':
                    $message = "Credenciales inválidas para Workana. {$userMessage}";
                    break;
                case 'CAPTCHA_REQUIRED':
                    $message = "CAPTCHA requerido en Workana. {$userMessage}";
                    break;
                case 'ACCOUNT_BLOCKED':
                    $message = "Cuenta bloqueada en Workana. {$userMessage}";
                    break;
                case 'EMAIL_NOT_VERIFIED':
                    $message = "Email no verificado en Workana. {$userMessage}";
                    break;
                case 'RATE_LIMITED':
                    $message = "Límite de intentos excedido en Workana. {$userMessage}";
                    break;
                case 'SERVER_ERROR':
                    $message = "Error del servidor de Workana. {$userMessage}";
                    break;
                default:
                    $message = "Error en Workana: {$userMessage}";
            }

            // Si hay sugerencias, agregar la primera como contexto adicional
            if (!empty($suggestions)) {
                $message .= " Sugerencia: " . $suggestions[0];
            }

            throw new \Exception($message);
        }

        // Intentar extraer mensaje específico de error JSON escapado
        $errorMessage = is_array($error) ? ($error['message'] ?? 'Error desconocido') : $error;
        
        // Si el error contiene JSON escapado, intentar extraer el mensaje específico
        if (is_string($errorMessage) && str_contains($errorMessage, '{"type"')) {
            $extractedMessage = $this->extractSpecificErrorMessage($errorMessage);
            if ($extractedMessage) {
                $errorMessage = $extractedMessage;
            }
        }

        throw new \Exception($errorMessage);
    }

    /**
     * Extrae mensaje específico de error desde JSON escapado
     */
    private function extractSpecificErrorMessage(string $errorMessage): ?string
    {
        // Intentar decodificar JSON si está presente
        if (preg_match('/\{.*\}/', $errorMessage, $matches)) {
            $jsonString = $matches[0];
            
            // Desescapar caracteres
            $jsonString = str_replace('\\"', '"', $jsonString);
            $jsonString = str_replace('\\/', '/', $jsonString);
            
            $decoded = json_decode($jsonString, true);
            if (json_last_error() === JSON_ERROR_NONE && isset($decoded['message'])) {
                $extractedMessage = $decoded['message'];
                
                // Determinar tipo de error específico y crear mensaje amigable
                if (str_contains($extractedMessage, 'CAPTCHA')) {
                    return 'Se requiere completar CAPTCHA en Workana debido a demasiados intentos fallidos';
                } elseif (str_contains($extractedMessage, 'credenciales') || str_contains($extractedMessage, 'contraseña')) {
                    return 'Credenciales de Workana incorrectas. Verifica tu email y contraseña';
                } elseif (str_contains($extractedMessage, 'bloqueada') || str_contains($extractedMessage, 'blocked')) {
                    return 'Cuenta de Workana bloqueada temporalmente por seguridad';
                } elseif (str_contains($extractedMessage, 'verificar') || str_contains($extractedMessage, 'verify')) {
                    return 'Cuenta de Workana no verificada. Revisa tu correo electrónico';
                } else {
                    return $extractedMessage;
                }
            }
        }

        // Fallback: buscar mensaje directo con regex simple
        if (preg_match('/"message":\s*"([^"]*(?:\\.[^"]*)*)"/', $errorMessage, $matches)) {
            return stripslashes($matches[1]);
        }

        return null;
    }
}