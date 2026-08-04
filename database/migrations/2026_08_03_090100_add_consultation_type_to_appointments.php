<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — the patient chooses in-person or virtual while booking.
 *
 * This is a NEW column, not a change to `appointments.status`, and the
 * distinction matters. `status` is a MySQL ENUM that a STORED generated column
 * (`active_slot_key`, from 2026_07_19_120100) references in its expression, with
 * a unique index on top; redeclaring it means dropping and rebuilding that
 * dependency chain. `consultation_type` is orthogonal to the state machine — a
 * virtual appointment moves through exactly the same
 * requested → confirmed → checked_in → in_progress → completed path — so a
 * plain `Schema::table()` add is both sufficient and safe.
 *
 * Default `in_person` backfills every existing row correctly: all 100 of them
 * were booked before virtual consultation existed. No data migration needed,
 * unlike 2026_07_31_045858 which had to derive LOA rows into a new table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->enum('consultation_type', ['in_person', 'virtual'])
                ->default('in_person')
                ->after('service');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('consultation_type');
        });
    }
};
