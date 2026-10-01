<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-4 — consent, captured per purpose and versioned.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.1, C-1 through C-6.
 *
 * There was nothing here before: no table, no column, no checkbox. A patient
 * could register, book, be diagnosed and have documents attached to their chart
 * without any record of consent to any of it. `/privacy` existed as static
 * marketing copy that nobody was required to read, let alone accept.
 *
 * ## One row per purpose, never one row for "the terms"
 *
 * The table is keyed on `type`, and the registration form ticks each purpose
 * separately. Bundling them behind a single "I agree" is finding C-1 and is the
 * thing this schema is shaped to prevent — a lawful basis has to be specific,
 * and a person who wanted care but not marketing must be able to say so.
 *
 * ## Versioned, because wording changes and consent does not travel
 *
 * `document_version` stores which text was on screen at the moment of the tick.
 * When the wording in config/consent.php changes, its version is bumped;
 * existing rows keep the old one, so the record always says what the person
 * actually agreed to rather than what the file happens to say today.
 * ConsentService::isStale() reads exactly this to find people who need re-asking.
 *
 * ## Withdrawal is a second timestamp, not a delete
 *
 * `withdrawn_at` rather than removing the row. Withdrawal is itself an event the
 * clinic must be able to evidence — "they consented on the 3rd and withdrew on
 * the 9th" is the fact, and a deleted row cannot state it.
 *
 * ## Two subjects, both nullable
 *
 * `patient_id` is who the consent is ABOUT; `granted_by_user_id` is who gave it.
 * They differ whenever a guarantor consents for a child — the case
 * `patients.relationship_to_guarantor` already models and C-6 asks for.
 * Account-level consents (data processing, marketing) carry a null patient_id
 * because they attach to the account rather than to one person's chart.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consents', function (Blueprint $table) {
            $table->id();

            // Who the consent is about. Null for account-level purposes.
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();

            // Who actually gave it — the account holder, who may be the
            // patient themselves or their guarantor.
            $table->foreignId('granted_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('type', ['data_processing', 'treatment', 'telemedicine', 'marketing']);

            $table->string('document_version', 40);

            $table->timestamp('granted_at');
            $table->timestamp('withdrawn_at')->nullable();

            // Evidence of the circumstances, same fields the access log keeps.
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            // "What is this account's current position on each purpose" — the
            // query the settings panel and every consent gate runs.
            $table->index(['granted_by_user_id', 'type', 'withdrawn_at']);

            // "Has this patient consented to treatment" — the booking gate.
            $table->index(['patient_id', 'type', 'withdrawn_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consents');
    }
};
