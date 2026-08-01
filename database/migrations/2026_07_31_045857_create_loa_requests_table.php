<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Letter of Authorization table — Figure 7's `LOA` entity, Figure 6's
     * processes 3 (SUBMIT LOA) and 4 (APPROVE LOA), and the store that Figure 8
     * calls `tbl_LOA status`, Figure 10 `tb5 LOA Database` and Figure 11
     * `tbl_LOA`.
     *
     * Objective 1.6 asks the system to *monitor and track* LOA requests. Before
     * this table the only LOA state in the codebase was the appointment status
     * `pending_hmo_approval` — a binary gate with no reference number, no
     * request date, no validity window, no approver and no remarks, so there
     * was nothing for a patient to check.
     *
     * Keyed by patient_id (the person seen), not user_id (the booking account),
     * so two patients sharing one guarantor never see each other's coverage.
     *
     * Column names follow the ERD; `loa_requests` is the Laravel-conventional
     * plural of the ERD's `LOA`.
     */
    public function up(): void
    {
        Schema::create('loa_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')          // ERD "patient id"
                ->constrained('patients')
                ->cascadeOnDelete();

            $table->foreignId('user_id')             // guarantor account
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('appointment_id')      // ERD "appointment id"
                ->nullable()
                ->constrained('appointments')
                ->nullOnDelete();

            $table->foreignId('approved_by')         // ERD "approved by" — HR/admin
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // The reference a patient quotes at the counter. Mirrors the
            // WC-XXXXXX shape of patients.clinic_id.
            $table->string('loa_number')->unique();

            $table->string('hmo_provider')->nullable();  // <- appointments.hmo
            $table->string('hmo_id')->nullable();        // <- appointments.hmo_id

            // ERD "approval status".
            $table->enum('status', ['submitted', 'approved', 'rejected', 'expired'])
                ->default('submitted');

            $table->text('remarks')->nullable();     // ERD "remarks"
            $table->date('valid_until')->nullable(); // ERD "valid until"

            // ── Audit trail: one timestamp per transition ────────────────────
            $table->timestamp('requested_at')->nullable();  // ERD "request date"
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // The HR queue filters on status and orders oldest-first.
            $table->index(['status', 'requested_at']);
            $table->index('patient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loa_requests');
    }
};
