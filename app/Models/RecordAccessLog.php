<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One recorded look at a patient's record.
 *
 * SC-3 in WELLCARE-COMPLIANCE-PLAN.md. Written through
 * App\Concerns\LogsRecordAccess, never by hand — the concern is what guarantees
 * that every call site captures the same fields, and a second way of writing
 * these rows is a second way of forgetting one.
 *
 * Deliberately NOT using RecordsActivity: auditing the audit log is circular,
 * and the table is append-only anyway.
 *
 * Deliberately NOT using SoftDeletes either, for a subtler reason — a
 * soft-deletable audit row invites a "tidy up" feature, and an access log you
 * can tidy is not evidence. Nothing in this application deletes from this table.
 *
 * @property int $id
 * @property int|null $actor_id
 * @property string|null $actor_role
 * @property int|null $patient_id
 * @property string|null $subject_type
 * @property int|null $subject_id
 * @property string $action
 */
class RecordAccessLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'record_access_log';

    /**
     * Every write goes through LogsRecordAccess, which passes a fully-built
     * array. Mass assignment is safe here because none of these columns is ever
     * populated from request input.
     */
    protected $fillable = [
        'actor_id',
        'actor_role',
        'patient_id',
        'subject_type',
        'subject_id',
        'action',
        'had_care_relationship',
        'route',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'had_care_relationship' => 'boolean',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * Access by someone other than the account holder themselves.
     *
     * This is the scope behind the patient-facing "who accessed your records"
     * list. A guarantor opening their own child's chart is not an event worth
     * showing them — they know — and including it would bury the clinic-side
     * access that the list exists to make visible.
     */
    public function scopeByStaff(Builder $query): Builder
    {
        return $query->whereNotNull('actor_role')->where('actor_role', '!=', 'user');
    }
}
