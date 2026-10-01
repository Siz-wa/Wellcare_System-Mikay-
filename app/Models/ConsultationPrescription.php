<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ConsultationPrescription extends Model
{
    use RecordsActivity;

    // SC-1(a) — deletion must be reversible. See the migration
    // add_soft_deletes_to_clinical_record_tables.
    use SoftDeletes;

    /**
     * QW-3 — this model was not audited at all, so a clinical record could be
     * created and then removed leaving no trace of either.
     *
     * `name` and `instructions` are deliberately absent. A drug name is a
     * diagnosis by inference — logging "Metformin" into an admin-readable
     * table discloses the condition as surely as the diagnosis row would.
     * The session id is enough to prove a prescription was added or removed
     * and by whom.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['session_id'];
    }

    protected $fillable = [
        'session_id',
        'name',
        'instructions',
    ];

    protected $casts = [
        // SC-5 — encrypted at rest. See the encrypt_sensitive_clinical_columns
        // migration for why these columns and not others: anything the app
        // filters on in SQL stays plaintext, because LIKE over ciphertext
        // returns nothing rather than failing, and anything audited into
        // activity_log stays plaintext too, because Spatie reads through the
        // cast and would just relocate the clear text.
        'name' => 'encrypted',
        'instructions' => 'encrypted',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(ConsultationSession::class, 'session_id');
    }
}
