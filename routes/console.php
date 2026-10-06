<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Hourly, because the thing it closes is a live audio/video channel.
 *
 * See CloseStaleConsultationRooms — an abandoned room stays joinable forever
 * otherwise. `withoutOverlapping()` matters here rather than being boilerplate:
 * the command ends each room through the service so the `bye` broadcast fires,
 * and two overlapping runs on a large backlog would each try to end the same
 * rows. endCall() is idempotent, so the duplicates are harmless — but the
 * broadcasts are not, and a peer would be told twice.
 *
 * Requires a scheduler process (`php artisan schedule:work`, or cron in
 * production). It is not part of `composer dev`, so on a local machine this is
 * documentation of intent until one is running.
 */
Schedule::command('consultations:close-stale')
    ->hourly()
    ->withoutOverlapping();

/**
 * Every fifteen minutes, because the thing it releases is a bookable slot.
 *
 * The settlement deadline defaults to three hours before the visit. Sweeping
 * hourly would leave a slot held for up to an hour after it was forfeited —
 * long enough, on a same-day booking, for the slot to become unbookable before
 * anyone could take it. Fifteen minutes keeps the released slot genuinely
 * available to the next patient.
 *
 * Cheap to run often: the query is an index scan over
 * (status, due_at) on payment_verifications and returns nothing at all most of
 * the time. `withoutOverlapping()` because two runs would both try to cancel
 * the same appointment, and the second would take the LogicException path and
 * report a skip that never happened.
 *
 * Honours `payments.auto_cancel_unsettled`: with that false the command reports
 * and changes nothing, so scheduling it is safe before the clinic has decided
 * how strict to be.
 */
Schedule::command('wellcare:payments:sweep')
    ->everyFifteenMinutes()
    ->withoutOverlapping();

/**
 * Close bookings whose date passed without the visit happening, so queues and
 * counts stop carrying them. See ExpireStaleAppointments for what each status
 * becomes.
 *
 * Hourly, not once at 00:30. It only touches dates before today, so running it
 * again finds nothing new and is cheap — but a once-a-night slot never fires on
 * a laptop that is off at night, which is every demo machine. Their HR
 * dashboards carried HMO approvals for visits ten days gone.
 */
Schedule::command('wellcare:appointments:expire-stale')
    ->hourly()
    ->withoutOverlapping();

/**
 * Retention housekeeping — SC-1(d) and ND-3 in WELLCARE-COMPLIANCE-PLAN.md.
 *
 * Note what is and is not scheduled here.
 *
 * The record purge is scheduled as a **report only** — no `--force`. It prints
 * which patient records have passed the retention period in config/retention.php
 * and removes nothing. A cron job that silently destroys medical records on a
 * timer is exactly the "cleanup job touching patient tables" the compliance
 * audit was looking for; a monthly note that a human then acts on is not.
 *
 * The audit-log clean IS destructive, and that asymmetry is deliberate: an
 * over-long access log is itself a privacy problem (it is a permanent record of
 * who read what about whom), and unlike a medical record nothing obliges the
 * clinic to keep it. Spatie's command reads `activitylog.delete_records_older_than_days`,
 * which config/activitylog.php derives from retention.audit_log_years.
 */
Schedule::command('wellcare:records:purge')
    ->monthlyOn(1, '03:00')
    ->withoutOverlapping();

Schedule::command('activitylog:clean --force')
    ->weeklyOn(1, '03:30')
    ->withoutOverlapping();

Schedule::command('wellcare:access-log:clean')
    ->weeklyOn(1, '03:45')
    ->withoutOverlapping();

/**
 * Credentialing housekeeping — Phase 9.
 *
 * Daily, and early, because the consequence is legal rather than cosmetic: a
 * PRC registration expires on the holder's birthday, and from that morning they
 * may not lawfully practise. Running at 02:00 means the lapse is reflected
 * before the clinic opens rather than at the end of the day they spent seeing
 * patients.
 *
 * Unlike the record purge above, this one IS allowed to act on its own. It
 * removes nothing and destroys nothing — it withdraws a clearance, which an
 * administrator can restore in one click by verifying a renewed licence. The
 * asymmetry with the purge is deliberate: the failure mode of acting here is a
 * doctor briefly unbookable, and the failure mode of not acting is an
 * unlicensed consultation.
 */
Schedule::command('credentials:sweep')
    ->dailyAt('02:00')
    ->withoutOverlapping();

/**
 * Proof that the scheduler itself is alive — task 0.2.
 *
 * Every command above fails silently. If cron was never installed, or the
 * supervised worker died, or the server rebooted and nobody noticed, none of
 * them error: they simply stop happening. The credential sweep quietly stops
 * unpublishing lapsed licences and nothing on any screen changes.
 *
 * This writes a timestamp every five minutes. `wellcare:scheduler:status` reads
 * it and exits non-zero when it is stale, so a monitor — or a person, before
 * go-live — can tell a working scheduler from one that stopped in March.
 *
 * Five minutes rather than every minute: frequent enough that a 30-minute
 * staleness threshold is unambiguous, infrequent enough that it is not writing
 * to the cache table 1,440 times a day for no reason.
 *
 * ── A scheduler process must exist for ANY of this to run ───────────────────
 *
 * On a development machine this is handled: `composer dev` now runs
 * `php artisan schedule:work` alongside serve, queue, vite and reverb, so
 * everything in this file runs whenever the app is running. Nothing to install.
 *
 * In production `schedule:work` is a foreground process and will not survive a
 * reboot on its own, so the host needs one of these instead:
 *
 *   Linux (cron), the usual production setup — one line in crontab:
 *     * * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
 *
 *   Windows (Task Scheduler), which is what an XAMPP box needs — a task
 *   repeating every 1 minute, running:
 *     php artisan schedule:run
 *   with "Start in" set to the project directory.
 *
 *   Any host, supervised long-running process — kept alive by systemd,
 *   supervisor, or NSSM on Windows:
 *     php artisan schedule:work
 *
 * Whichever is chosen, `wellcare:scheduler:status` reports whether it is
 * actually alive and exits non-zero when it is not — so a scheduler that dies
 * in production is a failed check rather than months of silence.
 */
Schedule::command('wellcare:scheduler:heartbeat')
    ->everyFiveMinutes()
    ->withoutOverlapping();

/**
 * Task 1.3 — re-raise critical lab results nobody has acknowledged.
 *
 * Every five minutes, and that cadence is the point: the escalation threshold
 * is fifteen minutes, so a sweep any slower would make the real wait closer to
 * thirty. The command is cheap when there is nothing to do — one indexed query
 * against `notifications_escalation_idx` returning no rows.
 *
 * `withoutOverlapping()` because escalating increments a counter and sends
 * messages; two concurrent passes over the same backlog would double-notify and
 * burn through MAX_ESCALATIONS twice as fast.
 */
Schedule::command('wellcare:results:escalate')
    ->everyFiveMinutes()
    ->withoutOverlapping();

/**
 * Task 2.1 — appointment reminders.
 *
 * Every fifteen minutes rather than hourly. The 48-hour tier accepts anything
 * between 36 and 48 hours out, so an hourly sweep would still catch it — but the
 * same-day tier is time-of-day sensitive, and a patient reminded at 09:00 for an
 * 09:30 appointment has been reminded too late to act on it.
 *
 * `withoutOverlapping()` because the command stamps the appointment before
 * sending; two concurrent passes over the same window would both read it
 * unstamped and double-send.
 */
Schedule::command('wellcare:reminders:send')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
