<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientDiagnosis extends Model
{
    protected $fillable = [
        'patient_id',       // ← added: the actual patient record FK
        'user_id',          // kept for backcompat (guarantor)
        'appointment_id',
        'recorded_by',
        'icd_code',
        'diagnosis',
        'type',
        'status',
        'diagnosed_at',
        'notes',
    ];

    protected $casts = [
        'diagnosed_at' => 'date',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
