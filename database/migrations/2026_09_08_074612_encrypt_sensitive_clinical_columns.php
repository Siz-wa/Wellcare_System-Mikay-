<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SC-5 — application-level encryption of the highest-value SPI.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §1.2 and §2.4 (E-1). Before this, every column
 * below was plaintext in MySQL: a single `SELECT` returned named conditions
 * against named people, the clinical narrative of every consultation, and every
 * insurance member number the clinic holds.
 *
 * ## What is encrypted, and what deliberately is not
 *
 * Encrypted here: the narrative and identifying-value columns — diagnosis text
 * and ICD code, the SOAP note, allergen and reaction, lab notes and results,
 * prescription names and instructions, HMO member numbers, and the free-text
 * complaint a patient types at booking.
 *
 * NOT encrypted, on purpose:
 *
 * • Anything the application filters or sorts on in SQL. `LIKE` over ciphertext
 *   does not fail — it silently returns nothing — so encrypting a searched
 *   column produces a screen that looks like it works and finds no patients.
 *   Every candidate column was audited for query use first; `lab_test_results.
 *   test_name` stayed plaintext for exactly this reason (LabReviewController
 *   searches it), while its `notes` and `interpretation` are encrypted.
 *
 * • `loa_requests.remarks`. It is audited into `activity_log`, and Spatie reads
 *   attributes THROUGH the cast — so an encrypted-but-audited column writes its
 *   plaintext into a second table and achieves nothing but a false sense of
 *   cover. Either the column or the audit entry has to go; the audit entry
 *   (why HR rejected an LOA) has real value and the remark is administrative
 *   rather than clinical, so it stays as it is. Every column encrypted below
 *   was checked against its model's activityLogAttributes() for this.
 *
 * ## Widen before encrypting
 *
 * Ciphertext is far longer than its input — a 10-character member number
 * becomes a few hundred bytes — so every varchar involved is widened to TEXT
 * first. Doing it the other way round silently truncates, and a truncated
 * ciphertext is unrecoverable.
 *
 * ## ⚠️ APP_KEY is now load-bearing
 *
 * From here on, losing APP_KEY means losing every column below. That is the
 * risk ND-8 exists to force a decision about, and it is mitigated in two
 * places rather than accepted:
 *
 *   • AppServiceProvider::configureProductionSafety() refuses to boot in
 *     production without a key.
 *   • config/app.php supports APP_PREVIOUS_KEYS, so the key can be rotated
 *     without a downtime migration — new writes use the current key, old rows
 *     still decrypt under a previous one.
 *
 * `down()` decrypts in place and narrows the columns back, so this is
 * reversible while the key is still available.
 */
return new class extends Migration
{
    /**
     * table => [columns], with the varchar length to restore on rollback.
     *
     * @var array<string, array<string, int|null>>
     */
    private const COLUMNS = [
        'patient_diagnoses' => ['diagnosis' => 255, 'icd_code' => 255, 'notes' => null],
        'patient_allergies' => ['allergen' => 255, 'reaction' => 255, 'notes' => null],
        'consultation_sessions' => ['subjective' => null, 'objective' => null, 'assessment' => null, 'plan' => null],
        'consultation_prescriptions' => ['name' => 255, 'instructions' => 255],
        'lab_test_results' => ['notes' => null, 'interpretation' => null],
        'lab_result_parameters' => ['result' => 255],
        'patients' => ['hmo_id' => 20],
        'appointments' => ['hmo_id' => 20, 'additional_info' => null],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $table => $columns) {
            // Widen first. A varchar(20) cannot hold an encrypted member number,
            // and MySQL would truncate rather than complain.
            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                foreach ($columns as $column => $length) {
                    if ($length !== null) {
                        $blueprint->text($column)->nullable()->change();
                    }
                }
            });

            $this->transform($table, array_keys($columns), encrypt: true);
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNS as $table => $columns) {
            $this->transform($table, array_keys($columns), encrypt: false);

            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                foreach ($columns as $column => $length) {
                    if ($length !== null) {
                        $blueprint->string($column, $length)->nullable()->change();
                    }
                }
            });
        }
    }

    /**
     * Rewrite every non-null value in the named columns.
     *
     * Chunked by id rather than loaded whole: these are the largest text columns
     * in the schema and a clinic's full diagnosis history does not belong in one
     * PHP array.
     *
     * Idempotent in both directions. Encrypting checks whether a value already
     * decrypts and leaves it alone if so; decrypting leaves alone anything that
     * does not. So a migration interrupted half way can simply be run again —
     * which matters, because the failure mode of getting this wrong twice is
     * double-encrypted data.
     *
     * @param  array<int, string>  $columns
     */
    private function transform(string $table, array $columns, bool $encrypt): void
    {
        DB::table($table)->orderBy('id')->chunkById(200, function ($rows) use ($table, $columns, $encrypt) {
            foreach ($rows as $row) {
                $updates = [];

                foreach ($columns as $column) {
                    $value = $row->{$column} ?? null;

                    if ($value === null || $value === '') {
                        continue;
                    }

                    $isEncrypted = $this->looksEncrypted($value);

                    if ($encrypt && ! $isEncrypted) {
                        $updates[$column] = Crypt::encryptString($value);
                    } elseif (! $encrypt && $isEncrypted) {
                        $updates[$column] = Crypt::decryptString($value);
                    }
                }

                if ($updates !== []) {
                    DB::table($table)->where('id', $row->id)->update($updates);
                }
            }
        });
    }

    private function looksEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (Throwable) {
            return false;
        }
    }
};
