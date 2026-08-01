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
        'sort_order' => 'integer',
    ];

    public function labTestResult(): BelongsTo
    {
        return $this->belongsTo(LabTestResult::class);
    }
}
