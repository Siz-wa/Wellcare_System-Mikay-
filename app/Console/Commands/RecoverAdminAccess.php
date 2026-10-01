<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\BreakGlassRecoveryNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\text;

/**
 * GV-10 — break-glass restoration of administrative access.
 *
 * See WELLCARE-GOVERNANCE-PLAN.md §4 (GV-10) and §6.1.
 *
 * ## What this is for
 *
 * `StaffAccountService::guardLastActiveAdmin()` refuses to remove the last
 * active administrator, and its own comment gives the reason: *"There is no
 * console recovery UI and no second admin by default, so removing the last
 * active admin bricks the module permanently."* That guard covers the routes.
 * It does not cover everything else that can leave a clinic locked out — an
 * administrator who loses their 2FA device, an account suspended by a
 * colleague during an incident, a demo database restored without one, a
 * `syncRoles` run by hand in tinker.
 *
 * This is the way back in. `wellcare:owner:create` is the *bootstrap* path;
 * this is the *recovery* path, and they are different situations: the first
 * runs when the system is new, the second when it is live and nobody can get in.
 *
 * ## What this deliberately is NOT
 *
 * It is **not** clinical break-glass. It does not grant, and must never grant,
 * an administrator access to a patient record. Whether an administrator may
 * ever read a chart is **GD-3 in §7 of the governance plan — an open decision
 * that belongs to the clinic's DPO and medical director**, and a console
 * command that quietly settled it would be a developer overruling a policy
 * question. The scope here is account access only.
 *
 * ## The controls on it
 *
 * Every property real break-glass procedures are expected to have (Yale's
 * published HIPAA procedure is the canonical public example; ONC
 * §170.315(d)(6); HIPAA §164.312(a)(2)(ii)):
 *
 *  - **A reason is mandatory** and is stored, not just prompted for. A blank or
 *    trivially short reason is refused.
 *  - **An operator is named.** Console has no authenticated user, so the person
 *    identifies themselves and the OS account is captured alongside as
 *    corroboration they did not type.
 *  - **It is loud.** The event goes to `activity_log` under the log name
 *    `emergency`, which the DPO dashboard surfaces separately from routine
 *    change history, and every owner and DPO is emailed.
 *  - **It refuses when it is not needed.** If an active administrator already
 *    exists, this is not an emergency, and the command says so and stops unless
 *    `--force` is given — which is itself recorded as part of the reason.
 *
 * ## Usage
 *
 *   php artisan wellcare:admin:recover
 *   php artisan wellcare:admin:recover --email=ana@wellcare.com --operator="Ana Reyes"
 */
class RecoverAdminAccess extends Command
{
    protected $signature = 'wellcare:admin:recover
                            {--email= : The account to restore administrative access to}
                            {--operator= : Who is performing this recovery}
                            {--force : Proceed even though an active administrator already exists}';

    protected $description = 'Break-glass: restore administrative access when nobody can sign in (records the reason)';

    /** A reason shorter than this is not a reason. */
    private const MIN_REASON_LENGTH = 15;

