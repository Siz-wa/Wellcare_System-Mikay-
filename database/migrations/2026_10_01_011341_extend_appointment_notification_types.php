<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-handover QA fixes.
 *
 *  - `requested`: a doctor's "new booking" notice was filed as `confirmed`,
 *    which it is not.
 *  - `rescheduled`: patients can now move a booking online.
 *  - `refund_due`: a paid video consultation that gets cancelled needs the
 *    cashier's attention.
 *  - `contact_message`: the public contact form now reaches the clinic.
 *
 * `type` is a MySQL ENUM, so every existing value is re-declared alongside the
 * new ones. Fifth extension of this column; see 2026_09_16_214640.
 *
 * `appointment_id` becomes nullable: a contact-form message is a notice with no
 * appointment behind it. The foreign key is kept.
 */
return new class extends Migration
{
    /**
     * @var array<int, string>
     */
    private const EXISTING = [
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
        'payment_rejected',
    ];

    /**
     * @var array<int, string>
     */
    private const ADDED = [
        'requested',
        'rescheduled',
        'refund_due',
        'contact_message',
    ];

    public function up(): void
    {
        $this->declare([...self::EXISTING, ...self::ADDED]);

        Schema::table('appointment_notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('appointment_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // A plain MODIFY would truncate rows carrying the new types to ''.
        DB::table('appointment_notifications')->whereIn('type', self::ADDED)->delete();
        DB::table('appointment_notifications')->whereNull('appointment_id')->delete();

        Schema::table('appointment_notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('appointment_id')->nullable(false)->change();
        });

        $this->declare(self::EXISTING);
    }

    /**
     * @param  array<int, string>  $values
     */
    private function declare(array $values): void
    {
        $list = implode(',', array_map(fn (string $v) => "'{$v}'", $values));

        DB::statement("ALTER TABLE appointment_notifications MODIFY COLUMN type ENUM({$list}) NOT NULL");
    }
};
