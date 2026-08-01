<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One ordered laboratory test and its workflow state.
 *
 * The lifecycle mirrors the six-step flow already documented in
 * resources/js/pages/doctor/dashboard-data.ts:
 *
 *   requested → (nurse encodes results) → recorded → (doctor validates) → reviewed
 */
class LabTestResult extends Model
{
    use HasFactory;
    use RecordsActivity;
    use SoftDeletes;

    /**
     * Audited fields — the doctor→nurse→doctor chain of custody. Deliberately
     * excludes `notes` and `interpretation`: those are clinical findings, and
     * copying them into a table the admin UI renders would put diagnostic
     * content in front of a non-clinical role.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['status', 'severity', 'requested_by', 'recorded_by', 'reviewed_by', 'test_name'];
    }

    protected $fillable = [
        'patient_id',       // the person seen — never drop this, see CLAUDE.md
        'user_id',          // guarantor account (backcompat with patient_* tables)
        'appointment_id',
        'requested_by',
        'recorded_by',
        'reviewed_by',
        'test_name',
        'status',
        'severity',
        'notes',
        'interpretation',
        'requested_at',
        'recorded_at',
        'reviewed_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'recorded_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /** The booking account, kept to match the other patient record tables */
    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function parameters(): HasMany
    {
        return $this->hasMany(LabResultParameter::class)->orderBy('sort_order');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Tests the nurse still has to encode */
    public function scopeAwaitingResults(Builder $query): Builder
    {
        return $query->where('status', 'requested');
    }

    /** Tests the doctor still has to validate */
    public function scopeAwaitingReview(Builder $query): Builder
    {
        return $query->where('status', 'recorded');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Collapse workflow status and clinical severity into the single field the
     * doctor/lab-reviews UI expects (`pending | reviewed | critical | normal`).
     *
     * The UI deliberately mixes both concepts; the database keeps them apart so
     * that "a critical result which has been reviewed" stays expressible.
     */
    public function getDisplayStatusAttribute(): string
    {
        return match (true) {
            $this->status === 'reviewed' && $this->severity === 'normal' => 'normal',
            $this->status === 'reviewed' => 'reviewed',
            $this->severity === 'critical' => 'critical',
            default => 'pending',
        };
    }
}
