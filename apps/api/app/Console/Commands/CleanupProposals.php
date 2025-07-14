<?php

namespace App\Console\Commands;

use App\Models\UserProposal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupProposals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'proposals:cleanup 
                            {--days=30 : Días para considerar propuestas como antiguas}
                            {--dry-run : Solo mostrar qué se eliminaría sin ejecutar}
                            {--duplicates : Eliminar propuestas duplicadas}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Limpia propuestas antiguas y duplicadas';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = $this->option('days');
        $dryRun = $this->option('dry-run');
        $duplicates = $this->option('duplicates');

        $this->info("Iniciando limpieza de propuestas...");
        $this->info("Modo dry-run: " . ($dryRun ? 'SÍ' : 'NO'));

        $totalDeleted = 0;

        // Limpiar propuestas antiguas
        if ($days > 0) {
            $oldProposals = UserProposal::where('proposal_sent_at', '<', now()->subDays($days))
                ->where('status', 'sent');

            $count = $oldProposals->count();

            if ($count > 0) {
                $this->warn("Encontradas {$count} propuestas antiguas (más de {$days} días)");

                if (!$dryRun) {
                    $deleted = $oldProposals->delete();
                    $totalDeleted += $deleted;
                    $this->info("Eliminadas {$deleted} propuestas antiguas");
                } else {
                    $this->info("Se eliminarían {$count} propuestas antiguas");
                }
            } else {
                $this->info("No se encontraron propuestas antiguas");
            }
        }

        // Limpiar propuestas duplicadas
        if ($duplicates) {
            $duplicateCount = $this->removeDuplicateProposals($dryRun);
            $totalDeleted += $duplicateCount;
        }

        // Mostrar estadísticas finales
        $this->info("Limpieza completada. Total eliminadas: {$totalDeleted}");

        Log::info('Limpieza de propuestas completada', [
            'days' => $days,
            'dry_run' => $dryRun,
            'duplicates' => $duplicates,
            'total_deleted' => $totalDeleted
        ]);
    }

    /**
     * Elimina propuestas duplicadas manteniendo la más reciente
     */
    private function removeDuplicateProposals(bool $dryRun): int
    {
        $duplicates = UserProposal::select('user_id', 'project_id', 'project_platform')
            ->groupBy('user_id', 'project_id', 'project_platform')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $totalDeleted = 0;

        foreach ($duplicates as $duplicate) {
            $proposals = UserProposal::where('user_id', $duplicate->user_id)
                ->where('project_id', $duplicate->project_id)
                ->where('project_platform', $duplicate->project_platform)
                ->orderBy('proposal_sent_at', 'desc')
                ->get();

            // Mantener la más reciente, eliminar las demás
            $toDelete = $proposals->skip(1);
            $count = $toDelete->count();

            if ($count > 0) {
                $this->warn("Encontradas {$count} propuestas duplicadas para usuario {$duplicate->user_id}, proyecto {$duplicate->project_id}");

                if (!$dryRun) {
                    $deleted = $toDelete->delete();
                    $totalDeleted += $deleted;
                    $this->info("Eliminadas {$deleted} propuestas duplicadas");
                } else {
                    $this->info("Se eliminarían {$count} propuestas duplicadas");
                }
            }
        }

        return $totalDeleted;
    }
} 