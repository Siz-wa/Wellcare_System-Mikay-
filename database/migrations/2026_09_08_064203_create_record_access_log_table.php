<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-3 — the read half of the audit trail.
 *
 * See WELLCARE-COMPLIANCE-PLAN.md §2.3 (AU-2, AU-3) and §2.7 (B-1).
 *
 * `activity_log` answers "who CHANGED this record". Nothing answered "who
 * LOOKED at it", and for a clinical system that is the more important question:
 * viewing is the whole of the harm in an unauthorised access, and it is the
 * question a breach notification has to answer inside 72 hours. Without this
 * table the honest answer after a compromised staff account was "every patient
 * in the database, and we cannot narrow it".
 *
 * ## Why this is a separate table from `activity_log`
 *
 * Volume and purpose. Reads outnumber writes by a wide margin, and pouring them
 * into `activity_log` would bury the change history the admin screen exists to
 * show — a log where the signal is 2% of the rows is a log nobody reads. Spatie's
 * schema is also shaped for before/after attribute diffs, which a read does not
 * have.
 *
 * ## Append-only by construction
 *
 * `created_at` only, no `updated_at`: there is no legitimate reason to modify an
 * access record, so the schema does not offer the column that would make it look
 * routine. Nothing in the application updates or deletes from this table, and
 * nothing should be added that does.
 *
 * ## Retention
 *
 * Deliberately unbounded for now. Accountability wants a long window and data
 * minimisation wants a short one; that number is ND-3 in §5 of the compliance
 * plan and belongs to the DPO, not to this migration. Left growing rather than
 * guessed at — an over-long log is a privacy question, an over-short one
 * destroys the evidence.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('record_access_log', function (Blueprint $table) {
            $table->id();

            // Nullable + nullOnDelete throughout, for the reason the whole
            // retention migration exists: an audit record must outlive the
            // account it describes. A purged staff account must not be able to
            // erase the evidence of what it read.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();

            // Denormalised on purpose. Roles get reassigned, and "who was this
            // person AT THE TIME" is the fact an investigation needs — reading
            // it back off the live user would rewrite history.
            $table->string('actor_role', 40)->nullable();

            // Whose record was touched. Null for surfaces that are not scoped to
            // one patient: an index/search view, or the HR analytics export.
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();

            // What exactly. Polymorphic rather than a fixed FK because the same
            // action applies to a Patient, a PatientDocument or a LabTestResult.
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            $table->enum('action', ['viewed', 'downloaded', 'exported', 'searched']);

            $table->string('route')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('created_at')->useCurrent();

            // "Show me everything that touched this patient's record" — the
            // breach-scoping query, and the one behind the patient-facing
            // "who accessed your records" list.
            $table->index(['patient_id', 'created_at']);

            // "What did this account read, and how much of it" — the insider
            // question, and the feed for SC-8's bulk-access threshold.
            $table->index(['actor_id', 'created_at']);

            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('record_access_log');
    }
};
