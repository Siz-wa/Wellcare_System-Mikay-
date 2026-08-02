<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * users.is_active — the mechanism behind Figure 4's
     * "Deactivate/Reactivate Acc" admin flow.
     *
     * Deliberately a flag on `users` rather than a soft delete: a deactivated
     * account must keep its appointments, LOAs and medical history intact and
     * queryable. Deleting the row would fire `nullOnDelete()` across
     * appointments.user_id and patients.guarantor_id, silently orphaning the
     * medical records the system exists to protect.
     *
     * Enforced in two places — Fortify's authenticateUsing() blocks a new
     * login, EnsureUserIsActive middleware boots an already-open session.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('email');

            // The admin user list filters on this on every request.
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropColumn('is_active');
        });
    }
};
