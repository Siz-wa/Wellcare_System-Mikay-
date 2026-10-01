<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A lower age limit for services, alongside the existing upper one.
 *
 * With only `max_age`, an 8-year-old girl was offered OB-Gyne and the adult
 * Internal Medicine clinic. The two seeded services that are adult-only get a
 * floor here; an administrator can change either on the Services screen.
 *
 * `restricted_to_sex` also accepts `male` from now on (validated in
 * SaveServiceRequest); the column is a plain string, so no schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_age')->nullable()->after('max_age');
        });

        DB::table('services')->where('slug', 'internal-medicine')->whereNull('min_age')->update(['min_age' => 18]);
        DB::table('services')->where('slug', 'ob-gyne')->whereNull('min_age')->update(['min_age' => 12]);
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('min_age');
        });
    }
};
