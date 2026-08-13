<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * How far ahead the clinic accepts bookings.
 *
 * The panel could pick dates in 2027. Three layers had drifted apart: the
 * service allows 3 months, the FormRequest allowed 3 months, and the date
 * picker allowed 365 days — so anything between them passed every client-side
 * check and was only refused on submit. The picker now takes its bounds from
 * the server, and these tests pin the bounds themselves.
 *
 * The second bug was quieter: the picker built `min` with a local midnight and
 * then called toISOString(), which in UTC+8 renders as the previous day — so
 * "tomorrow" let today through. Computing the window server-side removes the
 * conversion entirely.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Maria Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    // Availability on every day, so a rejection is always about the window
    // rather than the doctor happening to be off that weekday.
    foreach (range(1, 7) as $iso) {
        AvailabilityBlock::create([
            'doctor_id' => $this->doctor->id,
            'day_of_week' => AvailabilityBlock::isoToStoredDay($iso),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'slot_duration_minutes' => 30,
            'is_available' => true,
        ]);
    }

    $this->patient = Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->book = fn (string $date) => $this->actingAs($this->guarantor)
        ->post('/appointments', [
            'patientId' => $this->patient->id,
            'service' => 'general',
            'appointmentDate' => $date,
            'appointmentTime' => '9:00 AM',
            'coverage' => 'cash',
            'doctorId' => $this->doctor->id,
        ]);
});

it('publishes a window that matches the server rule, not a hardcoded year', function () {
    $this->actingAs($this->guarantor)
        ->get('/book')
        ->assertInertia(fn ($page) => $page
            ->where('bookingWindow.min', now()->addDay()->toDateString())
            ->where(
                'bookingWindow.max',
                now()->addMonths(BookingService::MAX_LEAD_MONTHS)->subDay()->toDateString(),
            )
        );
});

it('refuses a date beyond the three-month window', function () {
    ($this->book)(now()->addMonths(4)->toDateString())
        ->assertSessionHasErrors('appointment_date');

    expect(Appointment::count())->toBe(0);
});

it('refuses the far-future date the old 365-day picker allowed', function () {
    // Six months out passed every client check before and was bounced by the
    // server — the exact mismatch the panel hit.
    ($this->book)(now()->addMonths(6)->toDateString())
        ->assertSessionHasErrors('appointment_date');

    expect(Appointment::count())->toBe(0);
});

it('refuses today', function () {
    ($this->book)(now()->toDateString())
        ->assertSessionHasErrors('appointment_date');

    expect(Appointment::count())->toBe(0);
});

it('refuses a date in the past', function () {
    ($this->book)(now()->subDay()->toDateString())
        ->assertSessionHasErrors('appointment_date');

    expect(Appointment::count())->toBe(0);
});

it('accepts the last day inside the window', function () {
    $max = now()->addMonths(BookingService::MAX_LEAD_MONTHS)->subDay();

    ($this->book)($max->toDateString())->assertSessionHasNoErrors();

    expect(Appointment::sole()->appointment_date->toDateString())
        ->toBe($max->toDateString());
});

it('accepts tomorrow, the first day inside the window', function () {
    ($this->book)(Carbon::tomorrow()->toDateString())
        ->assertSessionHasNoErrors();

    expect(Appointment::count())->toBe(1);
});
