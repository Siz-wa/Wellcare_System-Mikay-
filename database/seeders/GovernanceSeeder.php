<?php

namespace Database\Seeders;

use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * The two governance accounts — GV-5 and GV-6 in WELLCARE-GOVERNANCE-PLAN.md.
 *
 * ## Why seeding an owner does not contradict "console-created only"
 *
 * The invariant `CreateOwnerAccount` protects is that **no HTTP route mints the
 * owner role**. A seeder is a console path, run by whoever already has shell
 * access to the server — the same trust boundary the artisan command sits
 * behind. What must never exist is a web request that can create this account,
 * and none does.
 *
 * This seeder is for the demo and development environments, so that
 * `migrate:fresh --seed` produces a system somebody can actually sign into and
 * see the whole role model working. A real deployment runs
 * `php artisan wellcare:owner:create` and prompts for a real password.
 *
 * ## The passwords here are demo credentials
 *
 * Same GV-9 caveat as `AdminSeeder`: these are known, weak and fine for a
 * seeded demo, and must not survive into production. `CreateOwnerAccount`
 * applies the full production password policy regardless of `APP_ENV` for
 * exactly this reason — the real account cannot be created weakly even by
 * accident.
 */
class GovernanceSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'email' => 'owner@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Ramon',
                'last_name' => 'Salazar',
                'role' => 'owner',
                'label' => 'System Owner',
            ],
            [
                'email' => 'dpo@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Liwayway',
                'last_name' => 'Ocampo',
                'role' => 'dpo',
                'label' => 'Data Protection Officer',
            ],
        ];

        foreach ($accounts as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'password' => Hash::make($data['password']),
                    'is_active' => true,
                    // GV-9, same reasoning as AdminSeeder: local and testing
                    // keep a usable demo login; anywhere else these accounts
                    // are held at the password screen until the shipped
                    // credential is replaced.
                    'must_change_password' => ! app()->environment(['local', 'testing']),
                ]
            );

            $user->syncRoles([$data['role']]);

            // Every governance route sits behind `verified`, and there is
            // nobody to click a confirmation link on a seeded account's behalf.
            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            // Without a profile row User::getNameAttribute() returns an empty
            // string and the topbar renders blank on every page. Same reason
            // AdminSeeder and HrSeeder create one.
            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'classification' => 'old',
                ]
            );

            $this->command->info("✓ {$data['label']} seeded: {$data['email']}");
        }

        $this->command->warn(
            '  Both are demo credentials. Production owners are created with '
            .'`php artisan wellcare:owner:create`, which enforces the full '
            .'password policy regardless of APP_ENV.'
        );
    }
}
