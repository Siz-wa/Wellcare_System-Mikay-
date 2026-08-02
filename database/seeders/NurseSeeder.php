<?php

namespace Database\Seeders;

use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class NurseSeeder extends Seeder
{
    public function run(): void
    {
        $nurses = [
            [
                'email' => 'nurse.delacruz@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Maricel',
                'last_name' => 'Dela Cruz',
            ],
            [
                'email' => 'nurse.villanueva@wellcare.com',
                'password' => 'password123',
                'first_name' => 'Joseph',
                'last_name' => 'Villanueva',
            ],
        ];

        foreach ($nurses as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['password' => Hash::make($data['password'])]
            );

            $user->syncRoles(['nurse']);

            // The nurse routes are behind `verified`.
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

            $this->command->info("✓ Nurse seeded: {$data['email']}");
        }
    }
}
