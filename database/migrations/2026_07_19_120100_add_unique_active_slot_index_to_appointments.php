<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Database-level guard against double-booking.
 *
 * The create_appointments_table migration's docblock claimed a unique index on
 * (doctor_id, appointment_date, appointment_time, status) existed — it never
 * did; only non-unique lookup indexes were created. Until now the sole defence
 * was the application-level lockForUpdate() in BookingService::bookSlot(), so
 * any other write path (seeders, admin tooling, raw SQL) could duplicate freely.
 *
 * A plain unique index on those three columns would be wrong twice over:
 *
 *   1. Including `status` defeats the purpose — the same slot could be
 *      duplicated by simply differing in status (requested vs confirmed).
 *   2. Excluding it breaks rebooking — cancelled, no-show, and soft-deleted
 *      rows keep their doctor/date/time, so a freed slot would stay locked
 *      forever.
 *
 * MySQL/MariaDB have no partial indexes, but a unique index does permit
 * multiple NULLs. So we key off a generated column that collapses to NULL for
 * any row that no longer occupies its slot, and to a "doctor|date|time" key for
 * rows that do. Live slots collide; released ones don't.
 *
 * SQLite (the test-suite driver) needs a separate path: it cannot ADD a STORED
 * generated column via ALTER TABLE, its ALTER syntax has no `ADD UNIQUE INDEX`,
 * and CONCAT_WS only landed in 3.44. It does, however, support partial indexes
 * natively — which expresses the intent directly instead of emulating it, so
 * the generated column is a MySQL implementation detail rather than the schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::select('
            SELECT doctor_id, appointment_date, appointment_time, COUNT(*) AS c
            FROM appointments
            WHERE deleted_at IS NULL
              AND status NOT IN ("cancelled", "no_show")
            GROUP BY doctor_id, appointment_date, appointment_time
            HAVING c > 1
        ');

        if ($duplicates !== []) {
            $sample = array_slice($duplicates, 0, 5);
            $lines = array_map(
                fn ($d) => sprintf(
                    '  doctor_id=%s  %s  %s  (%d rows)',
                    $d->doctor_id ?? 'NULL',
                    $d->appointment_date,
                    $d->appointment_time,
                    $d->c
                ),
                $sample
            );

            throw new RuntimeException(
                sprintf(
                    "Cannot add the unique slot index: %d slot(s) are already double-booked.\n%s\n%s",
                    count($duplicates),
                    implode("\n", $lines),
                    'Cancel or delete the surplus appointments, then re-run this migration.'
                )
            );
        }

        // COALESCE on doctor_id so legacy unassigned rows don't all collapse
        // into the same key via CONCAT_WS skipping NULLs.
        DB::statement('
            ALTER TABLE appointments
            ADD COLUMN active_slot_key VARCHAR(64)
            GENERATED ALWAYS AS (
                CASE
                    WHEN deleted_at IS NOT NULL THEN NULL
                    WHEN status IN ("cancelled", "no_show") THEN NULL
                    ELSE CONCAT_WS(
                        "|",
                        COALESCE(doctor_id, 0),
                        appointment_date,
                        appointment_time
                    )
                END
            ) STORED
        ');

        DB::statement('
            ALTER TABLE appointments
            ADD UNIQUE INDEX appointments_active_slot_unique (active_slot_key)
        ');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE appointments DROP INDEX appointments_active_slot_unique');
        DB::statement('ALTER TABLE appointments DROP COLUMN active_slot_key');
    }
};
