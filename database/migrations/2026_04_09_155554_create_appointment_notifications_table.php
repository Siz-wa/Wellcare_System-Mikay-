<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * appointment_notifications
     * ──────────────────────────────────────────────────────────────────────────
     * Records every email notification sent to a patient about their appointment.
     * Displayed in the patient's notification bell / inbox in their dashboard.
     *
     * type values:
     *   confirmed   — doctor confirmed the appointment
     *   checked_in  — patient checked themselves in (arrival confirmation)
     *   cancelled   — appointment was cancelled
     *   reminder    — 24-hr reminder (future use)
     */
    public function up(): void
    {
        Schema::create('appointment_notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('appointment_id')
                  ->constrained('appointments')
                  ->cascadeOnDelete();

            $table->foreignId('user_id')       // the patient
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->enum('type', ['confirmed', 'checked_in', 'cancelled', 'reminder']);
            $table->string('subject');
            $table->text('body');
            $table->boolean('read')->default(false);

            $table->timestamps();

            $table->index(['user_id', 'read']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_notifications');
    }
};