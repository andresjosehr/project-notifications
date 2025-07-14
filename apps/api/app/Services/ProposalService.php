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
        Log::info("Generando propuesta para proyecto {$projectId} con usuario {$userId}");

        $project = $this->projectService->getProjectById($projectId, $platform);
        
        if (!$project) {
            throw new \Exception("Proyecto {$projectId} no encontrado");
        }

        // Si no se proporciona platform, obtenerlo del proyecto
        if (!$platform) {
            $platform = $project->platform;
        }

        Log::info("Generando propuesta para proyecto {$projectId} con usuario {$userId} de {$platform}");

        $user = User::find($userId);
        
        if (!$user) {
            throw new \Exception("Usuario {$userId} no encontrado");
        }

        $proposal = $this->generateProposal($project, $user, $options);
        
        Log::info("Propuesta generada exitosamente para proyecto {$projectId}");

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