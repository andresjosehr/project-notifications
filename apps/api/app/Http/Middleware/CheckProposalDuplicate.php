<?php

namespace App\Http\Middleware;

use App\Models\UserProposal;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CheckProposalDuplicate
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Solo aplicar a rutas de envío de propuestas
        if (!$request->is('api/proposal/send/*')) {
            return $next($request);
        }

        $userId = auth()->id();
        $projectId = $request->route('projectId');

        if (!$userId || !$projectId) {
            return $next($request);
        }

        // Obtener la plataforma del proyecto
        $project = \App\Models\Project::find($projectId);
        if (!$project) {
            return $next($request);
        }

        $platform = $project->platform;

        // Verificar si ya existe una propuesta
        $existingProposal = UserProposal::where('user_id', $userId)
            ->where('project_id', $projectId)
            ->where('project_platform', $platform)
            ->first();

        if ($existingProposal) {
            return response()->json([
                'success' => false,
                'message' => 'Ya se ha enviado una propuesta para este proyecto',
                'error' => 'DUPLICATE_PROPOSAL',
                'data' => [
                    'proposal_id' => $existingProposal->id,
                    'sent_at' => $existingProposal->proposal_sent_at,
                    'status' => $existingProposal->status
                ]
            ], 409);
        }

        return $next($request);
    }
} 