<?php

use App\Models\Appointment;
use Database\Seeders\AdminSeeder;
use Database\Seeders\AppointmentSeeder;
use Database\Seeders\DoctorSeeder;
use Database\Seeders\HrSeeder;
use Database\Seeders\NurseSeeder;
use Database\Seeders\PatientSeeder;
use Database\Seeders\StaffCredentialSeeder;
use Database\Seeders\VirtualConsultationSeeder;

/**
 * The demo database must hold a video consultation at each payment step, so
 * the video room and the payment queue can be shown without first booking,
 * paying and verifying one by hand from two accounts.
 */
beforeEach(function () {
    $this->seed(AdminSeeder::class);
    $this->seed(DoctorSeeder::class);
    $this->seed(HrSeeder::class);
    $this->seed(NurseSeeder::class);
    $this->seed(StaffCredentialSeeder::class);
    $this->seed(PatientSeeder::class);
    $this->seed(AppointmentSeeder::class);
    $this->seed(VirtualConsultationSeeder::class);
});

it('seeds a virtual consultation at every payment step', function () {
    $statuses = Appointment::where('consultation_type', 'virtual')
        ->with('paymentVerification')
        ->get()
        ->map(fn (Appointment $appointment) => $appointment->paymentVerification?->status)
        ->sort()
        ->values()
        ->all();

    expect($statuses)->toBe(['pending', 'submitted', 'verified', 'verified']);
});

it('seeds one video room the doctor can open today', function () {
    $ready = Appointment::where('consultation_type', 'virtual')
        ->whereDate('appointment_date', today())
        ->get()
        ->filter(fn (Appointment $appointment) => $appointment->isInConsultation()
            && $appointment->isSettledForConsultation());

    expect($ready)->toHaveCount(1);
});

it('is safe to run twice', function () {
    $this->seed(VirtualConsultationSeeder::class);

    expect(Appointment::where('consultation_type', 'virtual')->count())->toBe(4);
});
