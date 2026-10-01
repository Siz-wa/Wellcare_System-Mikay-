<?php

namespace App\Concerns;

use App\Exceptions\RetentionPeriodNotElapsedException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * SC-1(d) — the enforcement half of the retention floor.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.6, RET-5, and ND-6 for where the period comes
 * from.
 *
 * The earlier retention work made deletion *reversible* (soft deletes) and
 * stopped a closed account *cascading* into the record (the foreign-key
 * migration). Neither stops `forceDelete()`, which is one method call and walks
 * past both. This is the part that says no.
 *
 * ## How the clock works
 *
 * The period is counted from the patient's **last encounter**, not from when
 * the row was written — so an active patient's record never ages into being
 * purgeable while they are still being seen, and every new appointment pushes
 * the date out. A patient with no recorded encounter at all has no anchor, and
 * an unknown anchor is treated as "not elapsed": the safe reading of a missing
 * date is that the clock has not started, never that it has run out.
 *
 * ## Why this hooks the event rather than overriding the method
 *
 * The obvious implementation — `public function forceDelete()` calling
 * `parent::forceDelete()` — does not compile. `SoftDeletes` is a trait, not a
 * parent, so there is no `parent::` to call, and declaring the same method name
 * in two traits on one class is a fatal collision that every using model would
 * have to resolve by hand with an `insteadof`/`as` block.
 *
 * Hooking `forceDeleting` avoids all of that and is strictly better placed:
 * the event fires inside `SoftDeletes::forceDelete()` itself, so the guard
 * holds no matter who calls it — a controller, a queued job, a tinker session,
 * a future cascade. A rule enforced at one call site protects that call site
 * only.
 *
 * The listener throws rather than returning false. Returning false would abort
 * the delete *silently*, and code that believed it could erase a medical record
 * should not quietly carry on believing it succeeded.
 */
trait ProtectsRetainedRecords
{
    /**
     * Set only by forceDeleteIgnoringRetention(), for the one supported bypass.
     */
    protected bool $retentionOverridden = false;

    public static function bootProtectsRetainedRecords(): void
    {
        static::forceDeleting(function (Model $model): void {
            /** @var static $model */
            if ($model->retentionOverridden || $model->retentionPeriodHasElapsed()) {
                return;
            }

            throw RetentionPeriodNotElapsedException::for(
                class_basename($model),
                $model->getKey(),
                $model->retentionExpiresAt()?->toDateString(),
            );
        });
    }

    /**
     * Permanently remove this row, bypassing the retention floor.
     *
     * Named to be conspicuous in a diff and in a grep, and used by exactly one
     * caller: `wellcare:records:purge`, which re-checks the same condition and
     * needs two independent locks off before it runs. If this appears in a
     * controller, that is a bug.
     *
     * @return bool|null
     */
    public function forceDeleteIgnoringRetention()
    {
        $this->retentionOverridden = true;

        try {
            return $this->forceDelete();
        } finally {
            // Restored even on failure: this model instance may be reused, and
            // an override that outlived its one call would silently disarm the
            // floor for everything that touched the object afterwards.
            $this->retentionOverridden = false;
        }
    }

    public function retentionPeriodHasElapsed(): bool
    {
        $expiry = $this->retentionExpiresAt();

        // No anchor means the clock has not started, not that it has finished.
        return $expiry !== null && $expiry->isPast();
    }

    public function retentionExpiresAt(): ?Carbon
    {
        $anchor = $this->retentionAnchorDate();

        return $anchor?->copy()->addYears($this->retentionPeriodYears());
    }

    /**
     * The date this record's retention clock starts, readable from outside.
     *
     * Child rows (allergies, diagnoses, documents) inherit their parent
     * patient's clock. They used to recover it by taking the patient's expiry
     * date and subtracting the retention period — which was correct only while
     * every record shared one global period. Now that a lab document and a
     * diagnosis can be governed by different periods, subtracting the child's
     * period from the parent's expiry lands on the wrong date.
     *
     * Exposing the anchor removes the arithmetic rather than fixing it.
     */
    public function retentionClockStartsAt(): ?Carbon
    {
        return $this->retentionAnchorDate();
    }

    /**
     * Which entry in `config('retention.periods')` governs this record.
     *
     * The default is deliberately NOT the clinical record. It is
     * `retention.default_period`, which config sets to the longest period in
     * the table — so a model that forgets to declare its class is over-retained
     * rather than purged on someone else's shorter schedule. Same fail-closed
     * direction as the null anchor below: the failure mode of forgetting must
     * be a record kept too long, never one destroyed too early.
     */
    protected function retentionPeriodKey(): string
    {
        return (string) config('retention.default_period');
    }

    /**
     * The period in whole years, resolved through the config table.
     *
     * An unrecognised key falls back to the default period rather than to
     * zero — `config()` returning null for a typo'd key would otherwise mean
     * `addYears(0)`, making every row of that class instantly purgeable. That
     * is the single most dangerous failure this file can have, so it is closed
     * here explicitly rather than left to a cast.
     */
    protected function retentionPeriodYears(): int
    {
        $periods = (array) config('retention.periods', []);
        $key = $this->retentionPeriodKey();

        $years = $periods[$key]
            ?? $periods[(string) config('retention.default_period')]
            ?? null;

        // Still nothing means the config table itself is missing or malformed.
        // Refuse to compute an expiry at all rather than invent one.
        if (! is_numeric($years) || (int) $years < 1) {
            throw new \RuntimeException(
                "Retention period '{$key}' is not configured. Refusing to compute a record expiry date."
            );
        }

        return (int) $years;
    }

    /**
     * The date the retention clock starts for this row.
     *
     * Every using model overrides this. The default returns null — "no anchor",
     * which the guard reads as "never purgeable" — so a model that forgets to
     * implement it fails closed rather than open. That direction is the whole
     * design: the failure mode of a missing implementation must be a record
     * kept too long, never one destroyed too early.
     */
    protected function retentionAnchorDate(): ?Carbon
    {
        return null;
    }
}
