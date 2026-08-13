<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Other" is an honest answer, but on its own it tells the clinic nothing.
 * A guarantor who picks it is asked to say what the relationship actually is —
 * guardian, grandchild, in-law, ward — and that free text lands here.
 *
 * Kept separate from `relationship_to_guarantor` because that column is an ENUM
 * and the whole point of this one is that the set is open.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('relationship_note', 60)
                ->nullable()
                ->after('relationship_to_guarantor');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('relationship_note');
        });
    }
};
