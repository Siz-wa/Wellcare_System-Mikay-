<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The two tables behind DFD process 6 (RECORD LAB RESULTS) and store TB4.
     *
     * lab_test_results      — one row per ordered test, carrying the full
     *                         doctor → nurse → doctor workflow and its audit trail
     * lab_result_parameters — the individual measured values inside one test,
     *                         mirroring the Parameter interface the existing
     *                         doctor/lab-reviews UI already expects
     *
     * Keyed by patient_id (the person seen), not user_id (the booking account),
     * so results never bleed between two patients sharing one guarantor.
     */
    public function up(): void
    {
        // ── lab_test_results ─────────────────────────────────────────────────
        Schema::create('lab_test_results', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->cascadeOnDelete();

            $table->foreignId('user_id')      // guarantor account, mirrors patient_*
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('appointment_id')
                ->nullable()
                ->constrained('appointments')
                ->nullOnDelete();

            // ── Workflow actors ──────────────────────────────────────────────
            $table->foreignId('requested_by')  // doctor who ordered the test
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('recorded_by')   // nurse who encoded the results
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('reviewed_by')   // doctor who validated them
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('test_name');       // e.g. "Blood Panel", "ECG Report"

            $table->enum('status', ['requested', 'recorded', 'reviewed'])
                ->default('requested');

            // Set by the nurse at record time; null while still 'requested'.
            $table->enum('severity', ['normal', 'abnormal', 'critical'])->nullable();

            $table->text('notes')->nullable();           // nurse's remarks
            $table->text('interpretation')->nullable();  // doctor's final reading

            // ── Audit trail: one timestamp per transition ────────────────────
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('recorded_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // The nurse queue filters on status; the doctor queue on both.
            $table->index(['status', 'severity']);
            $table->index('patient_id');
        });

        // ── lab_result_parameters ────────────────────────────────────────────
        Schema::create('lab_result_parameters', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lab_test_result_id')
                ->constrained('lab_test_results')
                ->cascadeOnDelete();

            $table->string('name');                  // e.g. "Hemoglobin"
            $table->string('result');                // kept as a string: values like
            // "Negative" or "2–4" are valid
            $table->string('unit', 50)->nullable();  // e.g. "g/dL"
            $table->string('ref_range')->nullable(); // e.g. "12.0–16.0"

            $table->enum('status', ['normal', 'abnormal'])->default('normal');

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index('lab_test_result_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_result_parameters');
        Schema::dropIfExists('lab_test_results');
    }
};
