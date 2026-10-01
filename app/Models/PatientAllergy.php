<?php

namespace App\Models;

use App\Concerns\ProtectsRetainedRecords;
use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class PatientAllergy extends Model
{
    use ProtectsRetainedRecords;
    use RecordsActivity;

    // SC-1(a) — deletion must be reversible. See the migration
    // add_soft_deletes_to_clinical_record_tables.
    use SoftDeletes;

    /**
     * QW-3 — this model was not audited at all, so a clinical record could be
     * created and then removed leaving no trace of either.
     *
     * `allergen`, `reaction` and `notes` are deliberately absent. They are the
     * health data on this row, and `activity_log.properties` is rendered in
     * full by the admin activity screen — an administrator is a records
     * clerk in this system, not a clinician. `severity` is kept because
     * "someone downgraded a severe allergy to mild" is precisely the change
     * an audit trail exists to catch, and it names no substance.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['patient_id', 'user_id', 'recorded_by', 'severity'];
    }

    protected $fillable = [
        'patient_id',       // ← added: the actual patient record FK
        'user_id',          // kept for backcompat (guarantor)
        'recorded_by',
        'allergen',
        'severity',
        'reaction',
        'notes',
    ];

    protected $casts = [
        // SC-5 — encrypted at rest. See the encrypt_sensitive_clinical_columns
        // migration for why these columns and not others: anything the app
        // filters on in SQL stays plaintext, because LIKE over ciphertext
        // returns nothing rather than failing, and anything audited into
        // activity_log stays plaintext too, because Spatie reads through the
        // cast and would just relocate the clear text.
        'allergen' => 'encrypted',
        'reaction' => 'encrypted',
        'notes' => 'encrypted',
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

    /**
     * Anchored to the patient, not to this row.
     *
     * A diagnosis written in 2027 for someone last seen in 2040 is retained
     * until 2055, because the obligation attaches to the record as a whole
     * rather than to each entry in it. Anchoring per-row would let the oldest
     * and most clinically interesting entries age out from under an active
     * chart, which is the opposite of what a retention floor is for.
     *
     * `withTrashed()` because a soft-deleted patient still carries the
     * obligation — archiving is not erasure, and the child rows must not become
     * purgeable simply because the parent was hidden.
     */
    protected function retentionAnchorDate(): ?Carbon
    {
        return $this->patient()->withTrashed()->first()?->retentionClockStartsAt();
    }

    /**
     * Clinical content, governed by the chart's period rather than the
     * laboratory schedule — an allergy or a diagnosis is part of the medical
     * record whatever prompted it to be written.
     */
    protected function retentionPeriodKey(): string
    {
        return 'clinical_record';
    }
}