    public function handle(): int
    {
        $activeAdmins = User::role('admin')->active()->count();

        $this->newLine();
        $this->warn('╔═ BREAK-GLASS: ADMINISTRATIVE RECOVERY ═══════════════════════════╗');
        $this->line("  Active administrators right now: {$activeAdmins}");
        $this->line('  This grants ACCOUNT access only. It does not, and cannot,');
        $this->line('  grant access to any patient record.');
        $this->warn('╚══════════════════════════════════════════════════════════════════╝');
        $this->newLine();

        if ($activeAdmins > 0 && ! $this->option('force')) {
            $this->error('There is already at least one active administrator.');
            $this->line('This is not an emergency — ask them to make the change through');
            $this->line('/admin/users, where it is attributable to a signed-in person.');
            $this->newLine();
            $this->line('If they genuinely cannot be reached, re-run with --force.');
            $this->line('The override is recorded as part of the reason.');

            return self::FAILURE;
        }

        $email = $this->option('email') ?: text(
            label: 'Which account should regain administrative access?',
            placeholder: 'name@wellcare.com',
            required: true,
        );

        $user = User::withTrashed()->where('email', $email)->first();

        if (! $user) {
            $this->error("No account found for {$email}.");
            $this->line('To create a new top-level account instead, use:');
            $this->line('  php artisan wellcare:owner:create');

            return self::FAILURE;
        }

        // A closed account is a retention artefact, not a login. Reviving one
        // here would resurrect an identity somebody deliberately retired, and
        // User::closeAccount() has already scrubbed its credentials — so it
        // could not sign in anyway.
        if ($user->trashed()) {
            $this->error("The account for {$email} has been closed and cannot be revived.");
            $this->line('Create a new account with `php artisan wellcare:owner:create`.');

            return self::FAILURE;
        }

        $operator = $this->option('operator') ?: text(
            label: 'Who is performing this recovery? (your full name)',
            required: true,
        );

        $reason = text(
            label: 'Why is this necessary? This is recorded permanently.',
            placeholder: 'e.g. sole administrator lost their 2FA device, clinic cannot process LOAs',
            required: true,
            validate: fn (string $value) => strlen(trim($value)) < self::MIN_REASON_LENGTH
                ? 'Please give a real reason — at least '.self::MIN_REASON_LENGTH.' characters.'
                : null,
        );

        $this->newLine();
        $this->line('About to:');
        $this->line("  • grant the <options=bold>admin</> role to {$user->email}");
        if (! $user->is_active) {
            $this->line('  • reactivate the account, which is currently suspended');
        }
        $this->line('  • record this in the emergency audit log');
        $this->line('  • email every System Owner and Data Protection Officer');
        $this->newLine();

        if (! confirm(label: 'Proceed?', default: false)) {
            $this->line('Cancelled. Nothing was changed.');

            return self::SUCCESS;
        }

        $wasActive = (bool) $user->is_active;
        $previousRole = $user->getRoleNames()->first() ?? 'none';

        DB::transaction(function () use ($user): void {
            $user->syncRoles(['admin']);
            $user->update(['is_active' => true]);
        });

        $this->recordEmergencyAccess($user, $operator, $reason, $previousRole, $wasActive);
        $this->notifyOversight($user, $operator, $reason);

        $this->newLine();
        $this->info("✓ {$user->email} now holds the admin role and is active.");
        $this->line("  Previous role: {$previousRole}".($wasActive ? '' : ' (account was suspended)'));
        $this->newLine();
        $this->warn('This event is now in the emergency audit log and visible to the DPO.');
        $this->line('Two-factor enrolment is still mandatory — this account will be held');
        $this->line('at Settings → Security on first sign-in until it is set up.');

        return self::SUCCESS;
    }

    /**
     * Write the event to `activity_log` under its own log name.
     *
     * `emergency` rather than the default log, so the DPO dashboard can surface
     * these separately — a break-glass event buried among a thousand routine
     * update entries is a break-glass event nobody reviews.
     *
     * The OS account is captured alongside the typed operator name deliberately:
     * the typed name is what the person claims, and `whoami` is a fact they did
     * not enter. Neither is proof on its own; together they are worth more than
     * either.
     */
    private function recordEmergencyAccess(
        User $user,
        string $operator,
        string $reason,
        string $previousRole,
        bool $wasActive,
    ): void {
        activity('emergency')
            ->performedOn($user)
            ->withProperties([
                'operator' => $operator,
                'os_user' => get_current_user() ?: 'unknown',
                'reason' => $reason,
                'previous_role' => $previousRole,
                'was_active' => $wasActive,
                'forced' => (bool) $this->option('force'),
                'hostname' => gethostname() ?: 'unknown',
            ])
            ->log("Break-glass administrative recovery for {$user->email} by {$operator}");
    }

    /**
     * Email every owner and DPO.
     *
     * Not the administrators: the situation this runs in is one where none of
     * them can sign in. The oversight roles are the ones who need to know a
     * console operator granted somebody administrative access, and the DPO is
     * the role whose entire purpose is noticing exactly this.
     *
     * Failures are swallowed and logged rather than thrown — a mail transport
     * that is down must not leave the clinic locked out after the recovery has
     * already been written. The audit entry above is the durable record.
     */
    private function notifyOversight(User $user, string $operator, string $reason): void
    {
        try {
            $recipients = User::role(['owner', 'dpo'])->active()->get();

            foreach ($recipients as $recipient) {
                $recipient->notify(new BreakGlassRecoveryNotification(
                    subjectEmail: $user->email,
                    operator: $operator,
                    reason: $reason,
                    forced: (bool) $this->option('force'),
                ));
            }

            if ($recipients->isEmpty()) {
                $this->warn('  No active owner or DPO exists to notify.');
            }
        } catch (\Throwable $e) {
            $this->warn('  Could not send oversight notifications: '.$e->getMessage());
            report($e);
        }
    }
}
