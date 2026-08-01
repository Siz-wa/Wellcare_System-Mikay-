<?php

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * The clinic's documented rule: "Each doctor has a limited schedule of up to
 * five patients per day."
 *
 * Nothing enforced this before — availability blocks generate slots purely from
 * start/end time and slot length, so a 09:00–17:00 block at 30 minutes offered
 * 16 bookable slots rather than 5.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Test',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    // A wide block on purpose: it generates far more time slots than the cap,
    // which is exactly the situation the cap has to survive.
    $this->date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->booking = app(BookingService::class);

    // Each booking needs a distinct person, or the per-patient one-per-day rule
    // fires before the cap does and we would be testing the wrong guard.
    $this->bookAs = function (string $name, string $time) {
        return $this->booking->bookSlot([
            'user_id' => User::factory()->create()->id,
            'first_name' => $name,
            'last_name' => 'Tester',
            'email' => strtolower($name).'@example.com',
            'contact_number' => '0917'.str_pad((string) crc32($name) % 1000000, 7, '0', STR_PAD_LEFT),
            'age' => 30,
            'gender' => 'male',
            'service' => 'general',
            'branch' => 'Dasmariñas',
            'appointment_date' => $this->date->toDateString(),
            'appointment_time' => $time,
            'patient_status' => 'new',
            'coverage' => 'cash',
            'doctor_id' => $this->doctor->id,
        ]);
    };
});

it('defaults every doctor to the clinic policy of five per day', function () {
    expect($this->booking->dailyCapFor($this->doctor->id))
        ->toBe(DoctorProfile::DEFAULT_DAILY_PATIENT_CAP)
        ->toBe(5);
});

it('accepts exactly the cap and refuses the next patient', function () {
    $times = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'];

    foreach ($times as $i => $time) {
        ($this->bookAs)("Patient{$i}", $time);
    }

    expect(Appointment::count())->toBe(5);

    // The block still has hours free — 11:30 AM onwards — but the day is full.
    expect(fn () => ($this->bookAs)('Overflow', '11:30 AM'))
        ->toThrow(SlotUnavailableException::class);

    expect(Appointment::count())->toBe(5);
});

it('reports no free slots once the cap is reached even with hours left', function () {
    foreach (['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'] as $i => $time) {
        ($this->bookAs)("Patient{$i}", $time);
    }

    expect($this->booking->getAvailableSlots($this->doctor->id, $this->date->toDateString()))
        ->toBeEmpty();
});

it('frees a place when an appointment is cancelled', function () {
    foreach (['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'] as $i => $time) {
        ($this->bookAs)("Patient{$i}", $time);
    }

    $this->booking->cancelAppointment(Appointment::first(), 'Changed my mind.');

    // Cancelled rows free their time slot, so they must free cap room too —
    // otherwise a day stays "full" with nobody actually coming in.
    expect($this->booking->getAvailableSlots($this->doctor->id, $this->date->toDateString()))
        ->not->toBeEmpty();

    ($this->bookAs)('Replacement', '11:30 AM');

    expect(Appointment::whereNot('status', 'cancelled')->count())->toBe(5);
});

it('honours a cap the doctor raised', function () {
    DoctorProfile::where('user_id', $this->doctor->id)->update(['max_patients_per_day' => 7]);

    foreach (['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] as $i => $time) {
        ($this->bookAs)("Patient{$i}", $time);
    }

    expect(Appointment::count())->toBe(6)
        ->and($this->booking->getAvailableSlots($this->doctor->id, $this->date->toDateString()))
        ->not->toBeEmpty();
});

it('caps each doctor separately', function () {
    $otherDoctor = userWithRole('doctor');
    DoctorProfile::create([
        'user_id' => $otherDoctor->id,
        'display_name' => 'Dr. Other',
        'specialty' => 'general',
        'is_active' => true,
    ]);
    AvailabilityBlock::create([
        'doctor_id' => $otherDoctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    foreach (['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'] as $i => $time) {
        ($this->bookAs)("Patient{$i}", $time);
    }

    // First doctor is full; the second must be untouched by that.
    expect($this->booking->getAvailableSlots($this->doctor->id, $this->date->toDateString()))
        ->toBeEmpty()
        ->and($this->booking->getAvailableSlots($otherDoctor->id, $this->date->toDateString()))
        ->not->toBeEmpty();
});
