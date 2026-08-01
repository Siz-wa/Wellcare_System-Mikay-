<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The clinic's documented rule: "Each doctor has a limited schedule of up
     * to five patients per day."
     *
     * Until now nothing enforced it — availability_blocks generate slots purely
     * from start/end time and slot length, so a 09:00–17:00 block at 30 minutes
     * offered 16 bookable slots, not 5.
     *
     * Stored per doctor rather than as a constant so the number is adjustable
     * from the doctor's own availability page, with 5 as the default. It lives
     * on the profile and not on availability_blocks because the cap is per
     * DAY — putting it on a block would double it whenever a day has two.
     */
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_patients_per_day')
                ->default(5)
                ->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->dropColumn('max_patients_per_day');
        });
    }
};
