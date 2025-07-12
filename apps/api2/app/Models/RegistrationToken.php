<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RegistrationToken extends Model
{
    use HasFactory;

    protected $table = 'registration_tokens';

    protected $fillable = [
        'token',
        'created_by_admin',
        'is_used',
        'used_at',
        'registered_user_id',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function createdByAdmin()
    {
        return $this->belongsTo(User::class, 'created_by_admin');
    }

    public function registeredUser()
    {
        return $this->belongsTo(User::class, 'registered_user_id');
    }

    public function scopeUnused($query)
    {
        return $query->where('is_used', false);
    }

    public function scopeUsed($query)
    {
        return $query->where('is_used', true);
    }

    public static function generateToken($adminId)
    {
        return self::create([
            'token' => bin2hex(random_bytes(32)),
            'created_by_admin' => $adminId,
            'is_used' => false,
        ]);
    }

    public function markAsUsed($userId)
    {
        $this->update([
            'is_used' => true,
            'used_at' => now(),
            'registered_user_id' => $userId,
        ]);
    }

    public function isValid()
    {
        return !$this->is_used;
    }

    public static function getTokenStats()
    {
        return [
            'total' => self::count(),
            'used' => self::used()->count(),
            'unused' => self::unused()->count(),
            'created_this_week' => self::where('created_at', '>=', now()->subWeek())->count(),
        ];
    }

    public static function cleanupOldTokens($days = 30)
    {
        return self::unused()
            ->where('created_at', '<=', now()->subDays($days))
            ->delete();
    }

    public static function findByToken($token)
    {
        return self::where('token', $token)->first();
    }

    public static function isValidToken($token)
    {
        $tokenRecord = self::findByToken($token);
        return $tokenRecord && $tokenRecord->isValid();
    }
}