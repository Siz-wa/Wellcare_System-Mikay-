<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when something tries to permanently destroy a clinical record whose
 * retention period has not run out.
 *
 * ND-6 / RET-5 in WELLCARE-COMPLIANCE-PLAN.md. This is the floor: soft deletes
 * make a removal reversible, but `forceDelete()` walks straight past them, and
 * a retention obligation that any caller can defeat with one method call is not
 * an obligation. Every clinical model routes `forceDelete()` through
 * ProtectsRetainedRecords, which raises this instead.
 *
 * Deliberately a RuntimeException and NOT caught anywhere. There is no
 * "continue anyway" branch worth writing — code that hits this is code that
 * believed it could erase a medical record and was wrong, and it should stop
 * loudly rather than proceed.
 */
class RetentionPeriodNotElapsedException extends RuntimeException
{
    public static function for(string $model, int|string $key, ?string $until): self
    {
        $when = $until ?? 'an as-yet-undetermined date (the patient has no recorded encounter)';

        return new self(
            "Refusing to permanently delete {$model}#{$key}: it is inside the medical-record "
            ."retention period, which runs until {$when}. Soft-delete it instead, or — if the "
            .'period really has lapsed — use the wellcare:records:purge command, which is the '
            .'only supported path and keeps a record of what it removed.'
        );
    }
}
