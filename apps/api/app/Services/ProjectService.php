<?php

namespace App\Services;

use App\Exceptions\GenericException;
use App\Models\Project;
use App\Models\UserProposal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class ProjectService
{
    public function getAllProjects($platform = null, $options = [])
    {
        $userId = Auth::id();
        $query = Project::query();
        
        if ($platform) {
            $query->byPlatform($platform);
        }
        
        if (isset($options['limit'])) {
            $query->limit($options['limit']);
        }
        
        $projects = $query->recent()->get();
        
        // Si hay un usuario autenticado, agregar información de propuestas
        if ($userId) {
            $this->addProposalInfoToProjects($projects, $userId);
        }
        
        return $projects;
    }

    /**
     * Agrega información de propuestas a los proyectos
     */
    private function addProposalInfoToProjects($projects, $userId)
    {
        // Obtener todas las propuestas del usuario en una sola consulta
        $userProposals = UserProposal::where('user_id', $userId)
            ->select('project_id', 'project_platform', 'proposal_sent_at', 'proposal_content', 'status')
            ->get()
            ->keyBy(function($proposal) {
                return $proposal->project_id . '_' . $proposal->project_platform;
            });

        // Agregar información de propuestas a cada proyecto
        foreach ($projects as $project) {
            $proposalKey = $project->id . '_' . $project->platform;
            $proposal = $userProposals->get($proposalKey);

            if ($proposal) {
                $project->proposal_sent = true;
                $project->proposal_sent_at = $proposal->proposal_sent_at;
                $project->proposal_content = $proposal->proposal_content;
                $project->proposal_status = $proposal->status;
                $project->can_send_proposal = false;
            } else {
                $project->proposal_sent = false;
                $project->can_send_proposal = true;
            }
        }
    }

    public function getProjectById($id, $platform = null)
    {
        $userId = Auth::id();
        $query = Project::where('id', $id);
        
        if ($platform) {
            $query->where('platform', $platform);
        }
        
        $project = $query->first();
        
        // Si hay un usuario autenticado y se encontró el proyecto, agregar información de propuestas
        if ($userId && $project) {
            $this->addProposalInfoToProjects(collect([$project]), $userId);
        }
        
        return $project;
    }

    public function searchProjects($searchTerm, $platform = null, $options = [])
    {
        $userId = Auth::id();
        $query = Project::search($searchTerm);
        
        if ($platform) {
            $query->byPlatform($platform);
        }
        
        if (isset($options['limit'])) {
            $query->limit($options['limit']);
        }
        
        $projects = $query->recent()->get();
        
        // Si hay un usuario autenticado, agregar información de propuestas
        if ($userId) {
            $this->addProposalInfoToProjects($projects, $userId);
        }
        
        return $projects;
    }

    public function getProjectStats($platform = null)
    {
        $query = Project::query();
        
        if ($platform) {
            $query->byPlatform($platform);
        }
        
        $stats = [
            'total_projects' => $query->count(),
            'projects_today' => $query->whereDate('created_at', today())->count(),
            'projects_this_week' => $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'projects_this_month' => $query->whereMonth('created_at', now()->month)->count(),
        ];
        
        if ($platform) {
            $stats['platform'] = $platform;
        } else {
            $stats['by_platform'] = Project::select('platform', DB::raw('count(*) as count'))
                ->groupBy('platform')
                ->pluck('count', 'platform')
                ->toArray();
        }
        
        return $stats;
    }

    public function createProject(array $data)
    {
        return Project::create($data);
    }

    public function createMany(array $projects, $platform)
    {
        $projectsData = array_map(function($project) use ($platform) {
            return array_merge($project, [
                'platform' => $platform,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }, $projects);
        
        Project::insert($projectsData);
        return count($projectsData);
    }

    public function findByLinks(array $links, $platform)
    {
        return Project::whereIn('link', $links)
            ->where('platform', $platform)
            ->get();
    }

    public function healthCheck()
    {
        $totalProjects = Project::count();
        $recentProjects = Project::where('created_at', '>=', now()->subHour())->count();
        
        return [
            'database' => [
                'status' => 'healthy',
                'total_projects' => $totalProjects,
                'recent_projects' => $recentProjects,
            ],
            'overall' => [
                'status' => 'healthy',
                'healthy' => true,
            ]
        ];
    }

    public function cleanup($options = [])
    {
        $results = [];
        
        // Remove old projects
        if (isset($options['days']) && $options['days'] > 0) {
            $deleted = Project::where('created_at', '<', now()->subDays($options['days']))->delete();
            $results['deleted_old_projects'] = $deleted;
        }
        
        // Remove duplicates
        if (isset($options['remove_duplicates']) && $options['remove_duplicates']) {
            $duplicates = Project::select('link', 'platform', DB::raw('MIN(id) as min_id'))
                ->groupBy('link', 'platform')
                ->havingRaw('COUNT(*) > 1')
                ->get();
            
            $deletedDuplicates = 0;
            foreach ($duplicates as $duplicate) {
                $deletedDuplicates += Project::where('link', $duplicate->link)
                    ->where('platform', $duplicate->platform)
                    ->where('id', '>', $duplicate->min_id)
                    ->delete();
            }
            
            $results['deleted_duplicates'] = $deletedDuplicates;
        }
        
        return $results;
    }
}