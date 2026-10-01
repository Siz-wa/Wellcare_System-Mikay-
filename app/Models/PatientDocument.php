<?php

namespace App\Models;

use App\Concerns\ProtectsRetainedRecords;
use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class PatientDocument extends Model
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
     * `title` and `file_name` are deliberately absent: a filename like
     * `hiv-panel-2026.pdf` is a diagnosis written on the outside of the
     * envelope. `type` (lab/imaging/referral/…) carries the audit value
     * without the disclosure. `file_path` is never logged anywhere.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['patient_id', 'user_id', 'uploaded_by', 'type'];
    }

    protected $fillable = [
        'patient_id',       // ← added: the actual patient record FK
        'user_id',          // kept for backcompat (guarantor)
        'appointment_id',
        'uploaded_by',
        'title',
        'type',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'is_encrypted',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'is_encrypted' => 'boolean',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size;
        if ($bytes < 1024) {
            return "{$bytes} B";
        }
        if ($bytes < 1048576) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / 1048576, 1).' MB';
    }

    /*
     * There was a `getDownloadUrlAttribute()` here that returned
     * `Storage::disk('local')->url($this->file_path)`. It was dead — nothing
     * read it, `$appends` is empty so it was never serialized, and every screen
     * builds its download link with `route(...)` instead.
     *
     * It is deleted rather than left alone because it was a live trap. It
     * resolved through the `storage.local` serve route (now switched off in
     * config/filesystems.php), so the string it produced both leaked the
     * internal storage path and bypassed the per-document authorization the
     * controllers perform. Anyone who found it and used it would have been
     * handing out unauthenticated links to patient documents.
     */

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
     * The one model where the document's own type decides the period.
     *
     * DOH AO 2022-0007 governs clinical-laboratory paperwork specifically, and
     * reports a much shorter period for it than the chart carries. A `lab`
     * document is therefore on the laboratory schedule; everything else here —
     * imaging, a referral letter, a prescription, a general report — is part of
     * the medical record and keeps the chart's period.
     *
     * `other` deliberately lands on the chart period rather than the shorter
     * laboratory one: an unclassified upload should be over-retained, not
     * purged early on an assumption about what it contained.
     */
    protected function retentionPeriodKey(): string
    {
        return $this->type === 'lab'
            ? 'lab_document'
            : 'clinical_record';
    }
}
