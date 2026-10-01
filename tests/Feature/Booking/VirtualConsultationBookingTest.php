<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\Consent;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\PaymentVerification;
use Carbon\Carbon;

/**
 * Booking a video consultation — everything up to, but not including, the call.
 *
 * A virtual visit differs from an in-person one in three ways that all have to
 * hold together: it needs its own consent (DOH AO 2020-0030), it is paid before
 * it starts because there is no cashier to walk past, and it must not carry an
 * HMO card it is not being billed against.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Clara Magno',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    // Next Monday, so the weekly block below always covers the booked date.
    // `day_of_week` is stored in MySQL DAYOFWEEK convention (1=Sun), hence the
    // converter rather than Carbon's dayOfWeek directly.
    $this->date = Carbon::today()->next(Carbon::MONDAY);

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->patient = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Testa',
        'last_name' => 'Patiento',
        'age' => 31,
        'gender' => 'female',
    ]);

    $this->payload = fn (array $overrides = []) => array_merge([
        'patientId' => $this->patient->id,
        'service' => 'general',
        'branch' => 'Wellcare Dasmarinas',
        'consultationType' => 'virtual',
        'consentTelemedicine' => '1',
        'appointmentDate' => $this->date->toDateString(),
        'appointmentTime' => '11:00 AM',
        'doctorId' => $this->doctor->id,
        'coverage' => 'cash',
    ], $overrides);
});

it('refuses a video consultation without telemedicine consent', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)(['consentTelemedicine' => '0']))
        ->assertSessionHasErrors('consent_telemedicine');

    expect(Appointment::count())->toBe(0);
});

it('records the telemedicine consent separately from the sign-up consents', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)())
        ->assertSessionHasNoErrors();

    // Asked at the point of booking, not at registration — consenting to a
    // video call somebody may never have is consent to a hypothetical.
    expect(
        Consent::where('granted_by_user_id', $this->guarantor->id)
            ->where('type', Consent::TELEMEDICINE)
            ->whereNull('withdrawn_at')
            ->exists()
    )->toBeTrue();
});

it('raises a payment due before the slot', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)())
        ->assertSessionHasNoErrors();

    $appointment = Appointment::latest('id')->firstOrFail();
    $payment = PaymentVerification::where('appointment_id', $appointment->id)->firstOrFail();

    expect($appointment->consultation_type)->toBe('virtual')
        ->and($payment->status)->toBe('pending')
        ->and((float) $payment->amount_due)->toBeGreaterThan(0.0)
        // There is no cashier on the way in, so the deadline is what protects
        // the slot — it has to exist and it has to fall before the appointment.
        ->and($payment->due_at)->not->toBeNull()
        ->and($payment->due_at->lessThan($appointment->appointment_at))->toBeTrue();
});

it('raises no payment for an in-person visit', function () {
    // The cashier handles those, as they always have.
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'consultationType' => 'in_person',
            'consentTelemedicine' => '0',
        ]))
        ->assertSessionHasNoErrors();

    expect(PaymentVerification::count())->toBe(0);
});

it('does not store an HMO card on a self-paid booking', function () {
    // The wizard pre-fills coverage from the patient's last visit, so the pair
    // arrives in the payload even after the patient switches to Self-Pay. A row
    // that says `coverage = cash` and `hmo = maxicare` at once misreads as HMO
    // business in every report that groups by provider, and the review screen
    // showed the patient "Self-Pay" directly above "HMO PROVIDER Maxicare".
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'coverage' => 'cash',
            'hmo' => 'maxicare',
            'hmoId' => 'MC-998877',
        ]))
        ->assertSessionHasNoErrors();

    $appointment = Appointment::latest('id')->firstOrFail();

    expect($appointment->coverage)->toBe('cash')
        ->and($appointment->hmo)->toBeNull()
        ->and($appointment->hmo_id)->toBeNull();
});

it('keeps the HMO card when the visit really is HMO covered', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'coverage' => 'hmo',
            'hmo' => 'maxicare',
            'hmoId' => 'MC-998877',
        ]))
        ->assertSessionHasNoErrors();

    $appointment = Appointment::latest('id')->firstOrFail();

    expect($appointment->coverage)->toBe('hmo')
        ->and($appointment->hmo)->toBe('maxicare')
        ->and($appointment->hmo_id)->toBe('MC-998877')
        // And an HMO booking goes to HR before it reaches the doctor.
        ->and($appointment->status)->toBe('pending_hmo_approval');
});
