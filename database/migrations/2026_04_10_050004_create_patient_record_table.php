<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Three tables that complete the patient record management system.
     *
     * patient_allergies  — critical safety data, shown as red flags on every record
     * patient_diagnoses  — longitudinal ICD-style diagnosis history across all visits
     * patient_documents  — uploaded lab results, imaging, referral letters, etc.
     *
     * All three are keyed by user_id (the patient's users.id) so they work
     * regardless of which doctor the patient saw.
     */
    public function up(): void
    {
        // ── patient_allergies ────────────────────────────────────────────────
        Schema::create('patient_allergies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('recorded_by')    // the doctor/nurse who recorded it
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('allergen');          // e.g. "Penicillin", "Shellfish"
            $table->enum('severity', ['mild', 'moderate', 'severe'])->default('moderate');
            $table->string('reaction')->nullable(); // e.g. "Hives", "Anaphylaxis"
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('user_id');
        });

        // ── patient_diagnoses ────────────────────────────────────────────────
        Schema::create('patient_diagnoses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('appointment_id')
                  ->nullable()    // can exist without a specific appointment
                  ->constrained('appointments')
                  ->nullOnDelete();

            $table->foreignId('recorded_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('icd_code')->nullable();    // e.g. "J06.9"
            $table->string('diagnosis');               // e.g. "Acute Upper Respiratory Infection"
            $table->enum('type', ['primary', 'secondary', 'chronic'])->default('primary');
            $table->enum('status', ['active', 'resolved', 'chronic'])->default('active');
            $table->date('diagnosed_at');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'diagnosed_at']);
        });

        // ── patient_documents ────────────────────────────────────────────────
        Schema::create('patient_documents', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('appointment_id')
                  ->nullable()
                  ->constrained('appointments')
                  ->nullOnDelete();

            $table->foreignId('uploaded_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('title');             // "CBC Results - March 2026"
            $table->enum('type', ['lab', 'imaging', 'referral', 'prescription', 'report', 'other'])
                  ->default('other');
            $table->string('file_path');         // storage path
            $table->string('file_name');         // original filename
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size'); // bytes

            $table->timestamps();

            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_documents');
        Schema::dropIfExists('patient_diagnoses');
        Schema::dropIfExists('patient_allergies');
    }
};