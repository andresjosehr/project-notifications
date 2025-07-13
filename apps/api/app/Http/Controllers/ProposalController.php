<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendProposalRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ProposalSubmissionService;
use Illuminate\Support\Facades\Log;

class ProposalController extends Controller
{
    protected $proposalSubmissionService;

    public function __construct(ProposalSubmissionService $proposalSubmissionService)
    {
        $this->proposalSubmissionService = $proposalSubmissionService;
    }

    public function send(SendProposalRequest $request)
    {
        try {
            $projectId = $request->getProjectId();
            $userId = $request->getUserId();
            $proposalContent = $request->getProposalContent();
            $platform = $request->getPlatform();

            $result = $this->proposalSubmissionService->sendProposal(
                $projectId,
                $userId,
                $proposalContent,
                $platform
            );
            
            return ApiResponse::success($result['data'], $result['message']);
            
        } catch (\Exception $e) {
            Log::error('Error enviando propuesta', [
                'error' => $e->getMessage(),
                'projectId' => $request->getProjectId() ?? null,
                'userId' => $request->getUserId() ?? null
            ]);
            
            return ApiResponse::error($e->getMessage());
        }
    }
}