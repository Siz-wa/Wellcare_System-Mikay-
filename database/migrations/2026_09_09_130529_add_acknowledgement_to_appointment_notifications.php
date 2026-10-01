<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Task 1.3 — close the loop on a critical result.
 *
 * ## What was missing
 *
 * The routing was already right: `LabResultService::notifyRequestingDoctor()`
 * raises a `lab_critical` notification to the doctor who ordered the test at the
 * moment the nurse records it, and the patient is told only after a clinician
 * has reviewed it. That sequencing is correct and stays.
 *
 * What the schema could not express is whether anyone ever SAW it. `read` was a
 * bare boolean — no timestamp, so "when" was unanswerable — and nothing in the
 * codebase escalated an unseen alert. A critical potassium result could sit
 * unread indefinitely and the system would report exactly the same state as one
 * acted on within a minute.
 *
 * The Joint Commission's Quick Safety 52 defines closed-loop communication as a
 * result that is "sent, received, acknowledged, and acted upon". This adds the
 * third of those.
 *
 * ## Why acknowledged is separate from read
 *
 * Opening the bell is not the same act as taking responsibility for a critical
 * value, and collapsing them would make the audit trail claim something it
 * cannot support. `read_at` records that the notification was displayed;
 * `acknowledged_at` records that a clinician explicitly accepted it. Only
 * `lab_critical` requires the second, and only the second stops the escalation.
 *
 * ## Backfill
 *
 * Existing rows already carry `read` as a boolean with no time attached. They
 * are backfilled to `updated_at` — the closest thing to a moment the row
 * changed — rather than to `now()`, which would claim every historical
 * notification was read the instant this migration ran.
 *
 * `read` is deliberately KEPT rather than replaced. It is written by fourteen
 * ::create() sites and read by the bell's unread count in
 * HandleInertiaRequests; dropping it in the same change that adds timestamps
 * would put a schema migration and a behaviour migration in one irreversible
 * step. The boolean stays as the flag, the timestamp answers "when".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_notifications', function (Blueprint $table) {
            $table->timestamp('read_at')->nullable()->after('read');

            // Null on every row that does not require acknowledgement, which is
            // most of them — this is not "unacknowledged", it is "not asked".
            $table->timestamp('acknowledged_at')->nullable()->after('read_at');
            $table->foreignId('acknowledged_by')
                ->nullable()
                ->after('acknowledged_at')
                ->constrained('users')
                ->nullOnDelete();

            // How many times the escalation sweep has re-raised this alert.
            // Bounded escalation: a sweep that re-notified forever would train
            // people to mute the one channel that must not be muted.
            $table->unsignedTinyInteger('escalation_count')->default(0)->after('acknowledged_by');
            $table->timestamp('escalated_at')->nullable()->after('escalation_count');

            // The sweep's query: unacknowledged criticals, oldest first.
            $table->index(['type', 'acknowledged_at', 'created_at'], 'notifications_escalation_idx');
        });

        // Historical rows: a read notification was read at some point, and the
        // last time the row changed is the only evidence available.
        DB::table('appointment_notifications')
            ->where('read', true)
            ->whereNull('read_at')
            ->update(['read_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('appointment_notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_escalation_idx');
            $table->dropConstrainedForeignId('acknowledged_by');
            $table->dropColumn([
                'read_at',
                'acknowledged_at',
                'escalation_count',
                'escalated_at',
            ]);
        });
    }
};
