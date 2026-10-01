<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            // The bookable catalogue. Ahead of AppointmentSeeder, which books
            // against these slugs, and ahead of nothing else — it depends on
            // no other seeder and is idempotent, so it is safe to re-run alone
            // with `--class=ServiceSeeder` after editing the copy.
            ServiceSeeder::class,
            AdminSeeder::class,        // nothing else creates a user with the admin role
            // GV-5 / GV-6. The owner appoints administrators; the DPO reads the
            // audit trails. Must follow RoleAndPermissionSeeder, which is where
            // the `owner` and `dpo` roles and their permission sets come from.
            GovernanceSeeder::class,
            DoctorSeeder::class,
            HrSeeder::class,
            NurseSeeder::class,
            // Must follow DoctorSeeder and NurseSeeder. Phase 9 derives
            // doctor_profiles.is_active from credentialing, so without this
            // every seeded doctor would be unpublished and unbookable.
            StaffCredentialSeeder::class,
            PatientSeeder::class,
            AppointmentSeeder::class,  // depends on patients + doctors
            LabResultSeeder::class,    // depends on appointments + nurses
            // Video bookings at each payment step. After AppointmentSeeder so
            // its slot check sees the in-person rows, and after HrSeeder, whose
            // officer verifies the paid ones.
            VirtualConsultationSeeder::class,
        ]);
    }
}
