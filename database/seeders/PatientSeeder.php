<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\PatientProfile;
use App\Models\PatientMedical;
use App\Models\Patient;

class PatientSeeder extends Seeder
{
    public function run(): void
    {
        $patients = [
            [
                'email'    => 'juan.dela.cruz@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Juan',
                    'last_name'      => 'Dela Cruz',
                    'contact_number' => '09171234567',
                    'gender'         => 'M',
                    'birthdate'      => '1990-05-15',
                    'civil_status'   => 'married',
                    'address'        => '123 Rizal Street, Makati City',
                    'classification' => 'old',
                ],
                'medical' => [
                    'height'         => 170.00,
                    'weight'         => 72.50,
                    'blood_pressure' => '120/80',
                    'payment_method' => 'cash',
                ],
            ],
            [
                'email'    => 'maria.santos@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Maria',
                    'last_name'      => 'Santos',
                    'contact_number' => '09189876543',
                    'gender'         => 'F',
                    'birthdate'      => '1985-11-22',
                    'civil_status'   => 'single',
                    'address'        => '456 Mabini Ave, Quezon City',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 158.00,
                    'weight'         => 55.00,
                    'blood_pressure' => '110/70',
                    'hmo'            => 'Maxicare',
                    'payment_method' => 'hmo',
                ],
            ],
            [
                'email'    => 'pedro.reyes@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Pedro',
                    'last_name'      => 'Reyes',
                    'contact_number' => '09201112222',
                    'gender'         => 'M',
                    'birthdate'      => '2000-03-08',
                    'civil_status'   => 'single',
                    'address'        => '789 Luna Street, Pasig City',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 175.00,
                    'weight'         => 80.00,
                    'blood_pressure' => '118/76',
                    'payment_method' => 'cash',
                ],
            ],
            [
                'email'    => 'ana.gomez@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Ana',
                    'last_name'      => 'Gomez',
                    'contact_number' => '09333445566',
                    'gender'         => 'F',
                    'birthdate'      => '1978-07-30',
                    'civil_status'   => 'widowed',
                    'address'        => '321 Bonifacio St, Taguig City',
                    'classification' => 'old',
                ],
                'medical' => [
                    'height'         => 155.00,
                    'weight'         => 62.00,
                    'blood_pressure' => '130/85',
                    'hmo'            => 'PhilHealth',
                    'payment_method' => 'hmo',
                ],
            ],
            [
                'email'    => 'carlo.luna@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Carlo',
                    'last_name'      => 'Luna',
                    'contact_number' => '09551234567',
                    'gender'         => 'M',
                    'birthdate'      => '1995-01-19',
                    'civil_status'   => 'single',
                    'address'        => '55 Aguinaldo Blvd, Cavite City',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 168.00,
                    'weight'         => 68.00,
                    'blood_pressure' => '122/78',
                    'payment_method' => 'cash',
                ],
            ],
            [
                'email'    => 'rosa.aquino@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Rosa',
                    'last_name'      => 'Aquino',
                    'contact_number' => '09661237890',
                    'gender'         => 'F',
                    'birthdate'      => '1992-09-12',
                    'civil_status'   => 'married',
                    'address'        => '88 Katipunan Ave, Quezon City',
                    'classification' => 'old',
                ],
                'medical' => [
                    'height'         => 162.00,
                    'weight'         => 58.00,
                    'blood_pressure' => '115/75',
                    'hmo'            => 'Medicard',
                    'payment_method' => 'hmo',
                ],
            ],
            [
                'email'    => 'marco.torres@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Marco',
                    'last_name'      => 'Torres',
                    'contact_number' => '09771239876',
                    'gender'         => 'M',
                    'birthdate'      => '1988-04-25',
                    'civil_status'   => 'married',
                    'address'        => '14 Magsaysay St, Mandaluyong',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 172.00,
                    'weight'         => 78.00,
                    'blood_pressure' => '125/82',
                    'payment_method' => 'cash',
                ],
            ],
            [
                'email'    => 'elena.ramos@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Elena',
                    'last_name'      => 'Ramos',
                    'contact_number' => '09881234321',
                    'gender'         => 'F',
                    'birthdate'      => '1975-12-03',
                    'civil_status'   => 'married',
                    'address'        => '200 Shaw Blvd, Mandaluyong',
                    'classification' => 'old',
                ],
                'medical' => [
                    'height'         => 160.00,
                    'weight'         => 65.00,
                    'blood_pressure' => '128/84',
                    'hmo'            => 'Intellicare',
                    'payment_method' => 'hmo',
                ],
            ],
            [
                'email'    => 'ben.castillo@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Benjamin',
                    'last_name'      => 'Castillo',
                    'contact_number' => '09991238765',
                    'gender'         => 'M',
                    'birthdate'      => '1983-06-17',
                    'civil_status'   => 'single',
                    'address'        => '5 Ortigas Ave, Pasig City',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 178.00,
                    'weight'         => 85.00,
                    'blood_pressure' => '132/86',
                    'payment_method' => 'cash',
                ],
            ],
            [
                'email'    => 'lisa.navarro@gmail.com',
                'password' => 'password123',
                'profile'  => [
                    'first_name'     => 'Lisa',
                    'last_name'      => 'Navarro',
                    'contact_number' => '09111239988',
                    'gender'         => 'F',
                    'birthdate'      => '1998-02-28',
                    'civil_status'   => 'single',
                    'address'        => '77 Taft Ave, Manila',
                    'classification' => 'new',
                ],
                'medical' => [
                    'height'         => 156.00,
                    'weight'         => 50.00,
                    'blood_pressure' => '108/68',
                    'hmo'            => 'AXA',
                    'payment_method' => 'hmo',
                ],
            ],
        ];

        foreach ($patients as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['password' => Hash::make($data['password'])]
            );

            $user->syncRoles(['user']);

            $profile = PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                $data['profile']
            );

            PatientMedical::firstOrCreate(
                ['profile_id' => $profile->id],
                $data['medical']
            );

            Patient::firstOrCreate(
                ['guarantor_id' => $user->id],
                [
                    'first_name'     => $data['profile']['first_name'],
                    'last_name'      => $data['profile']['last_name'],
                    'email'          => $data['email'],
                    'contact_number' => $data['profile']['contact_number'],
                    'gender'         => strtolower($data['profile']['gender'] === 'M' ? 'male' : 'female'),
                    'birthdate'      => $data['profile']['birthdate'],
                    'address'        => $data['profile']['address'],
                    'civil_status'   => $data['profile']['civil_status'],
                ]
            );

            $this->command->info("✓ Patient seeded: {$data['email']}");
        }
    }
}