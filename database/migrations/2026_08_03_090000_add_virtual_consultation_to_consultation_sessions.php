<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — virtual consultation. Extends the existing in-person SOAP-note row
 * into the record of a video call, rather than adding a parallel table.
 *
 * The ERD (Fig. 7) models a `virtual consultation` entity with `appointment id`,
 * `meeting link`, `platform`, `doctor notes` and `consultation status`. Three of
 * those already exist here: `appointment_id`, the SOAP fields are the doctor
 * notes, and there is already exactly one row per appointment. Creating a second
 * table would have split one visit's clinical record across two rows joined on
 * the same key, so this migration adds the missing columns instead and the ERD
 * entity maps onto `consultation_sessions`.
 *
 * `consultation_sessions.appointment_id` is UNIQUE, so `room_id` inherits "one
 * room per appointment". That is deliberate — see ConsultationSessionService.
 *
 * Note what is NOT touched: `appointments.status`. That column is an ENUM with a
 * STORED generated column (`active_slot_key`) and a unique index depending on
 * it, so redeclaring it is a real operation. The call's lifecycle lives in its
 * own `consultation_status` column precisely so the appointment ENUM never has
 * to grow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_sessions', function (Blueprint $table) {
            // in_person is the default because every one of the existing rows
            // was an in-person visit. No backfill needed for that reason.
            $table->enum('mode', ['in_person', 'virtual'])
                ->default('in_person')
                ->after('doctor_id');

            // The channel key. Nullable because an in-person session never gets
            // one, unique because it is the sole lookup used by the broadcast
            // channel authorization — a duplicate would make `where('room_id')`
            // ambiguous at exactly the wrong moment.
            $table->char('room_id', 36)
                ->nullable()
                ->unique()
                ->after('mode');

            // The CALL's state, deliberately separate from `status` (the NOTE's
            // state). A dropped connection must not close the clinical record,
            // and a closed record must not leave a live channel behind. NULL
            // means "no call has ever been opened for this session".
            $table->enum('consultation_status', ['waiting', 'active', 'ended'])
                ->nullable()
                ->after('room_id');

            $table->timestamp('started_at')->nullable()->after('consultation_status');
            $table->timestamp('ended_at')->nullable()->after('started_at');

            // The ERD's `meeting link` and `platform`. Shipped as schema only:
            // Phase 3 builds in-app WebRTC, and these exist so the documented
            // external-link fallback needs a controller rather than a migration
            // if peer connections ever prove unreliable at the clinic.
            $table->string('meeting_link')->nullable()->after('ended_at');
            $table->string('platform')->nullable()->after('meeting_link');

            // The doctor's room list and the patient's join page both filter on
            // "is there a live call for me right now".
            $table->index(['consultation_status', 'mode'], 'consultation_sessions_live_index');
        });
    }

    public function down(): void
    {
        Schema::table('consultation_sessions', function (Blueprint $table) {
            $table->dropIndex('consultation_sessions_live_index');

            // room_id carries a unique index that must go before the column.
            $table->dropUnique(['room_id']);

            $table->dropColumn([
                'mode',
                'room_id',
                'consultation_status',
                'started_at',
                'ended_at',
                'meeting_link',
                'platform',
            ]);
        });
    }
};
