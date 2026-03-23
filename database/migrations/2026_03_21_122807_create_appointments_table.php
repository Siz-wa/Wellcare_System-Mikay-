<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // ── Personal info snapshot ─────────────────────────────────────
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('contact_number', 20);
            $table->unsignedTinyInteger('age');
            $table->enum('gender', ['male', 'female', 'other']);

            // ── Booking details ───────────────────────────────────────────
            $table->string('service');
            $table->date('appointment_date');
            $table->string('appointment_time', 20);

            // ── Patient context ───────────────────────────────────────────
            $table->enum('patient_status', ['new', 'returning'])->default('new');

            // ── Coverage & preferences ────────────────────────────────────
            $table->enum('coverage', ['cash', 'hmo', 'philhealth', 'corporate']);
            $table->string('hmo')->nullable();
            $table->string('preferred_doctor')->nullable();

            // ── Notes & status ────────────────────────────────────────────
            $table->text('additional_info')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};