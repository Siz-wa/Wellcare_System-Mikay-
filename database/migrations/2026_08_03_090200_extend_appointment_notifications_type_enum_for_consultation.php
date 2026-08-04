<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Phase 3 — the patient needs to be told their video room is open.
 *
 * `type` is a MySQL ENUM, so adding a value means re-declaring every existing
 * value alongside the new one. Dropping one here would silently truncate the
 * rows that use it. Third extension of this column; see the 2026_04_20 and
 * 2026_07_20 migrations for the same pattern.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE appointment_notifications
            MODIFY COLUMN type ENUM(
                'confirmed',
                'checked_in',
                'cancelled',
                'reminder',
                'consultation_done',
                'consultation_started',
                'hmo_submitted',
                'hmo_approved',
                'hmo_rejected',
                'lab_requested',
                'lab_recorded',
                'lab_critical',
                'lab_reviewed'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        // Rows carrying the new type would be truncated to '' by a plain
        // MODIFY, so clear them first. Losing a "your room is open" notice on
        // rollback is harmless — it is transient by nature — whereas leaving
        // invalid enum values in the table is not.
        DB::table('appointment_notifications')
            ->where('type', 'consultation_started')
            ->delete();

        DB::statement("
            ALTER TABLE appointment_notifications
            MODIFY COLUMN type ENUM(
                'confirmed',
                'checked_in',
                'cancelled',
                'reminder',
                'consultation_done',
                'hmo_submitted',
                'hmo_approved',
                'hmo_rejected',
                'lab_requested',
                'lab_recorded',
                'lab_critical',
                'lab_reviewed'
            ) NOT NULL
        ");
    }
};
