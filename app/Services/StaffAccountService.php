<?php

namespace App\Services;

use App\Enums\Specialty;
use App\Exceptions\AccountActionNotAllowedException;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\AccountChangedNotification;
use App\Notifications\StaffInvitationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Account lifecycle for every role — Figure 4's "Add New User", "Manage User
 * Acc", "Manage User/Roles" and "Deactivate/Reactivate Acc" flows, and
 * Objectives 1.1 and 1.3.
 *
 * Extracted from App\Actions\Fortify\CreateNewUser so public registration and
 * admin account creation build an account exactly the same way. The critical
 * detail both share: **a User row alone is not a usable account.** This project
 * keeps no name on `users` — User::getNameAttribute() reads `patient_profiles`,
 * and the topbar renders it on every authenticated page. An account created
 * without a profile row shows a blank name everywhere and cannot be searched by
 * name in any admin list. The two rows are therefore always written together,
 * in one transaction.
 */
class StaffAccountService
{
    /**
     * Create an account and give it a role.
     *
     * $verified defaults to true because the caller that matters is an admin
     * creating a staff account: every non-patient route group sits behind
     * `verified`, and there is nobody to click a confirmation link on a
     * colleague's behalf — without it the new doctor logs in successfully and
     * then 403s on their own dashboard. Public registration passes false so
     * Fortify still sends its verification mail.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(
        array $input,
        string $role,
        bool $verified = true,
        bool $mustChangePassword = false,
    ): User {
        return DB::transaction(function () use ($input, $role, $verified, $mustChangePassword): User {
            $user = User::create([
                'email' => $input['email'],
                'password' => Hash::make($input['password']),
                'is_active' => $input['is_active'] ?? true,
                // GV-9. True when an administrator typed this password, false
                // when the account holder chose it at registration. The flag
                // exists because provisioning is the one moment two people
                // legitimately know a credential, and it should be the only
                // moment — EnsurePasswordIsChanged holds the account at the
                // password screen until the second person stops knowing it.
                'must_change_password' => $mustChangePassword,
            ]);

            $user->syncRoles([$role]);

            if ($verified) {
                $user->markEmailAsVerified();
            }

            $profile = $user->profile()->create($this->profileAttributes($input));

            $profile->medical()->create([
                'height' => $input['height'] ?? null,
                'weight' => $input['weight'] ?? null,
                'blood_pressure' => $input['blood_pressure'] ?? null,
                'hmo' => $input['hmo'] ?? null,
            ]);

            // A patient account holder is themselves a patient.
            //
            // The account is a guarantor account — one login books for several
            // people — and the person who registered is the first of them. Made
            // here, in the same transaction, so the booking gate is never empty
            // for a new account and "Myself" never has to be offered as
            // something to add.
            //
            // Only for `user`: a doctor, nurse, HR or admin account is staff,
            // and giving them a medical record would put them in patient lists
            // and search results they have no business appearing in.
            if ($role === 'user') {
                Patient::ensureSelfPatient($user->fresh());
            }

            // A doctor account without a doctor_profiles row is a ghost.
            //
            // This was the single worst defect in the account module. Until
            // Phase 9 the only writer of doctor_profiles was a seeder, so an
            // admin who created a doctor here got an account that could sign in
            // and then: never appeared in DoctorProfile::active(), so patients
            // could not book them and they were absent from /doctors; had no
            // specialty to be searched by; and rendered a blank name wherever
            // `doctor.doctorProfile.display_name` was read — which is most of
            // the app. Nothing errored. The doctor simply did not exist to
            // anyone but themselves.
            //
            // Created in the same transaction as the account for exactly the
            // reason the profile row above is: a partially-built staff member
            // is not visibly broken until somebody tries to use them.
            if ($role === 'doctor') {
                $this->createDoctorProfile($user->fresh(), $input);
            }

            return $user->fresh();
        });
    }

    /**
     * The doctor-specific half of a doctor account.
     *
     * `is_active` is FALSE on purpose, and it is the whole point of the phase.
     * Creating an account is not the same as clearing someone to see patients:
     * a new doctor is unpublished until an administrator has seen their PRC
     * registration and verified it through CredentialingService, which is the
     * only thing that flips this column. The old default of "bookable the
     * instant the row exists" is what made the system feel like it had nobody
     * managing it.
     *
     * @param  array<string, mixed>  $input
     */
    private function createDoctorProfile(User $user, array $input): DoctorProfile
    {
        $specialty = $input['specialty'] ?? Specialty::General->value;

        return $user->doctorProfile()->create([
            // Falls back to the account name so the profile is never blank —
            // display_name is NOT NULL and is read on nearly every page.
            'display_name' => $input['display_name'] ?? $this->defaultDisplayName($input),
            'specialty' => $specialty,
            'specialization' => $input['specialization'] ?? null,
            'initials' => $this->initialsFor($input),
            'is_active' => false,
            'max_patients_per_day' => DoctorProfile::DEFAULT_DAILY_PATIENT_CAP,
        ]);
    }

