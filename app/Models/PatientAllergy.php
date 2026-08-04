<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAllergy extends Model
{
    protected $fillable = [
        'patient_id',       // ← added: the actual patient record FK
        'user_id',          // kept for backcompat (guarantor)
        'recorded_by',
        'allergen',
        'severity',
        'reaction',
        'notes',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
