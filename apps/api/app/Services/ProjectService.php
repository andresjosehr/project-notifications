<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectService
{
    public function getAllProjects($platform = null, $options = [])
    {
        $query = Project::query();
        
        if ($platform) {
            $query->byPlatform($platform);
        }
        
        if (isset($options['limit'])) {
            $query->limit($options['limit']);
        }
        
        return $query->recent()->get();
    }

    public function getProjectById($id, $platform = null)
    {
        $query = Project::where('id', $id);
        
        if ($platform) {
            $query->where('platform', $platform);
        }
        
        return $query->first();
    }

    public function searchProjects($searchTerm, $platform = null, $options = [])
    {
        $query = Project::search($searchTerm);
        
        if ($platform) {
            $query->byPlatform($platform);
        }
        
        if (isset($options['limit'])) {
            $query->limit($options['limit']);
        }
        
        return $query->recent()->get();
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
        try {
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
        } catch (\Exception $e) {
            Log::error('Health check failed', ['error' => $e->getMessage()]);
            
            return [
                'database' => [
                    'status' => 'unhealthy',
                    'error' => $e->getMessage(),
                ],
                'overall' => [
                    'status' => 'unhealthy',
                    'healthy' => false,
                ]
            ];
        }
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