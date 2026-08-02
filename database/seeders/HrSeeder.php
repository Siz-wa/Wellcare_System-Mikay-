<?php

namespace Database\Seeders;

use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HrSeeder extends Seeder
{
    public function run(): void
    {
        $hrOfficers = [
            [
                'email' => 'hr.garcia@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Liza',
                'last_name' => 'Garcia',
            ],
            [
                'email' => 'hr.mendoza@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Ramon',
                'last_name' => 'Mendoza',
            ],
        ];

        foreach ($hrOfficers as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['password' => Hash::make($data['password'])]
            );

            $user->syncRoles(['hr']);

            // The hr|admin routes are behind `verified`.
            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            // Patient profile — required so getNameAttribute works in the topbar
            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'classification' => 'old',
                ]
            );

            $this->command->info("✓ HR officer seeded: {$data['email']}");
        }
    }
}
