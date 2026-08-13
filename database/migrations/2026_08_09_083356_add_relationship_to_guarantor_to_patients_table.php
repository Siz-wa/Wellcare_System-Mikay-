<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A WellCare account is a guarantor account: one login books for several people
 * (herself, her child, a parent). `patients.guarantor_id` already models who owns
 * the record, but not *how* they are related — so the booking gate had no way to
 * label "Myself" apart from "Juan (Child)".
 *
 * Nullable on purpose: every patient row seeded or created before this migration
 * predates the concept, and staff-created records may never have a guarantor at
 * all (guarantor_id is itself nullable).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->enum('relationship_to_guarantor', [
                'self', 'spouse', 'child', 'parent', 'sibling', 'other',
            ])->nullable()->after('guarantor_id');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('relationship_to_guarantor');
        });
    }
};
