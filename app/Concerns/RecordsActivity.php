<?php

namespace App\Concerns;

use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Audit trail for Figure 3's "Activity Log" oval and Figure 4's "Monitor
 * System" flow.
 *
 * Wraps Spatie's LogsActivity with one shared configuration so every audited
 * model behaves identically. Each model declares WHAT it logs by defining
 * `$activityLogAttributes`; this trait decides HOW.
 *
 * The single rule that matters: **attributes are named explicitly, never
 * inferred.** Spatie's logAll()/logFillable() would, on User, copy `password`,
 * `two_factor_secret`, `two_factor_recovery_codes` and `remember_token` into
 * `activity_log.properties` as readable JSON — the exact fields User::$hidden
 * exists to keep out of serialized output, written to a table the admin UI
 * renders. An audit log that leaks credentials is worse than no audit log.
 *
 * dontSubmitEmptyLogs() keeps the table meaningful: a save() that changed none
 * of the watched attributes writes nothing, so the log reads as a list of real
 * changes rather than a list of requests.
 */
trait RecordsActivity
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->activityLogAttributes())
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName($this->activityLogName())
            ->setDescriptionForEvent(
                fn (string $eventName) => class_basename($this)." was {$eventName}"
            );
    }

    /**
     * The attributes this model records.
     *
     * Every using model MUST override this. The empty default is deliberate:
     * a model that forgets to declare its attributes logs nothing at all,
     * which is a visible gap in the admin UI. The alternative default —
     * "log everything" — fails silently and leaks credentials.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return [];
    }

    protected function activityLogName(): string
    {
        return strtolower(class_basename($this));
    }
}
