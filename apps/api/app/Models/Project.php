<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'price',
        'skills',
        'info',
        'link',
        'platform',
        'language',
        'client_name',
        'client_country',
        'client_rating',
        'payment_verified',
        'is_featured',
        'is_max_project',
        'date',
        'time_ago'
    ];

    protected $casts = [
        'payment_verified' => 'boolean',
        'is_featured' => 'boolean',
        'is_max_project' => 'boolean',
        'client_rating' => 'decimal:2',
    ];

    public function userProposals()
    {
        return $this->hasMany(UserProposal::class, 'project_id')
                    ->where('project_platform', $this->platform);
    }

    public function scopeByPlatform($query, $platform)
    {
        if ($platform) {
            return $query->where('platform', $platform);
        }
        return $query;
    }

    public function scopeRecent($query, $limit = 10)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    public function scopeSearch($query, $searchTerm)
    {
        return $query->where(function($q) use ($searchTerm) {
            $q->where('title', 'like', "%{$searchTerm}%")
              ->orWhere('description', 'like', "%{$searchTerm}%")
              ->orWhere('skills', 'like', "%{$searchTerm}%");
        });
    }
}
