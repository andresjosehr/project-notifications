<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendProposalRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ProposalSubmissionService;
use App\Models\UserProposal;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class ProposalController extends Controller
{
    protected $proposalSubmissionService;

    public function __construct(ProposalSubmissionService $proposalSubmissionService)
    {
        $this->proposalSubmissionService = $proposalSubmissionService;
    }

    public function sendByProjectId(Request $request, $projectId)
    {
        try {
            $userId = auth()->id();
            $proposalContent = $request->input('proposalContent');

            if (!$proposalContent) {
                return ApiResponse::error('El contenido de la propuesta es obligatorio');
            }

            $result = $this->proposalSubmissionService->sendProposal(
                $projectId,
                $userId,
                $proposalContent,
                null // platform se obtendrá del proyecto
            );
            
            return ApiResponse::success($result['data'], $result['message']);
            
        } catch (\Exception $e) {
            Log::error('Error enviando propuesta', [
                'error' => $e->getMessage(),
                'projectId' => $projectId,
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }

    /**
     * Obtiene las propuestas enviadas por el usuario autenticado
     */
    public function getUserProposals(Request $request)
    {
        try {
            $userId = auth()->id();
            $platform = $request->query('platform');
            $limit = $request->query('limit', 20);
            $offset = $request->query('offset', 0);

            $query = UserProposal::with(['project', 'user'])
                ->where('user_id', $userId);

            if ($platform) {
                $query->where('project_platform', $platform);
            }

            $proposals = $query->orderBy('proposal_sent_at', 'desc')
                ->skip($offset)
                ->take($limit)
                ->get();

            $total = $query->count();

            return ApiResponse::success([
                'proposals' => $proposals,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'platform' => $platform ?? 'all'
            ], 'Propuestas obtenidas exitosamente');
            
        } catch (\Exception $e) {
            Log::error('Error obteniendo propuestas del usuario', [
                'error' => $e->getMessage(),
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }

    /**
     * Obtiene una propuesta específica por ID
     */
    public function getProposalById(Request $request, $proposalId)
    {
        try {
            $userId = auth()->id();
            
            $proposal = UserProposal::with(['project', 'user'])
                ->where('id', $proposalId)
                ->where('user_id', $userId)
                ->first();

            if (!$proposal) {
                return ApiResponse::error('Propuesta no encontrada', 404);
            }

            return ApiResponse::success($proposal, 'Propuesta obtenida exitosamente');
            
        } catch (\Exception $e) {
            Log::error('Error obteniendo propuesta por ID', [
                'error' => $e->getMessage(),
                'proposalId' => $proposalId,
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }

    /**
     * Obtiene estadísticas de propuestas del usuario autenticado
     */
    public function getUserProposalStats(Request $request)
    {
        try {
            $userId = auth()->id();
            $platform = $request->query('platform');

            $stats = $this->proposalSubmissionService->getUserProposalStats($userId, $platform);

            return ApiResponse::success($stats, 'Estadísticas obtenidas exitosamente');
            
        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas de propuestas', [
                'error' => $e->getMessage(),
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }

    /**
     * Verifica si el usuario puede enviar propuesta a un proyecto específico
     */
    public function checkCanSendProposal(Request $request, $projectId)
    {
        try {
            $userId = auth()->id();
            $platform = $request->query('platform', 'workana');

            $result = $this->proposalSubmissionService->canSendProposal($userId, $projectId, $platform);

            return ApiResponse::success($result, 'Verificación completada');
            
        } catch (\Exception $e) {
            Log::error('Error verificando capacidad de envío de propuesta', [
                'error' => $e->getMessage(),
                'projectId' => $projectId,
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }

    /**
     * Obtiene el historial completo de propuestas del usuario
     */
    public function getUserProposalHistory(Request $request)
    {
        try {
            $userId = auth()->id();
            $options = [
                'platform' => $request->query('platform'),
                'limit' => $request->query('limit', 20),
                'offset' => $request->query('offset', 0),
                'status' => $request->query('status')
            ];

            $history = $this->proposalSubmissionService->getUserProposalHistory($userId, $options);

            return ApiResponse::success($history, 'Historial obtenido exitosamente');
            
        } catch (\Exception $e) {
            Log::error('Error obteniendo historial de propuestas', [
                'error' => $e->getMessage(),
                'userId' => auth()->id()
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }
}