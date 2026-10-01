<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-1(a) — a recycle bin under the clinical record.
 *
 * See WELLCARE-COMPLIANCE-PLAN.md §2.6, RET-3.
 *
 * `Appointment`, `Patient`, `LabTestResult` and `LoaRequest` already soft-delete
 * and are restorable from the admin archive. These seven tables did not, so
 * `Doctor\PatientRecordController::destroyAllergy/destroyDiagnosis/destroyDocument`
 * were **hard** deletes: a mis-click removed a diagnosis from the database with
 * no undo and no trace (they were not audited either — that half is QW-3).
 *
 * A medical record carries a retention obligation, and a retention obligation
 * that any single request can defeat is not one. Everything here becomes
 * recoverable; §5's ND-6 supplies the period after which a genuine purge is
 * permitted, and `retain_until` (SC-1d) lands once that number is confirmed.
 */
return new class extends Migration
{
    /**
     * Tables that hold, or directly compose, a patient's clinical record.
     *
     * @var array<int, string>
     */
    private const TABLES = [
        'patient_allergies',
        'patient_diagnoses',
        'patient_documents',
        'consultation_sessions',
        'consultation_prescriptions',
        'patient_profiles',
        'patient_medical',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (Schema::hasColumn($table, 'deleted_at')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasColumn($table, 'deleted_at')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropSoftDeletes();
            });
        }
    }
};
