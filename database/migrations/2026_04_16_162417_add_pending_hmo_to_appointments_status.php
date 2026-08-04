<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds `pending_hmo_approval` to the appointments.status enum.
     *
     * Full state machine after this migration:
     *
     *   HMO booking    → pending_hmo_approval
     *                      ↓ HR approves
     *   Other booking  → requested
     *                      ↓ doctor confirms
     *                    confirmed
     *                      ↓ patient checks in (day-of only)
     *                    checked_in
     *                      ↓ doctor starts session
     *                    in_progress
     *                      ↓ doctor finalizes
     *                    completed
     *
     *   Any state before completed → cancelled / no_show (terminal)
     */
    public function up(): void
    {
        // MySQL ENUM modification — must list ALL values
        DB::statement("
            ALTER TABLE appointments
            MODIFY COLUMN status ENUM(
                'pending_hmo_approval',
                'requested',
                'confirmed',
                'checked_in',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            ) NOT NULL DEFAULT 'requested'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE appointments
            MODIFY COLUMN status ENUM(
                'requested',
                'confirmed',
                'checked_in',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            ) NOT NULL DEFAULT 'requested'
        ");
    }
};
