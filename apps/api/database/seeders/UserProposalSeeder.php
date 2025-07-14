<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\UserProposal;
use Illuminate\Database\Seeder;

class UserProposalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $projects = Project::all();

        if ($users->isEmpty() || $projects->isEmpty()) {
            $this->command->warn('No hay usuarios o proyectos disponibles para crear propuestas de prueba');
            return;
        }

        $this->command->info('Creando propuestas de prueba...');

        $proposalCount = 0;
        $platforms = ['workana', 'upwork'];
        $statuses = ['sent', 'accepted', 'rejected', 'pending'];

        foreach ($users as $user) {
            // Crear 3-8 propuestas por usuario
            $userProposalCount = rand(3, 8);
            
            for ($i = 0; $i < $userProposalCount; $i++) {
                $project = $projects->random();
                $platform = $platforms[array_rand($platforms)];
                $status = $statuses[array_rand($statuses)];
                
                // Verificar que no exista ya una propuesta para este usuario y proyecto
                $existingProposal = UserProposal::where('user_id', $user->id)
                    ->where('project_id', $project->id)
                    ->where('project_platform', $platform)
                    ->exists();

                if (!$existingProposal) {
                    UserProposal::create([
                        'user_id' => $user->id,
                        'project_id' => $project->id,
                        'project_platform' => $platform,
                        'proposal_sent_at' => now()->subDays(rand(1, 30)),
                        'proposal_content' => $this->generateProposalContent(),
                        'status' => $status
                    ]);
                    
                    $proposalCount++;
                }
            }
        }

        $this->command->info("Creadas {$proposalCount} propuestas de prueba");
    }

    /**
     * Genera contenido de propuesta de prueba
     */
    private function generateProposalContent(): string
    {
        $contents = [
            'Hola! Me interesa mucho tu proyecto. Tengo experiencia en desarrollo web y puedo ayudarte a completarlo de manera profesional.',
            'Excelente proyecto! Soy desarrollador Full Stack con 5 años de experiencia. Me encantaría trabajar contigo en este proyecto.',
            'Hola, he revisado tu proyecto y creo que puedo aportar mucho valor. Tengo experiencia similar y puedo entregar resultados de calidad.',
            'Me gusta mucho tu proyecto. Soy especialista en desarrollo y puedo ayudarte a alcanzar tus objetivos de manera eficiente.',
            'Hola! Tu proyecto me parece muy interesante. Tengo la experiencia necesaria para completarlo exitosamente.'
        ];

        return $contents[array_rand($contents)];
    }
} 