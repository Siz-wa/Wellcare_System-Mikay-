<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientMedical extends Model
{
    /**
     * SC-1(a). Deleting a clinical record must be reversible — see the
     * migration add_soft_deletes_to_clinical_record_tables.
     */
    use SoftDeletes;

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