    /**
     * "Dr. Juan Dela Cruz" — the form of address the doctor directory and every
     * appointment card render.
     *
     * @param  array<string, mixed>  $input
     */
    private function defaultDisplayName(array $input): string
    {
        return trim('Dr. '.trim(($input['first_name'] ?? '').' '.($input['last_name'] ?? '')));
    }

    /** @param  array<string, mixed>  $input */
    private function initialsFor(array $input): string
    {
        return strtoupper(
            substr($input['first_name'] ?? '', 0, 1).substr($input['last_name'] ?? '', 0, 1)
        ) ?: 'DR';
    }

    /**
     * Update the account and its profile.
     *
     * **This method no longer sets passwords, and must not be given the ability
     * again.** GV-1 in WELLCARE-GOVERNANCE-PLAN.md: until 2026-09-10 this
     * accepted a `password` for any target user, which meant an administrator
     * could reset a doctor's password, sign in as that doctor and read every
     * chart in the clinic — while `User::activityLogAttributes()` logs only
     * `email` and `is_active`, so the credential change left no trace and the
     * reads that followed were attributed to the doctor. The A-9 finding in the
     * compliance plan ("admin limited to demographics") was true of the
     * administrator's own screens and false of their reach.
     *
     * Credential recovery for somebody else is now sendPasswordReset() below:
     * the link goes to the account's own mailbox, so the administrator restores
     * access without ever holding the credential. That is the HIPAA
     * §164.312(a)(2)(i) unique-user-identification property — every action
     * attributable to the person who actually took it.
     *
     * @param  array<string, mixed>  $input
     *
     * @throws AccountActionNotAllowedException
     */
    public function update(User $user, array $input, User $actor): User
    {
        $this->guardAdministrable($user, $actor, 'edit');

        // Captured before the write. GV-7 sends the notice to the address being
        // REPLACED, not the new one — a change made by an attacker who has
        // already redirected the mailbox would otherwise notify only the
        // attacker, which is worse than not notifying at all.
        $previousEmail = $user->email;

        $updated = DB::transaction(function () use ($user, $input): User {
            $user->update(['email' => $input['email']]);

            // updateOrCreate, not update: accounts predating this module (and
            // any created by a path that skipped the profile) have no row yet,
            // and update() on a missing relation would silently do nothing.
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $this->profileAttributes($input),
            );

            return $user->fresh();
        });

        if ($previousEmail !== $updated->email) {
            $this->notifyAccountChange($updated, 'email', previousEmail: $previousEmail);
        }

