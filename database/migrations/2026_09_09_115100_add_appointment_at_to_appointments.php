<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The visit's start as a real point in time.
 *
 * ## The bug this fixes
 *
 * `appointment_time` is a varchar holding a DISPLAY string — "9:00 AM", written
 * by BookingService::generateSlots() via `format('g:i A')`, so no leading zero.
 * Five controllers ordered the clinic day with `orderBy('appointment_time')`,
 * which MySQL sorts lexically. Against the real data in `wellcare_db` that
 * returns:
 *
 *     1:00 PM, 1:30 PM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM,
 *     2:00 PM … 4:30 PM, 8:00 AM, 8:30 AM, 9:00 AM, 9:30 AM
 *
 * The afternoon sorts first and 8 AM lands near the end. The affected screens
 * included the doctor's own appointment list, the consultation queue, the HR
 * and nurse dashboards, and the nurse's appointment monitor.
 *
 * This was a KNOWN bug: PatientDashboardController carried a comment describing
 * it exactly and sorted in PHP to dodge it. The workaround reached one file and
 * not the other five. `AppointmentFactory` happens to write "09:00 AM" — padded,
 * unlike production — so the one format that sorts correctly by accident is the
 * one every test saw, which is why the suite never caught this.
 *
 * ## Why an additive column rather than converting the existing one
 *
 * Converting `appointment_time` to a TIME column would touch the writer, both
 * seeders, the factory, six controllers, every Inertia prop that renders a time
 * and the tests that assert on the string, all in one commit. This adds a
 * column beside it instead: SQL gets something sortable, the display string
 * stays exactly as it is, and nothing that reads `appointment_time` today has
 * to change. The string can be retired later, on its own schedule.
 *
 * ## Nullable, deliberately
 *
 * Backfilled below for every existing row, and Appointment::booted() keeps it
 * populated on every future write. It stays nullable anyway so that a row whose
 * time string somehow fails to parse lands as NULL rather than as a silently
 * wrong instant — a missing sort key is recoverable, a plausible-looking wrong
 * one is not.
 *
 * ## The index
 *
 * `(appointment_at, status)` in that order: every consumer sorts or windows on
 * the instant first and then filters status. It is also the index the reminder
 * sweep in Phase 2 will use to find "appointments due in the next N hours",
 * which is the other half of why this column exists.
 */
return new class extends Migration
{
    /**
     * MariaDB/MySQL format for the stored display string.
     *
     * `%l` is the 1–12 hour and tolerates both "9:00 AM" (production, from
     * `format('g:i A')`) and "09:00 AM" (the factory's padded form). Verified
     * against both, plus the two cases that catch naive 12-hour parsing:
     * "12:30 PM" → 12:30 and "12:15 AM" → 00:15.
     */
    private const PARSE_FORMAT = '%Y-%m-%d %l:%i %p';

    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dateTime('appointment_at')
                ->nullable()
                ->after('appointment_time');

            $table->index(['appointment_at', 'status']);
        });

        $this->backfill();
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['appointment_at', 'status']);
            $table->dropColumn('appointment_at');
        });
    }

    /**
     * Recombine the date column and the display string into one instant.
     *
     * Guarded on `appointment_at IS NULL` so re-running is harmless, and on the
     * two source columns being present so a malformed row is skipped rather
     * than written as NULL-concatenated garbage.
     */
    private function backfill(): void
    {
        DB::table('appointments')
            ->whereNull('appointment_at')
            ->whereNotNull('appointment_date')
            ->whereNotNull('appointment_time')
            ->update([
                'appointment_at' => DB::raw(sprintf(
                    "STR_TO_DATE(CONCAT(appointment_date, ' ', appointment_time), '%s')",
                    self::PARSE_FORMAT
                )),
            ]);
    }
};
