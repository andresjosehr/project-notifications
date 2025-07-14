<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use App\Models\UserProposal;
use App\Services\ProposalSubmissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

class ProposalSubmissionTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $project;
    protected $proposalSubmissionService;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'role' => 'USER'
        ]);
        
        $this->project = Project::factory()->create([
            'platform' => 'workana',
            'link' => 'https://www.workana.com/job/12345'
        ]);
        
        $this->proposalSubmissionService = app(ProposalSubmissionService::class);
    }

    /** @test */
    public function it_prevents_duplicate_proposals()
    {
        // Crear una propuesta existente
        UserProposal::create([
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'project_platform' => 'workana',
            'proposal_sent_at' => now(),
            'proposal_content' => 'Propuesta anterior',
            'status' => 'sent'
        ]);

        // Intentar enviar otra propuesta para el mismo proyecto
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Ya se ha enviado una propuesta para este proyecto');

        $this->proposalSubmissionService->sendProposal(
            $this->project->id,
            $this->user->id,
            'Nueva propuesta',
            'workana'
        );
    }

    /** @test */
    public function it_saves_proposal_record_when_sent_successfully()
    {
        // Mock del servicio de comandos para simular envío exitoso
        $mockCommandService = $this->createMock(\App\Services\PlatformCommandService::class);
        $mockCommandService->method('executeSendProposal')
            ->willReturn(['success' => true]);

        $this->app->instance(\App\Services\PlatformCommandService::class, $mockCommandService);

        // Enviar propuesta
        $result = $this->proposalSubmissionService->sendProposal(
            $this->project->id,
            $this->user->id,
            'Contenido de la propuesta',
            'workana'
        );

        // Verificar que se guardó en la base de datos
        $this->assertDatabaseHas('user_proposals', [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'project_platform' => 'workana',
            'status' => 'sent'
        ]);

        $this->assertTrue($result['success']);
    }

    /** @test */
    public function it_returns_correct_stats_for_user()
    {
        // Crear algunas propuestas de prueba
        UserProposal::create([
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'project_platform' => 'workana',
            'proposal_sent_at' => now(),
            'proposal_content' => 'Propuesta 1',
            'status' => 'sent'
        ]);

        UserProposal::create([
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'project_platform' => 'upwork',
            'proposal_sent_at' => now()->subDays(2),
            'proposal_content' => 'Propuesta 2',
            'status' => 'accepted'
        ]);

        $stats = $this->proposalSubmissionService->getUserProposalStats($this->user->id);

        $this->assertEquals(2, $stats['total_proposals']);
        $this->assertEquals(1, $stats['recent_proposals']);
        $this->assertArrayHasKey('workana', $stats['platform_distribution']);
        $this->assertArrayHasKey('upwork', $stats['platform_distribution']);
    }

    /** @test */
    public function it_correctly_checks_if_user_can_send_proposal()
    {
        // Verificar que puede enviar propuesta cuando no existe
        $result = $this->proposalSubmissionService->canSendProposal(
            $this->user->id,
            $this->project->id,
            'workana'
        );

        $this->assertTrue($result['can_send']);
        $this->assertFalse($result['already_sent']);

        // Crear una propuesta existente
        UserProposal::create([
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'project_platform' => 'workana',
            'proposal_sent_at' => now(),
            'proposal_content' => 'Propuesta existente',
            'status' => 'sent'
        ]);

        // Verificar que no puede enviar propuesta cuando ya existe
        $result = $this->proposalSubmissionService->canSendProposal(
            $this->user->id,
            $this->project->id,
            'workana'
        );

        $this->assertFalse($result['can_send']);
        $this->assertTrue($result['already_sent']);
    }

    /** @test */
    public function it_returns_proposal_history_with_pagination()
    {
        // Crear múltiples propuestas
        for ($i = 1; $i <= 25; $i++) {
            UserProposal::create([
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'project_platform' => 'workana',
                'proposal_sent_at' => now()->subDays($i),
                'proposal_content' => "Propuesta {$i}",
                'status' => 'sent'
            ]);
        }

        $history = $this->proposalSubmissionService->getUserProposalHistory($this->user->id, [
            'limit' => 10,
            'offset' => 0
        ]);

        $this->assertEquals(25, $history['total']);
        $this->assertEquals(10, count($history['proposals']));
        $this->assertTrue($history['has_more']);
    }
} 