<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProposal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'project_id',
        'project_platform',
        'proposal_sent_at',
        'proposal_content',
        'status',
    ];

    protected $casts = [
        'proposal_sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id')
                    ->where('platform', $this->project_platform);
    }
}
