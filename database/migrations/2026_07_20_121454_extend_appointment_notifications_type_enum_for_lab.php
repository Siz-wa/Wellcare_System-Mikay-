<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * `type` is a MySQL ENUM, so adding a value means re-declaring every
     * existing value alongside the new ones. Dropping one here would silently
     * truncate the rows that use it.
     */
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
                'hmo_rejected'
            ) NOT NULL
        ");
    }
};
