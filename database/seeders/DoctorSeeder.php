<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\AvailabilityBlock;

class DoctorSeeder extends Seeder
{
    public function run(): void
    {
        $doctors = [
            [
                'email'    => 'dr.reyes@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Maria Reyes',
                    'specialty'      => 'general',
                    'specialization' => 'Family Medicine',
                    'initials'       => 'MR',
                    'color'          => '#3b82f6',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Maria', 'last_name' => 'Reyes'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email'    => 'dr.santos@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Jose Santos',
                    'specialty'      => 'internal_medicine',
                    'specialization' => 'Internal Medicine',
                    'initials'       => 'JS',
                    'color'          => '#8b5cf6',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Jose', 'last_name' => 'Santos'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '16:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '16:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '16:00'],
                ],
            ],
            [
                'email'    => 'dr.dela.cruz@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Ana Dela Cruz',
                    'specialty'      => 'pediatrics',
                    'specialization' => 'Pediatrics',
                    'initials'       => 'AD',
                    'color'          => '#ec4899',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Ana', 'last_name' => 'Dela Cruz'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '12:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '12:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email'    => 'dr.garcia@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Ricardo Garcia',
                    'specialty'      => 'cardiology',
                    'specialization' => 'Cardiology',
                    'initials'       => 'RG',
                    'color'          => '#ef4444',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Ricardo', 'last_name' => 'Garcia'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '15:00'],
                ],
            ],
            [
                'email'    => 'dr.flores@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Patricia Flores',
                    'specialty'      => 'dermatology',
                    'specialization' => 'Dermatology',
                    'initials'       => 'PF',
                    'color'          => '#f59e0b',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Patricia', 'last_name' => 'Flores'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '13:00'],
                ],
            ],
            [
                'email'    => 'dr.mendoza@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Carlos Mendoza',
                    'specialty'      => 'orthopedics',
                    'specialization' => 'Orthopedic Surgery',
                    'initials'       => 'CM',
                    'color'          => '#10b981',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Carlos', 'last_name' => 'Mendoza'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '07:00', 'end_time' => '14:00'],
                    ['day_of_week' => 3, 'start_time' => '07:00', 'end_time' => '14:00'],
                    ['day_of_week' => 4, 'start_time' => '07:00', 'end_time' => '14:00'],
                ],
            ],
            [
                'email'    => 'dr.villanueva@wellcare.com',
                'password' => 'password123',
                'profile'  => [
                    'display_name'   => 'Dr. Sofia Villanueva',
                    'specialty'      => 'obstetrics',
                    'specialization' => 'Obstetrics & Gynecology',
                    'initials'       => 'SV',
                    'color'          => '#a855f7',
                    'is_active'      => true,
                ],
                'patient_profile' => ['first_name' => 'Sofia', 'last_name' => 'Villanueva'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00'],
                ],
            ],
        ];

        foreach ($doctors as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['password' => Hash::make($data['password'])]
            );

            $user->syncRoles(['doctor']);

            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                array_merge($data['patient_profile'], ['classification' => 'old'])
            );

            DoctorProfile::firstOrCreate(
                ['user_id' => $user->id],
                $data['profile']
            );

            if (AvailabilityBlock::where('doctor_id', $user->id)->doesntExist()) {
                foreach ($data['availability'] as $block) {
                    AvailabilityBlock::create([
                        'doctor_id'             => $user->id,
                        'day_of_week'           => $block['day_of_week'],
                        'specific_date'         => null,
                        'start_time'            => $block['start_time'],
                        'end_time'              => $block['end_time'],
                        'slot_duration_minutes' => 30,
                        'is_available'          => true,
                    ]);
                }
            }

            $this->command->info("✓ Doctor seeded: {$data['email']}");
        }
    }
}