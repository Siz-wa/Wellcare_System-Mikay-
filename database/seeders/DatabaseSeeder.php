<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            DoctorSeeder::class,
            HrSeeder::class,
            PatientSeeder::class,
            AppointmentSeeder::class,  // depends on patients + doctors
        ]);
    }
}