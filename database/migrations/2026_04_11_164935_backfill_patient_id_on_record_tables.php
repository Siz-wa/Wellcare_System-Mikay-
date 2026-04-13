<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Two fixes:
     *
     * 1. Backfill patient_id on patient_allergies, patient_diagnoses,
     *    patient_documents for records that were created before the patients
     *    table existed (they have user_id but patient_id = NULL).
     *
     *    Strategy: find the Patient whose guarantor_id matches the record's
     *    user_id. If exactly one patient exists for that user, link them.
     *    If multiple exist (user booked for several people), we can't
     *    auto-resolve — leave as NULL and the doctor will see them under
     *    the correct patient going forward.
     *
     * 2. No schema change — just data backfill.
     */
    public function up(): void
    {
        foreach (['patient_allergies', 'patient_diagnoses', 'patient_documents'] as $table) {
            if (! \Schema::hasTable($table)) continue;
            if (! \Schema::hasColumn($table, 'patient_id')) continue;

            // For each record missing patient_id, try to find the patient
            DB::table($table)
                ->whereNull('patient_id')
                ->whereNotNull('user_id')
                ->orderBy('id')
                ->chunk(100, function ($records) use ($table) {
                    foreach ($records as $record) {
                        // Find patients whose guarantor is this user
                        $patients = DB::table('patients')
                            ->where('guarantor_id', $record->user_id)
                            ->get(['id']);

                        // Only auto-link if there's exactly one patient for this user
                        // (unambiguous — the user only ever booked for themselves)
                        if ($patients->count() === 1) {
                            DB::table($table)
                                ->where('id', $record->id)
                                ->update(['patient_id' => $patients->first()->id]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        // Non-destructive backfill — no rollback needed
    }
};