<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * consultation_sessions — stores clinical data recorded during a session.
     *
     * One session per appointment (one-to-one with appointments).
     * SOAP notes and vitals are stored as columns for simplicity.
     * Prescriptions are stored in a separate child table.
     */
    public function up(): void
    {
        // ── consultation_sessions ────────────────────────────────────────────
        Schema::create('consultation_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('appointment_id')
                ->unique()                    // one session per appointment
                ->constrained('appointments')
                ->cascadeOnDelete();

            $table->foreignId('doctor_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // ── SOAP Notes ───────────────────────────────────────────────────
            $table->text('subjective')->nullable();
            $table->text('objective')->nullable();
            $table->text('assessment')->nullable();
            $table->text('plan')->nullable();

            // ── Vitals ───────────────────────────────────────────────────────
            $table->string('blood_pressure', 20)->nullable();
            $table->string('heart_rate', 10)->nullable();
            $table->string('temperature', 10)->nullable();
            $table->string('oxygen_saturation', 10)->nullable();
            $table->string('weight', 10)->nullable();
            $table->string('height', 10)->nullable();

            // ── Session state ────────────────────────────────────────────────
            $table->enum('status', ['draft', 'finalized'])->default('draft');

            $table->timestamps();

            $table->index(['doctor_id', 'created_at']);
        });

        // ── consultation_prescriptions ───────────────────────────────────────
        Schema::create('consultation_prescriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('session_id')
                ->constrained('consultation_sessions')
                ->cascadeOnDelete();

            $table->string('name');            // e.g. "Amoxicillin 500mg"
            $table->string('instructions');    // e.g. "Twice daily after meals • 7 Days"

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_prescriptions');
        Schema::dropIfExists('consultation_sessions');
    }
};
