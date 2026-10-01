<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Provenance for the six vitals columns — who measured them, and how.
 *
 * The virtual consultation room shows the doctor the same six fields as the
 * in-person session editor (BP, HR, temp, SpO2, weight, height), and a doctor
 * on a video call can measure exactly none of them. Every number recorded in a
 * video visit is something the patient read off their own cuff, thermometer,
 * scale or oximeter — which is normal, accepted telemedicine practice, but only
 * on the condition that the record says so. The standing rule in telehealth
 * documentation is that patient-supplied readings must be identified as such
 * ("self-reported blood pressure is 120/80"), because a bare `120/80` in the
 * chart is indistinguishable from one a nurse took with a cuff.
 *
 * Until this column existed, this table could not tell those two apart. Both
 * paths wrote the same plain string into `blood_pressure`.
 *
 * `not_obtained` sits in the same enum rather than in a column of its own. It
 * is not literally a "source", but it answers the same question the source
 * answers — where did this number come from — with "nowhere, and deliberately
 * so". Keeping it here means one control in the UI and one column to read, and
 * it separates the two things an empty vitals field used to conflate: the
 * patient had no thermometer, versus the doctor never filled the form in.
 *
 * NULLABLE WITH NO BACKFILL, and that is the point. Every existing row predates
 * the column, so its provenance is genuinely unknown. Defaulting them to
 * `clinic_measured` would be cheap and would write a clinical claim this
 * migration cannot support — that someone measured these with an instrument —
 * across rows that include virtual visits. NULL reads as "source not recorded",
 * which is the truth. New rows get a source from
 * ConsultationSessionService::noteAttributes(), defaulted from the session mode.
 *
 * A plain ENUM is safe to add here, unlike `appointments.status`: nothing
 * generated, indexed or unique depends on this column, so a later value only
 * costs a redeclaring migration (see the pending_hmo one) and nothing else.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_sessions', function (Blueprint $table) {
            $table->enum('vitals_source', [
                'clinic_measured',
                'patient_reported',
                'home_device',
                'not_obtained',
            ])->nullable()->after('height');
        });
    }

    public function down(): void
    {
        Schema::table('consultation_sessions', function (Blueprint $table) {
            $table->dropColumn('vitals_source');
        });
    }
};
