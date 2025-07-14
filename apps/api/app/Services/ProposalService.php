<?php

namespace App\Services;

use App\Models\User;
use App\Services\AIService;
use App\Services\ProjectService;
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
            throw new \Exception("Proyecto {$projectId} no encontrado", 0, null, $context);
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
            throw new \Exception("Usuario {$userId} no encontrado", 0, null, $context);
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
        if ($user->professional_profile && $user->proposal_directives) {
            return $this->aiService->generateProposalWithUserProfile(
                $project->title,
                $project->description,
                $user->professional_profile,
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