<?php

namespace App\Services;

use App\Models\User;
use App\Services\AIService;
use App\Services\ProjectService;
use App\Exceptions\GenericException;
use Illuminate\Support\Facades\Log;

class ProposalService
{
    protected $aiService;
    protected $projectService;

    public function __construct(AIService $aiService, ProjectService $projectService)
    {
        $this->aiService = $aiService;
        $this->projectService = $projectService;
    }

    public function buildProposal(string $projectId, int $userId, ?string $platform = null, array $options = []): array
    {
        // Log removido - información innecesaria en producción

        $project = $this->projectService->getProjectById($projectId, $platform);
        
        if (!$project) {
            $context = [
                'project_id' => $projectId,
                'user_id' => $userId,
                'platform' => $platform ?? 'null',
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Proyecto {$projectId} no encontrado - Context: " . json_encode($context));
        }

        // Si no se proporciona platform, obtenerlo del proyecto
        if (!$platform) {
            $platform = $project->platform;
        }

        // Log removido - información innecesaria en producción

        $user = User::find($userId);
        
        if (!$user) {
            $context = [
                'user_id' => $userId,
                'project_id' => $projectId,
                'platform' => $platform ?? 'null',
                'timestamp' => now()->toISOString()
            ];
            throw new GenericException("Usuario {$userId} no encontrado - Context: " . json_encode($context));
        }

        $proposal = $this->generateProposal($project, $user, $options);
        
        // Log removido - información innecesaria en producción

        return [
            'projectId' => $projectId,
            'userId' => $userId,
            'proposal' => $proposal,
            'projectTitle' => $project->title,
            'userEmail' => $user->email,
            'platform' => $platform
        ];
    }

    protected function generateProposal($project, User $user, array $options): string
    {
        if ($user->proposal_directives) {
            return $this->aiService->generateProposalWithUserProfile(
                $project->title,
                $project->description,
                $user->proposal_directives,
                $user->proposal_directives,
                array_merge($options, ['language' => $project->language ?? 'es'])
            );
        }

        return $this->aiService->buildProposal(
            $project->description,
            array_merge($options, ['language' => $project->language ?? 'es'])
        );
    }
}