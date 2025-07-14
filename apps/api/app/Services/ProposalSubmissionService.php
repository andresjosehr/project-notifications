<?php

namespace App\Services;

use App\Models\User;
use App\Models\Project;
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

        Log::info('Iniciando envío de propuesta', [
            'projectId' => $projectId,
            'userId' => $userId,
            'platform' => $platform
        ]);

        $user = $this->validateUser($userId);
        $sessionData = $this->getOrCreateSessionData($userId, $platform);
        $projectLink = $this->formatProjectLink($project->link, $platform);

        $result = $this->commandService->executeSendProposal(
            $sessionData,
            $proposalContent,
            $projectLink
        );

        if ($result['success']) {
            Log::info('Propuesta enviada exitosamente', [
                'projectId' => $projectId,
                'userId' => $userId,
                'fallback' => $result['fallback'] ?? false
            ]);

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

        throw new \Exception('Error enviando propuesta: ' . $result['error']);
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
            Log::info('No se encontraron datos de sesión, intentando login');
            $loginResult = $this->attemptLogin($userId, $platform);
            
            if (!$loginResult['success']) {
                throw new \Exception(
                    'No se encontraron datos de sesión y falló el login: ' . $loginResult['error']
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
}