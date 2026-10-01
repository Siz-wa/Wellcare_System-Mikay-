<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * GV-9 — an initial password set by somebody else must not stay in use.
 *
 * See WELLCARE-GOVERNANCE-PLAN.md §4 (GV-9) and §6.1.
 *
 * ## The gap this closes
 *
 * GV-1 removed the administrator's ability to set a password on an account that
 * already has an owner. It could not remove the *initial* password on a staff
 * account being provisioned — somebody has to set the first one, and the
 * administrator creating the account is the only candidate.
 *
 * So there is a window, by construction, in which two people know a credential:
 * the administrator who typed it and the staff member it was handed to. This
 * column closes that window at the staff member's first sign-in rather than
 * leaving it open for the life of the account.
 *
 * It also covers the seeded demo accounts, which ship with a known password in
 * `AdminSeeder` and `GovernanceSeeder` — the OWASP A07 half of the GV-9 finding.
 *
 * ## Why a boolean and not `password_changed_at`
 *
 * A timestamp looks more informative and answers a question nobody asks. The
 * only thing any caller needs to know is "must this person change it now", and
 * a nullable timestamp forces every reader to re-derive that from a policy
 * (changed within how long? never changed but self-registered?). `users` also
 * already carries `updated_at`, which moves on a password change, so the
 * forensic value of a second timestamp is close to nil.
 *
 * Default FALSE, which is the safe direction here: the flag GRANTS an
 * obligation rather than an access, so an account that somehow misses it is
 * inconvenienced-nothing rather than locked out. Accounts predating this
 * migration are therefore untouched — they are existing staff who have been
 * using their own passwords, not freshly provisioned ones.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')
                ->default(false)
                ->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('must_change_password');
        });
    }
};
