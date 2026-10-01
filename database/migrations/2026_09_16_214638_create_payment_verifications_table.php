<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How a self-paying patient settles a VIDEO consultation.
 *
 * ## The problem this table exists for
 *
 * `appointments.coverage` has always allowed `cash`, and Phase 3 added
 * `consultation_type = virtual`. Nothing stopped the combination, and the
 * combination is incoherent: cash is handed to a cashier, and there is no
 * cashier on a video call. A patient could book a virtual visit as "Cash /
 * Self-Pay", attend it, and leave the clinic with no record that anything was
 * owed — the system had no concept of an unpaid consultation.
 *
 * ## Why this is not a payment gateway
 *
 * **No money moves through this application.** The clinic's own GCash Business
 * account, its bank account and its front-desk cashier move the money, exactly
 * as they already do. This table records two things about that: the patient's
 * CLAIM that they paid (a channel, an amount, a reference number they read off
 * their receipt) and a staff member's VERIFICATION that the funds actually
 * landed, checked against the clinic's own statement.
 *
 * That is the model real Philippine clinics run. Providence Hospital confirms
 * payment and only then emails the appointment confirmation with the scanned
 * OR; MakatiMed's HealthHub takes GCash/Maya/online banking before the Zoom
 * session; St. Luke's Extension Clinic lets the patient settle at the clinic
 * cashier instead. The software's job in all three is bookkeeping and a gate,
 * not funds transfer.
 *
 * ## Shape
 *
 * Deliberately the same shape as `loa_requests`, because it is the same kind of
 * object: a request a patient raises, a queue staff works, and a decision that
 * releases or blocks an appointment. Keying, soft deletes, the `*_at` column
 * per transition and the WC- reference number all follow that table so the two
 * queues read identically to whoever works both.
 *
 * Keyed by patient_id (the person seen), not user_id (the booking account), for
 * the reason CLAUDE.md gives: one guarantor may pay for several patients, and
 * scoping a portal page on user_id would show one sibling another's billing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_verifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('appointment_id')
                ->constrained('appointments')
                ->cascadeOnDelete();

            $table->foreignId('patient_id')          // the person seen
                ->constrained('patients')
                ->cascadeOnDelete();

            $table->foreignId('user_id')             // guarantor / booking account
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // The HR officer or cashier who checked the clinic's statement.
            $table->foreignId('verified_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // The reference a patient quotes at the counter or on the phone.
            // Mirrors loa_requests.loa_number and patients.clinic_id.
            $table->string('payment_reference')->unique();

            /*
             * pending   — the fee is owed; the patient has not told us anything yet
             * submitted — the patient has declared a remittance; staff must check it
             * verified  — funds confirmed against the clinic's own records
             * rejected  — no matching remittance found, or the wrong amount
             * waived    — the clinic chose not to collect (goodwill, staff, re-consult)
             *
             * `pending` and `submitted` are distinct on purpose. A patient who
             * has paid at the cashier and one who has not paid at all are both
             * unpaid to the gate, but only the first is work for the queue.
             */
            $table->enum('status', [
                'pending', 'submitted', 'verified', 'rejected', 'waived',
            ])->default('pending');

            /*
             * How the patient says they settled. `otc_cash` is the answer to
             * "how do you pay cash for a video call" — you or a representative
             * hand it to the cashier at the Dasmariñas branch before the call,
             * which is what St. Luke's Extension Clinic does.
             */
            $table->enum('method', [
                'otc_cash', 'gcash', 'maya', 'bank_transfer',
            ])->nullable();

            // What the clinic asked for, snapshotted at booking. A snapshot and
            // not a join to services.virtual_fee: re-pricing the catalogue next
            // month must not retroactively change what a patient already paid.
            $table->decimal('amount_due', 8, 2)->default(0);

            // What the patient says they sent. Usually equal to amount_due;
            // when it is not, that difference is the whole reason a human looks
            // at the row.
            $table->decimal('amount_paid', 8, 2)->nullable();

            /*
             * The GCash/Maya/bank reference, or the OR number from the cashier.
             * Encrypted at rest for the reason SC-5 gives for hmo_id: it is a
             * financial identifier that ties a named patient to a transaction,
             * and nothing in the app filters on it in SQL — the queue filters on
             * `status`, so encrypting costs no query.
             */
            $table->text('remittance_reference')->nullable();

            // The uploaded screenshot or receipt photo, encrypted on disk by
            // PaymentProofStorage. Nullable: an over-the-counter payment has a
            // cashier's OR instead, and there is nothing to upload.
            $table->string('proof_path')->nullable();
            $table->string('proof_name')->nullable();
            $table->string('proof_mime')->nullable();

            // The verifier's note — the reason a rejection happened, which is
            // the only actionable part of a decision for the patient.
            $table->text('remarks')->nullable();

            /*
             * When the money must be in. Copied from
             * `payments.settlement_deadline_hours` before the appointment start
             * at the moment of booking rather than computed on read, so moving
             * the config later cannot silently expire appointments that were
             * booked under the old rule.
             */
            $table->timestamp('due_at')->nullable();

            // ── Audit trail: one timestamp per transition ────────────────────
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('rejected_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // The staff queue filters on status and orders oldest-first; the
            // sweeper scans pending rows by due_at.
            $table->index(['status', 'submitted_at']);
            $table->index(['status', 'due_at']);
            $table->index('patient_id');

            /*
             * One payment record per appointment. Not merely an index: without
             * it, two writes racing would leave a verified row and a rejected
             * row against the same visit, and the gate reads
             * `->paymentVerification` expecting one answer.
             *
             * On `appointment_id` ALONE, deliberately. The tempting version is
             * `unique(['appointment_id', 'deleted_at'])` so a soft-deleted
             * record does not block a re-issue — and in MySQL that constraint
             * enforces nothing at all, because a UNIQUE index treats every NULL
             * as distinct. Two live rows both carry `deleted_at = NULL`, so
             * both are accepted and the guarantee is silently absent.
             *
             * The cost is that a soft-deleted record does block a new one for
             * the same visit. Nothing in the application soft-deletes these —
             * SoftDeletes is on the model to match LoaRequest — and if that
             * ever changes, restoring or force-deleting the old record is the
             * correct move anyway, because a visit that was billed twice is a
             * question for a human.
             */
            $table->unique('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_verifications');
    }
};
