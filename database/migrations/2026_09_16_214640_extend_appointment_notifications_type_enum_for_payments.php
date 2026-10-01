<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The bell has to carry the settlement conversation.
 *
 * A patient who owes a fee, a cashier who has a remittance to check, and a
 * patient whose proof was rejected are all people waiting on someone else — the
 * exact case the notification table exists for.
 *
 * `type` is a MySQL ENUM, so adding values means re-declaring every existing
 * one alongside the new ones. Dropping one here would silently truncate the
 * rows that use it. Fourth extension of this column; see the 2026_04_20,
 * 2026_07_20 and 2026_08_03 migrations for the same pattern.
 */
return new class extends Migration
{
    /**
     * @var array<int, string>
     */
    private const ADDED = [
        'payment_due',
        'payment_submitted',
        'payment_verified',
        'payment_rejected',
    ];

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
                'lab_reviewed',
                'payment_due',
                'payment_submitted',
                'payment_verified',
                'payment_rejected'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        // Rows carrying the new types would be truncated to '' by a plain
        // MODIFY, so clear them first — the same reasoning as the 2026_08_03
        // rollback. A lost "your payment was verified" notice is recoverable
        // from payment_verifications, which is the record of substance;
        // invalid enum values in this table are not.
        DB::table('appointment_notifications')
            ->whereIn('type', self::ADDED)
            ->delete();

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
};