        return $updated;
    }

    /**
     * Start credential recovery for somebody else's account.
     *
     * The other half of GV-1. An administrator still needs a way to get a
     * locked-out nurse back to work; what they must not have is the nurse's
     * password. Fortify's broker mails a signed, expiring link to the address
     * on the account, so the administrator triggers the recovery and the
     * account holder completes it.
     *
     * Returns the broker's status string rather than a boolean so the caller
     * can tell "sent" apart from "throttled" — Laravel rate-limits reset links
     * per address, and reporting a throttle as a success would have an admin
     * telling a colleague to check a mailbox nothing was sent to.
     *
     * @throws AccountActionNotAllowedException
     */
    /**
     * Create a staff account whose password only its holder will ever know.
     *
     * The stored password is random and never shown; the invitation mail
     * carries a reset token that lets the new staff member choose their own.
     *
     * @param  array<string, mixed>  $input
     */
    public function invite(array $input, string $role): User
    {
        $user = $this->create(
            ['password' => Str::password(40)] + $input,
            $role,
            verified: true,
        );

        $user->notify(new StaffInvitationNotification(
            Password::broker()->createToken($user),
            $role,
        ));

        return $user;
    }

    public function sendPasswordReset(User $user, User $actor): string
    {
        $this->guardAdministrable($user, $actor, 'reset the password of');

        $status = Password::broker()->sendResetLink(['email' => $user->email]);

        // GV-7, and only on success: a heads-up that a reset "was requested"
        // when the broker actually throttled it would have people hunting for
        // a link that was never sent. Separate from Fortify's own reset mail on
        // purpose — that one carries the token and says nothing about who
        // started it, and "an administrator did this" is the part worth
        // knowing.
        if ($status === Password::RESET_LINK_SENT) {
            $this->notifyAccountChange($user, 'password_reset');
        }

        return $status;
    }

    /**
     * Tell somebody that their own access changed — GV-7.
     *
     * ## Failures are swallowed, on purpose
     *
     * Same trade as `LogsRecordAccess`, in the same direction and for the same
     * reason: a mail transport that is down must not stop an administrator
     * suspending a compromised account. The containment action is the urgent
     * one; the courtesy notice is not. The failure goes to the application log
     * instead — do not quieten that call, because swallowing an error is only
     * defensible while it is loud somewhere.
     *
     * ## The `$previousEmail` override
     *
     * For an email change the notice goes to the address being REPLACED. If the
     * change was made by somebody who has already taken over the mailbox,
     * sending to the new address notifies only them. Notifying the old address
     * is the only version of this that can reach the actual account holder.
     *
     * @param  'role'|'suspended'|'reactivated'|'email'|'password_reset'  $event
     * @param  string|null  $detail  short, non-sensitive context. Never a credential.
     */
    private function notifyAccountChange(
        User $user,
        string $event,
        ?string $detail = null,
        ?string $previousEmail = null,
    ): void {
        try {
            $notification = new AccountChangedNotification($event, $detail);

            if ($previousEmail !== null) {
                Notification::route('mail', $previousEmail)->notify($notification);

                return;
            }

            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::error('Failed to send account-change notification', [
                'event' => $event,
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Refuse any account action aimed sideways or upwards.
     *
     * GV-1. Deliberately narrower than it could be: this guards *credential and
     * profile* mutation only. `changeRole` and `setActive` keep their own,
     * looser guards, and that asymmetry is intentional — see setActive() for
     * why a peer admin must stay able to suspend a compromised colleague at 2am
     * without waiting for the owner to wake up.
     *
     * @param  string  $verb  folded into the message so the refusal names what
     *                        was actually attempted
     *
     * @throws AccountActionNotAllowedException
     */
    private function guardAdministrable(User $user, User $actor, string $verb): void
    {
        if ($actor->mayAdminister($user)) {
            return;
        }

        if ($actor->is($user)) {
            throw new AccountActionNotAllowedException(
                "You cannot {$verb} your own account from the user-management screen. "
                .'Use Settings instead, so the change is recorded as yours.'
            );
        }

        throw new AccountActionNotAllowedException(
            "You do not have the authority to {$verb} this account. "
            .'It holds the same level of access as yours or higher, and only the '
            .'system owner can manage it.'
        );
    }

    /**
     * Move an account to a different role.
     *
     * syncRoles, not assignRole: this app treats roles as mutually exclusive —
     * every routing decision (DashboardController::routeForUser) tests them in
     * a fixed order, so a user holding both `doctor` and `user` would land
     * somewhere determined by that order rather than by intent.
     *
     * @throws AccountActionNotAllowedException
     */
    public function changeRole(User $user, string $role, User $actor): User
    {
        if ($user->is($actor)) {
            throw new AccountActionNotAllowedException(
                'You cannot change your own role. Ask another administrator to do it.'
            );
        }

        // GV-6: you cannot hand out authority you do not hold yourself. This is
        // what stops an administrator minting a second administrator — `admin`
        // is tier 2, so granting it needs tier 3, which only the owner has.
        //
        // Demotion is deliberately NOT guarded the same way: an admin may still
        // move a peer admin down to `hr`, for the same containment reason
        // setActive() explains. Taking authority away is a safe direction.
        if (! $actor->mayGrantRole($role)) {
            throw new AccountActionNotAllowedException(
                "You do not have the authority to grant the {$role} role. "
                .'Only the system owner can appoint an account at or above your '
                .'own level of access.'
            );
        }

        $this->guardLastActiveAdmin($user, $role !== 'admin');

        $user->syncRoles([$role]);

        // GV-7. A role change is the event with the least visible consequence
        // and one of the largest — the person's landing page moves and half the
        // application appears or disappears, with nothing anywhere saying why.
        $this->notifyAccountChange($user, 'role', detail: $role);

        return $user->fresh();
    }

    /**
     * Deactivate or reactivate an account — Figure 4's "Deactivate/Reactivate
     * Acc". The row is never deleted; see the is_active migration for why.
     *
     * ## Why this is NOT tier-guarded, when update() is
     *
     * A deliberate asymmetry, and the reasoning is operational rather than
     * theoretical. If an administrator account is compromised at two in the
     * morning, the containment action is suspending it, and requiring the
     * system owner to be awake before that can happen turns a contained
     * incident into an uncontained one. Suspension is also loud — the person
     * cannot sign in, `EnsureUserIsActive` ends their live session on the next
     * request, and the change is audited — so a malicious peer-suspension is
     * self-announcing in a way that a silent password reset is not.
     *
     * Credential mutation is the opposite on every count: quiet, reversible by
     * the attacker, and it hands over an identity. That is why GV-1 guards
     * update() and sendPasswordReset() and leaves this alone.
     *
     * @throws AccountActionNotAllowedException
     */
    public function setActive(User $user, bool $active, User $actor): User
    {
        if (! $active && $user->is($actor)) {
            throw new AccountActionNotAllowedException(
                'You cannot deactivate your own account.'
            );
        }

        $this->guardLastActiveAdmin($user, ! $active);

        $user->update(['is_active' => $active]);

        // GV-7. The one notice that MUST be mail rather than the in-app bell:
        // a suspended account cannot sign in to read a bell, so an in-app-only
        // suspension notice is not a notice at all.
        $this->notifyAccountChange($user, $active ? 'reactivated' : 'suspended');

        return $user->fresh();
    }

    /**
     * Refuse any action that would leave the system with no way in.
     *
     * There is no console recovery UI and no second admin by default, so
     * removing the last active admin bricks the module permanently.
     *
     * Defence in depth rather than a live HTTP path: over the web routes only
     * an active admin can get here, so one always remains, and the single case
     * that would empty the set — an admin acting on themselves — is caught
     * earlier by the self-guards. This matters if a console command, seeder or
     * future bulk action ever calls the service without a session behind it.
     * AdminDeactivationTest asserts it at the service layer for that reason.
     *
     * @throws AccountActionNotAllowedException
     */
    private function guardLastActiveAdmin(User $user, bool $wouldRemoveAdmin): void
    {
        if (! $wouldRemoveAdmin || ! $user->hasRole('admin') || ! $user->is_active) {
            return;
        }

        $remaining = User::role('admin')->active()->where('id', '!=', $user->id)->count();

        if ($remaining === 0) {
            throw new AccountActionNotAllowedException(
                'This is the last active administrator. Promote or activate another '
                .'administrator first, or nobody will be able to manage the system.'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function profileAttributes(array $input): array
    {
        return [
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'address' => $input['address'] ?? null,
            'company' => $input['company'] ?? null,
            'contact_number' => $input['contact_number'] ?? null,
            'gender' => $input['gender'] ?? null,
            'birthdate' => $input['birthdate'] ?? null,
            'civil_status' => $input['civil_status'] ?? null,
            'classification' => $input['classification'] ?? 'old',
        ];
    }
}
