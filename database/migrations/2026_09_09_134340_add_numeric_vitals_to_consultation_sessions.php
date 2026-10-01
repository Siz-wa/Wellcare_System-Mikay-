<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Task 3.1 — vitals as measurements rather than captions.
 *
 * ## What was wrong
 *
 * All six vitals were varchars holding display text, units and all:
 * `"119/83"`, `"70 bpm"`, `"36.7 C"`, `"96%"`, `"68 kg"`, `"175 cm"`. Storable
 * and printable, and computable on in no way at all.
 *
 * That single decision blocks the most-used view in any clinical record: a
 * blood-pressure trend across visits, a weight or growth curve, an automatic
 * BMI, an out-of-range flag, any early-warning score. A clinician reads the
 * SHAPE of the last six readings; this schema could only ever show the last one,
 * as a string.
 *
 * Vital Signs is a core USCDI data class, and it was the one this record scored
 * "partial" on for exactly this reason.
 *
 * ## Why this was urgent rather than merely important
 *
 * Every consultation recorded before it lands adds another row that can never be
 * trended. The cost of waiting is not "the feature is late" — it is a permanent
 * hole in the historical record, and it grows daily.
 *
 * ## Additive, with the strings kept
 *
 * Same approach as `appointment_at`: new numeric columns beside the old ones,
 * both written, nothing that reads the strings forced to change today. The
 * display strings can be retired on their own schedule once every reader is
 * migrated.
 *
 * ## The backfill will not invent readings
 *
 * `CAST('abc' AS UNSIGNED)` is 0 in MySQL, and so is `CAST('' AS UNSIGNED)`. A
 * naive backfill therefore writes a heart rate of ZERO for every unparseable or
 * empty row — a clinically impossible value that looks like a real measurement.
 * Every column below is guarded on `REGEXP '^[0-9]'` so anything that does not
 * begin with a digit stays NULL. A missing reading is honest; a fabricated one
 * is not.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Guarded so the migration is re-runnable. MySQL cannot roll back DDL,
        // so a failure in the backfill below leaves the columns added and the
        // migration unrecorded — and the retry then dies on "duplicate column"
        // instead of finishing the job. Skipping columns that already exist
        // makes the recovery path a plain `migrate` rather than manual repair.
        if (Schema::hasColumn('consultation_sessions', 'systolic')) {
            $this->backfill();

            return;
        }

        Schema::table('consultation_sessions', function (Blueprint $table) {
            // Split, because a blood pressure is two measurements. Stored as one
            // string, neither half could be trended or compared.
            $table->unsignedSmallInteger('systolic')->nullable()->after('blood_pressure');
            $table->unsignedSmallInteger('diastolic')->nullable()->after('systolic');

            $table->unsignedSmallInteger('heart_rate_bpm')->nullable()->after('heart_rate');

            // One decimal place: clinical thermometers report 36.7, not 36.72.
            $table->decimal('temperature_c', 4, 1)->nullable()->after('temperature');

            $table->unsignedTinyInteger('oxygen_saturation_pct')->nullable()->after('oxygen_saturation');

            // Two places on weight so a neonate's 2.45 kg is representable;
            // one on height, which is not measured finer than a millimetre.
            $table->decimal('weight_kg', 6, 2)->nullable()->after('weight');
            $table->decimal('height_cm', 5, 1)->nullable()->after('height');

            // The trend query: this patient's sessions in date order. Joined
            // through appointments, so the useful index here is the one that
            // already exists on appointment_id (unique). Nothing further needed.
        });

        $this->backfill();
    }

    public function down(): void
    {
        Schema::table('consultation_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'systolic', 'diastolic', 'heart_rate_bpm', 'temperature_c',
                'oxygen_saturation_pct', 'weight_kg', 'height_cm',
            ]);
        });
    }

    /**
     * Parse what the existing strings actually contain.
     *
     * Every clause is guarded so a value that does not start with a digit is
     * left NULL rather than cast to zero. Blood pressure additionally requires a
     * `digits/digits` shape — a lone number is not a blood pressure, and
     * guessing which half it represents would be inventing a finding.
     */
    private function backfill(): void
    {
        // REGEXP_SUBSTR pulls the leading number out; a bare CAST does not
        // work here. The MySQL CLI silently truncates `'70 bpm'` to 70 with a
        // warning, but Laravel's connection runs with STRICT_TRANS_TABLES,
        // which promotes that warning to
        //   "Truncated incorrect INTEGER value: '70 bpm'"
        // and aborts the migration. Extracting the digits first means the CAST
        // is handed something that is already a number.
        DB::statement("
            UPDATE consultation_sessions SET
                systolic = CASE
                    WHEN blood_pressure REGEXP '^[0-9]{2,3}/[0-9]{2,3}'
                    THEN CAST(REGEXP_SUBSTR(blood_pressure, '^[0-9]+') AS UNSIGNED)
                END,
                diastolic = CASE
                    WHEN blood_pressure REGEXP '^[0-9]{2,3}/[0-9]{2,3}'
                    THEN CAST(REGEXP_SUBSTR(SUBSTRING_INDEX(blood_pressure, '/', -1), '^[0-9]+') AS UNSIGNED)
                END,
                heart_rate_bpm = CASE
                    WHEN heart_rate REGEXP '^[0-9]'
                    THEN CAST(REGEXP_SUBSTR(heart_rate, '^[0-9]+') AS UNSIGNED)
                END,
                temperature_c = CASE
                    WHEN temperature REGEXP '^[0-9]'
                    THEN CAST(REGEXP_SUBSTR(temperature, '^[0-9]+(\\.[0-9]+)?') AS DECIMAL(4,1))
                END,
                oxygen_saturation_pct = CASE
                    WHEN oxygen_saturation REGEXP '^[0-9]'
                    THEN CAST(REGEXP_SUBSTR(oxygen_saturation, '^[0-9]+') AS UNSIGNED)
                END,
                weight_kg = CASE
                    WHEN weight REGEXP '^[0-9]'
                    THEN CAST(REGEXP_SUBSTR(weight, '^[0-9]+(\\.[0-9]+)?') AS DECIMAL(6,2))
                END,
                height_cm = CASE
                    WHEN height REGEXP '^[0-9]'
                    THEN CAST(REGEXP_SUBSTR(height, '^[0-9]+(\\.[0-9]+)?') AS DECIMAL(5,1))
                END
        ");
    }
};
