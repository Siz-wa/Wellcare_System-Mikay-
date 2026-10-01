<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * QA gap G-9: registration had no blood type, and civil status offered only
 * single, married and widowed — leaving out separated and annulled, both
 * common answers in the Philippines.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('blood_type', 3)->nullable()->after('civil_status');
        });

        if (DB::getDriverName() === 'mysql') {
            foreach (['patients', 'patient_profiles'] as $table) {
                DB::statement("ALTER TABLE {$table} MODIFY civil_status ENUM('single','married','widowed','separated','annulled') NULL");
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            foreach (['patients', 'patient_profiles'] as $table) {
                DB::table($table)->whereIn('civil_status', ['separated', 'annulled'])->update(['civil_status' => null]);
                DB::statement("ALTER TABLE {$table} MODIFY civil_status ENUM('single','married','widowed') NULL");
            }
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('blood_type');
        });
    }
};
