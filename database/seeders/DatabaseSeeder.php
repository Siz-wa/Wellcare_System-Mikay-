<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            AdminSeeder::class,        // nothing else creates a user with the admin role
            DoctorSeeder::class,
            HrSeeder::class,
            NurseSeeder::class,
            PatientSeeder::class,
            AppointmentSeeder::class,  // depends on patients + doctors
            LabResultSeeder::class,    // depends on appointments + nurses
        ]);
    }
}
