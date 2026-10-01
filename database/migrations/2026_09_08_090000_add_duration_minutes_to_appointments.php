<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A patient may now book more than once in a day, so an appointment has to know
 * how long it lasts.
 *
 * Until now nothing did: `appointment_time` is a bare "9:00 AM" string and the
 * length of a visit lived only in `availability_blocks.slot_duration_minutes`.
 * That was enough while the rule was "one appointment per patient per day" —
 * two bookings could never need comparing. Allowing several means asking
 * whether 9:00 with Dr. Reyes and 9:15 with Dr. Cruz collide, and that question
 * has no answer without a duration on each row.
 *
 * The value is SNAPSHOTTED at booking time rather than looked up through the
 * doctor's schedule, for the same reason `appointments` denormalises the
 * patient's name and age: the schedule is editable. A doctor switching from
 * 30-minute to 20-minute slots must not silently reinterpret the length of
 * visits already booked, and deleting a block must not leave existing rows with
 * no derivable duration at all.
 *
 * A plain `Schema::table()` add is safe here. Unlike `status`, this column is
 * not referenced by the `active_slot_key` STORED generated column that
 * 2026_07_19_120100 hangs a unique index off, so nothing has to be rebuilt.
 */
return new class extends Migration
{
    /** What a visit lasts when nothing better is known. Matches the availability_blocks default. */
    private const FALLBACK_MINUTES = 30;

    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedSmallInteger('duration_minutes')
                ->default(self::FALLBACK_MINUTES)
                ->after('appointment_time');
        });

        $this->backfillFromAvailabilityBlocks();
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('duration_minutes');
        });
    }

    /**
     * Give existing rows the slot length their doctor actually offers.
     *
     * The column default of 30 already covers every row seeded so far, but it
     * would be wrong for any doctor running a different slot length — and those
     * rows are exactly the ones an overlap check would misjudge. One UPDATE per
     * distinct duration keeps this to a handful of statements whatever the row
     * count.
     */
    private function backfillFromAvailabilityBlocks(): void
    {
        $durationsByDoctor = DB::table('availability_blocks')
            ->whereNull('deleted_at')
            ->where('is_available', true)
            ->select('doctor_id', 'slot_duration_minutes')
            ->distinct()
            ->get()
            // A doctor with mixed block lengths gets the shortest: it is the
            // conservative read, and only affects how strictly overlaps are
            // judged on rows booked before this column existed.
            ->groupBy('doctor_id')
            ->map(fn ($rows) => (int) $rows->min('slot_duration_minutes'));

        foreach ($durationsByDoctor->groupBy(fn ($minutes) => $minutes) as $minutes => $doctors) {
            if ((int) $minutes === self::FALLBACK_MINUTES) {
                continue;
            }

            DB::table('appointments')
                ->whereIn('doctor_id', $doctors->keys())
                ->update(['duration_minutes' => (int) $minutes]);
        }
    }
};
