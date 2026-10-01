<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The doctor's public-facing profile — the half of a roster entry the clinic
 * does NOT decide.
 *
 * `doctor_profiles` already carries everything an administrator confers:
 * display name, specialty, whether the doctor is published. What it had no room
 * for was the person — a photograph, the languages they consult in, how long
 * they have practised. The result was a directory of coloured initials, and a
 * doctor who opened their own settings page saw a patient's form: first name,
 * civil status, birthdate. Nothing about their practice, and nothing about the
 * credentials the clinic holds on them.
 *
 * ── What may be published, and why the list is short ─────────────────────────
 *
 * The PRC Board of Medicine / PMA Code of Ethics restricts what a physician may
 * publish about themselves. Permitted: name, field of specialty, office hours,
 * office or hospital affiliation. NOT permitted: publishing "personal
 * superiority, special certificates or diplomas, postgraduate training,
 * specific methods of treatment, operative techniques", or soliciting patients
 * by advertisement.
 *
 * So `bio` is deliberately capped short and described in the UI as a factual
 * practice statement rather than a marketing biography, and there is no
 * column here for awards, ratings, testimonials or "years of excellence".
 * `practising_since` is a fact (a year), not a claim of superiority.
 *
 * The credentials themselves are NOT duplicated here. They live in
 * `staff_credentials`, are written only by CredentialingService, and only the
 * two a patient can independently verify — the PRC registration number and the
 * specialty board standing — are ever serialised to a public page. The PTR
 * number, the PhilHealth accreditation number and above all the PDEA/DDB S2
 * licence stay internal: an S2 number identifies a prescriber of dangerous
 * drugs and publishing one invites prescription fraud.
 *
 * ── Why the photograph has its own consent timestamp ─────────────────────────
 *
 * A licence number is published professional-registry data — PRC runs a public
 * verification portal precisely so a patient can check one. A photograph is
 * not: it is the doctor's likeness used for the clinic's publicity, which is
 * the case where NPC guidance points at consent rather than legitimate
 * interest under RA 10173. `photo_consent_at` records that the doctor
 * themselves agreed to it, and clearing it un-publishes the photograph
 * everywhere without deleting the file — the same withdraw-not-erase shape
 * `consents.withdrawn_at` uses for patients.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            // Path on the `local` (private) disk. Never a URL: the photograph
            // is served by a controller that re-checks publication and consent
            // on every request, so withdrawing consent takes effect at once
            // instead of when a CDN or a symlinked public directory forgets.
            $table->string('photo_path')->nullable()->after('color');

            // Null = the doctor has not agreed to their likeness being shown.
            // The file may still exist; nothing renders it.
            $table->timestamp('photo_consent_at')->nullable()->after('photo_path');

            // A short factual statement of practice. TEXT rather than a long
            // string only so the column does not have to move if the cap is
            // ever raised; the validator is what holds it to 600 characters.
            $table->text('bio')->nullable()->after('photo_consent_at');

            // "Filipino, English, Cebuano" — free text, because the languages
            // spoken in Cavite do not fit a closed list worth maintaining.
            $table->string('languages', 120)->nullable()->after('bio');

            // The year the doctor began practising. A YEAR column rather than a
            // computed "12 years of experience" string: the fact is the year,
            // and any number derived from it goes stale on its own.
            $table->year('practising_since')->nullable()->after('languages');
        });
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'photo_path',
                'photo_consent_at',
                'bio',
                'languages',
                'practising_since',
            ]);
        });
    }
};
