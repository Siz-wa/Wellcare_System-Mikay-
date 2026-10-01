<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SC-1(b) — stop a deleted `users` row from taking clinical records with it.
 *
 * See WELLCARE-COMPLIANCE-PLAN.md §2.6, RET-1 and RET-2.
 *
 * ## What was wrong
 *
 * Six foreign keys pointed at `users` with ON DELETE CASCADE and reached
 * straight into the clinical record:
 *
 *   patient_allergies.user_id      patient_allergies.recorded_by
 *   patient_diagnoses.user_id      patient_diagnoses.recorded_by
 *   patient_documents.user_id      patient_documents.uploaded_by
 *
 * Two separate disasters followed from that, both verified against the live
 * schema through information_schema.REFERENTIAL_CONSTRAINTS:
 *
 * **RET-1.** `Settings\ProfileController::destroy()` called `$user->delete()`
 * on a model with no SoftDeletes, so closing an account was a hard DELETE. The
 * `user_id` cascades then destroyed that person's allergies, diagnoses and
 * document rows — the files themselves stayed on disk, orphaned — while
 * `patients.guarantor_id` (SET NULL) left the `patients` row behind, alive but
 * unreachable from the portal and stripped of its clinical children.
 *
 * **RET-2.** The `recorded_by` / `uploaded_by` half is worse in scope. Those
 * columns hold the *clinician*, so hard-deleting one doctor's account would
 * have deleted every allergy and diagnosis that doctor ever recorded, across
 * every patient in the clinic. Nothing could reach it today —
 * `User::canCloseOwnAccount()` refuses clinical roles and the admin module only
 * deactivates — but the distance between "unreachable" and "one `if` away" is
 * not where a control this size should live.
 *
 * ## What this does
 *
 * All six become nullable + ON DELETE SET NULL. A destroyed account now
 * detaches from the record instead of taking it; the row survives, still keyed
 * to its `patient_id`, which is the column the whole Patient/User split exists
 * to make authoritative.
 *
 * ## What is deliberately NOT changed
 *
 * `patient_profiles.user_id` and the `patient_medical.profile_id` behind it
 * keep ON DELETE CASCADE. Those hold the *account holder's own* demographics,
 * not a patient's clinical record — they are the account, and they belong with
 * it when one is genuinely purged. The clinical record is independent of them:
 * it hangs off `patients`, whose identity fields (name, birthdate, contact) are
 * its own columns. Retention is served by the `patients` row plus the six keys
 * above, and account closure no longer reaches any of this anyway, because
 * SoftDeletes on User means the cascade never fires (see the next migration).
 */
return new class extends Migration
{
    /**
     * table => [column => foreign key name]
     *
     * @var array<string, array<string, string>>
     */
    private const KEYS = [
        'patient_allergies' => [
            'user_id' => 'patient_allergies_user_id_foreign',
            'recorded_by' => 'patient_allergies_recorded_by_foreign',
        ],
        'patient_diagnoses' => [
            'user_id' => 'patient_diagnoses_user_id_foreign',
            'recorded_by' => 'patient_diagnoses_recorded_by_foreign',
        ],
        'patient_documents' => [
            'user_id' => 'patient_documents_user_id_foreign',
            'uploaded_by' => 'patient_documents_uploaded_by_foreign',
        ],
    ];

    public function up(): void
    {
        foreach (self::KEYS as $table => $columns) {
            foreach ($columns as $column => $foreignKey) {
                // Order matters: MySQL will not alter a column out from under a
                // constraint that references it, so the key is dropped first,
                // the column widened to accept NULL, and the key rebuilt.
                Schema::table($table, function (Blueprint $blueprint) use ($foreignKey) {
                    $blueprint->dropForeign($foreignKey);
                });

                Schema::table($table, function (Blueprint $blueprint) use ($column) {
                    $blueprint->unsignedBigInteger($column)->nullable()->change();
                });

                Schema::table($table, function (Blueprint $blueprint) use ($column, $foreignKey) {
                    $blueprint->foreign($column, $foreignKey)
                        ->references('id')
                        ->on('users')
                        ->nullOnDelete();
                });
            }
        }
    }

    /**
     * Reverting restores the cascade, and with it the data-loss path this
     * migration exists to close. Rows whose owning account has already been
     * detached carry NULL, which the NOT NULL column cannot hold — so those are
     * dropped rather than silently blocking the rollback, and the loss is
     * exactly the loss `down()` is asking for.
     */
    public function down(): void
    {
        foreach (self::KEYS as $table => $columns) {
            foreach ($columns as $column => $foreignKey) {
                Schema::table($table, function (Blueprint $blueprint) use ($foreignKey) {
                    $blueprint->dropForeign($foreignKey);
                });

                DB::table($table)->whereNull($column)->delete();

                Schema::table($table, function (Blueprint $blueprint) use ($column) {
                    $blueprint->unsignedBigInteger($column)->nullable(false)->change();
                });

                Schema::table($table, function (Blueprint $blueprint) use ($column, $foreignKey) {
                    $blueprint->foreign($column, $foreignKey)
                        ->references('id')
                        ->on('users')
                        ->cascadeOnDelete();
                });
            }
        }
    }
};
