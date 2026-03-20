<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientMedical extends Model
{
     protected $table = 'patient_medical';
    protected $fillable = [
        'profile_id',
        'height',
        'weight',
        'blood_pressure',
        'hmo',
        'payment_method',
        'preferred_doctor',
    ];

    protected function casts(): array
    {
        return [
            'height' => 'decimal:2',
            'weight' => 'decimal:2',
        ];
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function profile(): BelongsTo
    {
        return $this->belongsTo(PatientProfile::class, 'profile_id');
    }
}