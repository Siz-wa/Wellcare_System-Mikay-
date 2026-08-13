<?php

namespace App\Services;

use App\Exceptions\AccountActionNotAllowedException;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
    public function create(array $input, string $role, bool $verified = true): User
    {
        return DB::transaction(function () use ($input, $role, $verified): User {
            $user = User::create([
                'email' => $input['email'],
                'password' => Hash::make($input['password']),
                'is_active' => $input['is_active'] ?? true,
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

            return $user->fresh();
        });
    }

    /**
     * Update the account and its profile. Password is optional — an empty value
     * means "leave it alone" rather than "set it to nothing".
     *
     * @param  array<string, mixed>  $input
     */
    public function update(User $user, array $input): User
    {
        return DB::transaction(function () use ($user, $input): User {
            $account = ['email' => $input['email']];

            if (! empty($input['password'])) {
                $account['password'] = Hash::make($input['password']);
            }

            $user->update($account);

            // updateOrCreate, not update: accounts predating this module (and
            // any created by a path that skipped the profile) have no row yet,
            // and update() on a missing relation would silently do nothing.
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $this->profileAttributes($input),
            );

            return $user->fresh();
        });
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

        $this->guardLastActiveAdmin($user, $role !== 'admin');

        $user->syncRoles([$role]);

        return $user->fresh();
    }

    /**
     * Deactivate or reactivate an account — Figure 4's "Deactivate/Reactivate
     * Acc". The row is never deleted; see the is_active migration for why.
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
