<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add appointment_id to patient_allergies.
     *
     * patient_allergies was originally created without appointment_id,
     * unlike patient_diagnoses and patient_documents which have it.
     * This column is needed to scope old allergy records to their correct
     * patient when multiple patients share the same guarantor account.
     *
     * It is nullable — allergies don't require an appointment link,
     * but when recorded during a session the appointment_id will be set.
     */
    public function up(): void
    {
        Schema::table('patient_allergies', function (Blueprint $table) {
            $table->foreignId('appointment_id')
                ->nullable()
                ->after('user_id')
                ->constrained('appointments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('patient_allergies', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropColumn('appointment_id');
        });
    }
};
