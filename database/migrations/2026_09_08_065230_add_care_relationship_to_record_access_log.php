<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-2's break-glass flag.
 *
 * See WELLCARE-COMPLIANCE-PLAN.md §2.2, A-1, and the PatientPolicy docblock.
 *
 * A-1 was that any doctor could read any chart. The obvious fix — deny unless a
 * care relationship exists — is the wrong first move for a clinic: a doctor
 * covering a colleague's list overnight would meet a permission error, and a
 * control that gets disabled after the first such night has protected nobody.
 * The narrowing is also a clinical workflow decision (ND-2), not a developer's.
 *
 * So the policy still admits clinical staff, and this column records whether
 * they had a care relationship at the time. Out-of-relationship reads become
 * countable and reviewable — "break glass" — which is the state a hard denial
 * has to be argued from anyway. It also gives SC-8 something concrete to alert
 * on that is not merely request volume.
 *
 * NULL rather than false where the question does not apply: an index/search
 * with no patient in view, or an aggregate export. "Not asked" and "asked and
 * the answer was no" must not look the same in an audit table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('record_access_log', function (Blueprint $table) {
            $table->boolean('had_care_relationship')->nullable()->after('action');

            // The review query: out-of-relationship reads, newest first.
            $table->index(['had_care_relationship', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('record_access_log', function (Blueprint $table) {
            $table->dropIndex(['had_care_relationship', 'created_at']);
            $table->dropColumn('had_care_relationship');
        });
    }
};
