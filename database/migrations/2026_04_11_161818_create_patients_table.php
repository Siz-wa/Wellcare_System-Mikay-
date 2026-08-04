<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Introduces the concept of a "Patient" as a person distinct from a
     * booking account (User). This mirrors industry practice:
     *
     *   User (account/guarantor) — who logged in and booked
     *   Patient                  — the actual person receiving care
     *
     * One user account can be the guarantor for multiple patients
     * (e.g. a parent booking for their children, or someone booking
     * for a relative). Each patient has their own independent medical
     * record, visit history, allergies, and diagnoses.
     *
     * Matching logic:
     *   When a booking is submitted, we look for an existing patient
     *   record matching (first_name + last_name + contact_number) case-
     *   insensitively. If found, we link to that patient. If not, we
     *   create a new patient record. This prevents duplicate records
     *   for the same person booking through different accounts.
     */
    public function up(): void
    {
        // ── 1. patients ──────────────────────────────────────────────────────
        Schema::create('patients', function (Blueprint $table) {
            $table->id();

            // The booking account — nullable because walk-in / guest bookings
            // may not have an account. This is the "guarantor", NOT the patient.
            $table->foreignId('guarantor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Core identity — what the booking form collects
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('contact_number', 20);
            $table->unsignedTinyInteger('age')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();

            // Extended profile (filled in over time by clinic staff)
            $table->date('birthdate')->nullable();
            $table->string('address', 500)->nullable();
            $table->enum('civil_status', ['single', 'married', 'widowed'])->nullable();
            $table->string('company')->nullable();

            // Coverage defaults (can be overridden per appointment)
            $table->enum('default_coverage', ['cash', 'hmo', 'philhealth', 'corporate'])->nullable();
            $table->string('hmo_provider')->nullable();
            $table->string('hmo_id', 20)->nullable();

            // A unique clinic reference number for this patient
            // Format: WC-XXXXXX (auto-generated on creation)
            $table->string('clinic_id', 20)->unique()->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes for the matching query
            $table->index(['first_name', 'last_name', 'contact_number']);
            $table->index('email');
            $table->index('guarantor_id');
        });

        // ── 2. Link appointments to patients ─────────────────────────────────
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('patient_id')
                ->nullable()
                ->after('user_id')
                ->constrained('patients')
                ->nullOnDelete();

            $table->index('patient_id');
        });

        // ── 3. Move patient record tables to use patient_id ──────────────────
        // patient_allergies, patient_diagnoses, patient_documents currently
        // use user_id — add patient_id column (keep user_id for backcompat)

        foreach (['patient_allergies', 'patient_diagnoses', 'patient_documents'] as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) {
                    $t->foreignId('patient_id')
                        ->nullable()
                        ->after('user_id')
                        ->constrained('patients')
                        ->nullOnDelete();
                    $t->index('patient_id');
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['patient_allergies', 'patient_diagnoses', 'patient_documents'] as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropForeign(['patient_id']);
                    $t->dropIndex(['patient_id']);
                    $t->dropColumn('patient_id');
                });
            }
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['patient_id']);
            $table->dropIndex(['patient_id']);
            $table->dropColumn('patient_id');
        });

        Schema::dropIfExists('patients');
    }
};
