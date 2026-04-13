<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * appointments — core booking table.
     *
     * State machine:
     *   requested → confirmed → checked_in → in_progress → completed
     *                         ↘ cancelled
     *                                     ↘ no_show
     *
     * Race-condition guard:
     *   - `hold_expires_at`  : optimistic 10-min slot hold before confirm
     *   - `locked_at`        : pessimistic per-row lock flag for the bookSlot
     *                          atomic block (set inside DB::transaction)
     *
     * Conflict guard:
     *   - Unique index on (doctor_id, appointment_date, appointment_time, status)
     *     filtered to exclude cancelled/no_show rows (enforced at service layer
     *     with a whereNotIn guard + lockForUpdate, because MySQL doesn't support
     *     partial unique indexes natively).
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            // ── Patient identity ─────────────────────────────────────────────
            $table->foreignId('user_id')
                  ->nullable()   // guest bookings allowed
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('contact_number', 20);
            $table->unsignedTinyInteger('age');
            $table->enum('gender', ['male', 'female', 'other']);

            // ── Appointment details ──────────────────────────────────────────
            $table->foreignId('doctor_id')
                  ->nullable()           // "next available" bookings
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('service');
            $table->string('branch');
            $table->date('appointment_date');
            $table->string('appointment_time', 20);   // e.g. "10:00 AM"
            $table->enum('patient_status', ['new', 'returning']);

            // ── Coverage ─────────────────────────────────────────────────────
            $table->enum('coverage', ['cash', 'hmo', 'philhealth', 'corporate']);
            $table->string('hmo')->nullable();
            $table->string('hmo_id', 20)->nullable();

            // ── Additional ──────────────────────────────────────────────────
            $table->text('additional_info')->nullable();

            // ── State machine ────────────────────────────────────────────────
            $table->enum('status', [
                'requested',
                'confirmed',
                'checked_in',
                'in_progress',
                'completed',
                'cancelled',
                'no_show',
            ])->default('requested');

            // ── Hold / lock mechanism ────────────────────────────────────────
            // Slot is "held" for 10 minutes after the form is first submitted.
            // If not confirmed within that window the slot becomes available again.
            $table->timestamp('hold_expires_at')->nullable();

            // Cancellation metadata
            $table->string('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // ── Indexes ──────────────────────────────────────────────────────
            // Speed up conflict-check query:  doctor + date + time
            $table->index(['doctor_id', 'appointment_date', 'appointment_time']);
            // Speed up patient-overlap check: patient email + date
            $table->index(['email', 'appointment_date']);
            // Speed up status-based admin queries
            $table->index(['status', 'appointment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};