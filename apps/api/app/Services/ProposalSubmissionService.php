<?php

namespace App\Services;

use App\Models\User;
use App\Models\Project;
use App\Models\UserProposal;
use Illuminate\Support\Facades\Log;

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
            $context = [
                'user_id' => $userId,
                'project_id' => $projectId,
                'platform' => $platform,
                'proposal_content_length' => strlen($proposalContent),
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception('Ya se ha enviado una propuesta para este proyecto - Context: ' . json_encode($context));
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

        $context = [
            'user_id' => $userId,
            'project_id' => $projectId,
            'platform' => $platform,
            'proposal_content_length' => strlen($proposalContent),
            'result' => $result,
            'timestamp' => now()->toISOString()
        ];
        throw new \Exception('Error enviando propuesta: ' . $result['error'] . ' - Context: ' . json_encode($context));
    }

    private function validateProject(string $projectId): Project
    {
        $project = Project::find($projectId);
        
        if (!$project) {
            $context = [
                'project_id' => $projectId,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception('Proyecto no encontrado - Context: ' . json_encode($context));
        }

        return $project;
    }

    private function validateUser(int $userId): User
    {
        $user = User::find($userId);
        
        if (!$user) {
            $context = [
                'user_id' => $userId,
                'timestamp' => now()->toISOString()
            ];
            throw new \Exception('Usuario no encontrado - Context: ' . json_encode($context));
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
                $context = [
                    'user_id' => $userId,
                    'platform' => $platform,
                    'login_result' => $loginResult,
                    'timestamp' => now()->toISOString()
                ];
                throw new \Exception(
                    'No se encontraron datos de sesión y falló el login: ' . $loginResult['error'] . ' - Context: ' . json_encode($context)
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
            Log::error('Error guardando registro de propuesta', [
                'error' => $e->getMessage(),
                'userId' => $userId,
                'projectId' => $projectId,
                'platform' => $platform
            ]);
            
            // No lanzar excepción aquí para no afectar el flujo principal
            // Solo loggear el error
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
}