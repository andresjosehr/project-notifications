<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendProposalRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ProposalSubmissionService;
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
}