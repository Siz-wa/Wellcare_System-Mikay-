<?php

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9 — the clinic's credentialing file.
 *
 * One row per clinical staff account (doctor, nurse). Models what a Philippine
 * clinic and laboratory actually has to hold on file before a professional may
 * see a patient:
 *
 *   • PRC registration — Professional Regulation Commission. Every physician,
 *     nurse and medical technologist holds one. Valid three years, expiring on
 *     the holder's birthday. Practising on a lapsed PRC is illegal, which is
 *     why `credentials:sweep` unpublishes on expiry rather than merely warning.
 *   • PTR — Professional Tax Receipt, annual, from the LGU where they practise
 *     (here Dasmariñas). Non-payment is itself grounds for PRC action.
 *   • Specialty board — a specialty is not self-declared. PhilHealth accredits
 *     a specialist on a Diplomate or Fellow certificate from a Philippine
 *     Specialty Board, so the board and the rank are recorded before the
 *     clinic confers the specialty.
 *   • PhilHealth accreditation — required to file claims.
 *   • Annual medical certificate — DOH AO 2021-0037 requires one, with Hepatitis
 *     B and influenza immunisation, for clinical laboratory personnel.
 *
 * ── Why these columns are NOT encrypted ──────────────────────────────────────
 * 2026_09_08_074612_encrypt_sensitive_clinical_columns encrypts patient
 * clinical data. These columns are deliberately excluded and stored in plain
 * text. A PRC licence number is a *public professional registry* identifier —
 * PRC publishes a verification portal precisely so anyone can check one — and
 * it is not health information about a patient. It also has to be searchable
 * and indexable, which an encrypted column cannot be. RA 10173 governs personal
 * information handling here, not secrecy of a published licence number.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_credentials', function (Blueprint $table) {
            $table->id();

            // Unique: one credentialing file per account, so the record can be
            // reached as `$user->credential` rather than "the newest one".
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();

            // ── PRC (Professional Regulation Commission) ──────────────────────
            $table->string('prc_license_no', 40)->nullable();
            $table->date('prc_expires_on')->nullable();

            // ── PTR (Professional Tax Receipt), annual, per LGU ───────────────
            $table->string('ptr_no', 40)->nullable();
            $table->string('ptr_issued_at_lgu', 120)->nullable();
            $table->date('ptr_expires_on')->nullable();

            // ── Optional professional registrations ───────────────────────────
            $table->string('philhealth_accreditation_no', 40)->nullable();
            // PDEA/DDB S2, only meaningful for prescribers of dangerous drugs.
            $table->string('s2_license_no', 40)->nullable();

            // ── Specialty board standing ──────────────────────────────────────
            $table->string('specialty_board', 150)->nullable();
            $table->enum('board_status', BoardStatus::values())
                ->default(BoardStatus::None->value);

            // DOH AO 2021-0037 — annual medical certificate + immunisation.
            $table->date('medical_certificate_on')->nullable();

            // ── Verification decision ─────────────────────────────────────────
            $table->enum('status', CredentialStatus::values())
                ->default(CredentialStatus::Pending->value);
            $table->foreignId('verified_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // credentials:sweep reads exactly this pair every night.
            $table->index(['status', 'prc_expires_on']);
            $table->index('ptr_expires_on');
        });

        $this->backfillExistingClinicalStaff();
    }

    /**
     * Give every clinical account that already exists a verified file.
     *
     * Without this the module goes live with 35 seeded doctors and 2 nurses in
     * `pending`, and the booking gate added in this same phase would unpublish
     * all of them — the whole appointment system would go dark on deploy. They
     * were credentialed before this table existed; the table is catching up to
     * them, not re-adjudicating them.
     *
     * Deliberately raw DB inserts: an Eloquent model referenced from a
     * migration breaks the moment that model changes shape later.
     */
    private function backfillExistingClinicalStaff(): void
    {
        $staffIds = DB::table('users')
            ->join('model_has_roles', function ($join) {
                $join->on('model_has_roles.model_id', '=', 'users.id')
                    ->where('model_has_roles.model_type', '=', 'App\Models\User');
            })
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->whereIn('roles.name', ['doctor', 'nurse'])
            ->whereNull('users.deleted_at')
            ->pluck('users.id');

        if ($staffIds->isEmpty()) {
            return;
        }

        $now = now();

        DB::table('staff_credentials')->insert(
            $staffIds->map(fn (int $id) => [
                'user_id' => $id,
                'status' => CredentialStatus::Verified->value,
                'board_status' => BoardStatus::None->value,
                // No verifier and no licence number: nobody actually checked
                // these, and inventing a PRC number would put fabricated
                // regulatory data in the record. StaffCredentialSeeder fills
                // realistic values on a fresh seed; on an existing database
                // these read as "carried over, details outstanding".
                'verified_at' => $now,
                'remarks' => 'Carried over when credentialing was introduced. '
                    .'Licence details still to be recorded.',
                'created_at' => $now,
                'updated_at' => $now,
            ])->all()
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_credentials');
    }
};
