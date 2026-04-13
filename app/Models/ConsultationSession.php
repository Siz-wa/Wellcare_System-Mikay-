<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsultationSession extends Model
{
    protected $fillable = [
        'appointment_id',
        'doctor_id',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'blood_pressure',
        'heart_rate',
        'temperature',
        'oxygen_saturation',
        'weight',
        'height',
        'status',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(ConsultationPrescription::class, 'session_id');
    }

    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }
}