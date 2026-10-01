<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Task 2.1 — remember which reminders have already gone out.
 *
 * ## Why this is not derived
 *
 * The obvious implementation is to ask `appointment_notifications` whether a
 * `reminder` row already exists for this appointment. That is wrong here, and
 * silently so.
 *
 * `AppointmentNotification::booted()` returns false from `creating` — aborting
 * the insert — when the account has switched the in-app channel off for that
 * category. So for a patient who reads reminders by SMS and has turned the bell
 * off, no row is ever written, the derived check finds nothing, and the sweep
 * re-sends the same reminder every five minutes until the appointment passes.
 *
 * The thing being recorded is "the clinic has sent this", which is a fact about
 * the appointment rather than about any one channel. It belongs on the
 * appointment.
 *
 * ## Two columns rather than one
 *
 * The evidence supports two reminders rather than one — the meta-analysis of
 * appointment reminders finds a modest pooled benefit (RR 1.11), and a
 * randomised comparison found two beat one for patients at high risk of
 * missing. So the tiers are recorded separately: sending the day-of reminder
 * must not mark the 48-hour one as done, or a booking made inside the window
 * would suppress the reminder that was never sent.
 *
 * Nullable and null by default. An existing appointment has genuinely not been
 * reminded, and backfilling a timestamp would suppress the first real reminder
 * for every booking already in the table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // The ~48-hour-ahead reminder.
            $table->timestamp('reminded_ahead_at')->nullable()->after('hold_expires_at');

            // The morning-of reminder.
            $table->timestamp('reminded_same_day_at')->nullable()->after('reminded_ahead_at');
        });

        // No index is added here on purpose. The sweep filters on
        // (appointment_at, status), and 2026_09_09_115100 already created
        // exactly that index for the ordering fix. A second copy of it would
        // cost writes on every booking and buy nothing.
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['reminded_ahead_at', 'reminded_same_day_at']);
        });
    }
};
