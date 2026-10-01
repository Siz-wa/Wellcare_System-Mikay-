<?php

use App\Models\Appointment;
use App\Models\ConsultationSession;

/**
 * The doctor's consultations list says what each column actually holds.
 */
it('shows the written assessment under the service, and marks video visits', function () {
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->forDoctor($doctor)->virtual()->completed()->create([
        'service' => 'cardiology',
        'appointment_date' => now()->subDay()->toDateString(),
    ]);
    ConsultationSession::create([
        'appointment_id' => $appointment->id,
        'doctor_id' => $doctor->id,
        'assessment' => 'Atypical chest pain',
        'status' => 'finalized',
    ]);

    $this->actingAs($doctor)
        ->get('/doctor/consultations')
        ->assertInertia(fn ($page) => $page
            ->where('consultations.0.assessment', 'Atypical chest pain')
            ->where('consultations.0.consultationType', 'virtual'));
});
