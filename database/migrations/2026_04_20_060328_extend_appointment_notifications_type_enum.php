<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

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
                'hmo_submitted',
                'hmo_approved',
                'hmo_rejected'
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
                'reminder'
            ) NOT NULL
        ");
    }
};