<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * DoctorSeeder wrote `day_of_week` in ISO-8601 (1 = Mon … 7 = Sun), but
 * BookingService has always queried it in the MySQL DAYOFWEEK convention
 * (1 = Sun … 7 = Sat). Every recurring block was therefore off by one:
 *
 *   - a block meant for Monday surfaced on Sunday
 *   - each weekday showed the NEXT day's hours
 *   - Saturday was never available (lookup asks for 7; nothing stored 7)
 *
 * The seeder now converts on write via AvailabilityBlock::isoToStoredDay().
 * This migration corrects rows already in the database.
 *
 * Only recurring blocks are touched — specific-date blocks (including the
 * Out of Office blocks created by BookingService::invalidateOutOfOffice(),
 * which store day_of_week = null) are left alone.
 *
 * NOTE: this assumes existing rows came from DoctorSeeder. WellcareSeeder
 * already wrote the correct convention, but it is not registered in
 * DatabaseSeeder — if it was ever run manually, verify before migrating.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ISO -> MySQL DAYOFWEEK: (iso % 7) + 1
        DB::statement('
            UPDATE availability_blocks
            SET day_of_week = (day_of_week % 7) + 1
            WHERE day_of_week IS NOT NULL
        ');
    }

    public function down(): void
    {
        // MySQL DAYOFWEEK -> ISO: ((stored + 5) % 7) + 1
        DB::statement('
            UPDATE availability_blocks
            SET day_of_week = ((day_of_week + 5) % 7) + 1
            WHERE day_of_week IS NOT NULL
        ');
    }
};
