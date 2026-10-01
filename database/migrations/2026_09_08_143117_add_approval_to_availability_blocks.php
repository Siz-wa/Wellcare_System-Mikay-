<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9 — the duty roster becomes something the clinic agrees to, not
 * something a doctor asserts.
 *
 * Before this, Doctor\AvailabilityController wrote bookable hours straight into
 * `availability_blocks` with immediate effect and no oversight at all. A real
 * clinic agrees duty hours: the doctor states when they can attend, the clinic
 * commits to those hours and publishes them. That is what `approval_status`
 * models.
 *
 * ⚠️ THE DEFAULT IS `published`, AND THAT IS LOAD-BEARING.
 *
 * BookingService only generates slots from published blocks. Ninety-nine blocks
 * already exist in the development database and more in any deployed one; if
 * this column defaulted to `pending`, every one of them would stop generating
 * slots the moment the migration ran and the entire appointment system would go
 * dark with no error anywhere. The default covers rows written by any code path
 * that predates this phase; the explicit backfill below covers the rows already
 * on disk. Both are needed — the default alone does not touch existing rows on
 * MySQL when the column is added as NOT NULL with a default.
 *
 * Time-off blocks (`is_available = false`) are published on creation too, and
 * deliberately skip approval entirely — see AvailabilityService::addTimeOff().
 * A doctor who cannot attend must be able to close the day immediately; making
 * a safety cancellation wait on an administrator is the wrong failure mode.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('availability_blocks', function (Blueprint $table) {
            $table->enum('approval_status', ['draft', 'pending', 'published'])
                ->default('published')
                ->after('is_available');

            $table->timestamp('submitted_at')->nullable()->after('approval_status');

            $table->foreignId('approved_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->string('review_remarks', 255)->nullable()->after('approved_at');

            // BookingService filters on (doctor_id, approval_status) for every
            // slot lookup, twice per request.
            $table->index(['doctor_id', 'approval_status']);
        });

        // Everything that existed before this phase was, by definition, live.
        DB::table('availability_blocks')->update(['approval_status' => 'published']);
    }

    public function down(): void
    {
        Schema::table('availability_blocks', function (Blueprint $table) {
            $table->dropIndex(['doctor_id', 'approval_status']);
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn([
                'approval_status',
                'submitted_at',
                'approved_at',
                'review_remarks',
            ]);
        });
    }
};
