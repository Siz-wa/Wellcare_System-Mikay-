<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single measured value inside a lab test — one row per line in the results
 * table the doctor sees. The shape matches the `Parameter` interface in
 * resources/js/pages/doctor/lab-reviews/components/type.ts.
 */
class LabResultParameter extends Model
{
    use HasFactory;

    protected $fillable = [
        'lab_test_result_id',
        'name',
        'result',
        'unit',
        'ref_range',
        'status',
        'sort_order',
    ];

    protected $casts = [
        // SC-5 — encrypted at rest. See the encrypt_sensitive_clinical_columns
        // migration for why these columns and not others: anything the app
        // filters on in SQL stays plaintext, because LIKE over ciphertext
        // returns nothing rather than failing, and anything audited into
        // activity_log stays plaintext too, because Spatie reads through the
        // cast and would just relocate the clear text.
        'result' => 'encrypted',
        'sort_order' => 'integer',
    ];

    public function labTestResult(): BelongsTo
    {
        return $this->belongsTo(LabTestResult::class);
    }
}
