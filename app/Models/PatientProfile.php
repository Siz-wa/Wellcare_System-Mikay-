<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PatientProfile extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'address',
        'company',
        'contact_number',
        'gender',
        'birthdate',
        'civil_status',
        'client_number',
        'classification',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
        ];
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function medical(): HasOne
    {
        return $this->hasOne(PatientMedical::class, 'profile_id');
    }

    // ── Auto-generate client number on creation ────────────────────────────────
    protected static function booted(): void
    {
        static::creating(function (PatientProfile $profile) {
            if (empty($profile->client_number)) {
                $profile->client_number = self::generateClientNumber();
            }
        });
    }

    private static function generateClientNumber(): string
    {
        do {
            $number = 'WC-' . date('Y') . '-' . str_pad(random_int(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (self::where('client_number', $number)->exists());

        return $number;
    }
}