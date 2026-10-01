<?php

namespace Database\Seeders;

use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the system administrator.
 *
 * RoleAndPermissionSeeder has always created the `admin` *role*, but nothing in
 * DatabaseSeeder ever created a *user* holding it — so before this seeder the
 * admin module was unreachable no matter what was built on top of it. The only
 * mention of an admin account anywhere was in WellcareSeeder, which is legacy
 * and is not registered in DatabaseSeeder.
 *
 * Mirrors HrSeeder: a verified email (the admin routes sit behind `verified`)
 * and a PatientProfile, without which User::getNameAttribute() returns an empty
 * string and the topbar renders blank.
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            [
                'email' => 'admin@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Sofia',
                'last_name' => 'Delacruz',
            ],
        ];

        foreach ($admins as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'password' => Hash::make($data['password']),
                    'is_active' => true,
                    // GV-9. The finding was not "this seeder uses a weak
                    // password" — a demo seeder should — it was that **nothing
                    // distinguished the demo path from a production one**. This
                    // is that distinction, in one expression.
                    //
                    // Local and testing keep a directly usable login, because a
                    // capstone demo that forces a password change on every
                    // `migrate:fresh --seed` is a demo nobody runs. Anywhere
                    // else, an account seeded with a password that is written
                    // down in a public repository is held at the password
                    // screen until somebody replaces it.
                    'must_change_password' => ! app()->environment(['local', 'testing']),
                ]
            );

            $user->syncRoles(['admin']);

            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'classification' => 'old',
                ]
            );

            $this->command->info("✓ Administrator seeded: {$data['email']}");
        }
    }
}
