<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patient_medical', function (Blueprint $table) {
            $table->foreign(['profile_id'], 'fk_patient_medical_profile')->references(['id'])->on('patient_profiles')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_medical', function (Blueprint $table) {
            $table->dropForeign('fk_patient_medical_profile');
        });
    }
};
