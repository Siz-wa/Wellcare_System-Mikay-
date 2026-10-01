<?php

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * A patient may book more than once in a day.
 *
 * The rule used to be one appointment per patient per date, enforced by a bare
 * `exists()` in bookSlot(). It rejected the most ordinary shape of a clinic
 * day — a consultation in the morning and the lab work it orders after lunch —
 * so the front desk entered the second visit by hand, and the portal's record
 * of the day was wrong from the moment it was made.
 *
 * Two rules replace it:
 *
 *   1. Overlap. One person cannot be in two rooms at once, so a booking is
 *      refused when its [start, end) window meets another of theirs. The
 *      windows are half-open, which is what makes back-to-back visits legal.
 *   2. A daily maximum. Several visits is care; a dozen is one account holding
 *      slots nobody else can have.
 *
 * The doctor-level guards are unchanged and covered by DoubleBookingTest and
 * DailyPatientCapTest.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->otherDoctor = userWithRole('doctor');

    foreach ([$this->doctor, $this->otherDoctor] as $i => $doc) {
        DoctorProfile::create([
            'user_id' => $doc->id,
            'display_name' => "Dr. Test{$i}",
            'specialty' => 'general',
            'is_active' => true,
            // Above the per-patient maximum on purpose: these tests are about
            // the patient's own limit, and a doctor cap of 5 firing first would
            // quietly test the wrong guard.
            'max_patients_per_day' => 20,
        ]);

        AvailabilityBlock::create([
            'doctor_id' => $doc->id,
            'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'slot_duration_minutes' => 30,
            'is_available' => true,
        ]);
    }

    $this->date = Carbon::parse('next monday');
    $this->booking = app(BookingService::class);
    $this->guarantor = User::factory()->create();

    $this->book = function (array $overrides = []) {
        return $this->booking->bookSlot(array_merge([
            'user_id' => $this->guarantor->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'juan@example.com',
            'contact_number' => '09171234567',
            'age' => 30,
            'gender' => 'male',
            'service' => 'general',
            'branch' => 'Dasmarinas',
            'appointment_date' => $this->date->toDateString(),
            'appointment_time' => '9:00 AM',
            'patient_status' => 'new',
            'coverage' => 'cash',
            'doctor_id' => $this->doctor->id,
        ], $overrides));
    };
});

// ── The rule that changed ────────────────────────────────────────────────────

it('allows several appointments in one day at separate times', function () {
    ($this->book)();
    ($this->book)(['appointment_time' => '11:00 AM']);
    ($this->book)(['appointment_time' => '2:00 PM']);

    expect(Appointment::count())->toBe(3)
        ->and(Patient::count())->toBe(1);
});

it('allows back-to-back appointments because the window is half-open', function () {
    ($this->book)();

    // 9:00 plus 30 minutes ends exactly where 9:30 begins. Treating that as a
    // clash would make consecutive slots unbookable, which is the failure an
    // inclusive comparison produces.
    $second = ($this->book)(['appointment_time' => '9:30 AM']);

    expect($second->appointment_time)->toBe('9:30 AM')
        ->and(Appointment::count())->toBe(2);
});

it('allows two doctors in one day when the times do not meet', function () {
    ($this->book)();

    $second = ($this->book)([
        'doctor_id' => $this->otherDoctor->id,
        'appointment_time' => '10:00 AM',
    ]);

    expect($second->doctor_id)->toBe($this->otherDoctor->id)
        ->and(Appointment::count())->toBe(2);
});

// ── The rule that replaced it ────────────────────────────────────────────────

it('refuses a second appointment at the same time with a different doctor', function () {
    ($this->book)();

    expect(fn () => ($this->book)(['doctor_id' => $this->otherDoctor->id]))
        ->toThrow(SlotUnavailableException::class, 'already booked at 9:00 AM');

    expect(Appointment::count())->toBe(1);
});

it('refuses a partial overlap, not only an exact collision', function () {
    // Doctor A runs 30-minute slots from 09:00; doctor B runs 15-minute slots
    // from 09:15. Nothing about 9:15 AM is taken from doctor B's side — only
    // the patient's own 9:00–9:30 window makes it impossible.
    AvailabilityBlock::where('doctor_id', $this->otherDoctor->id)->delete();
    AvailabilityBlock::create([
        'doctor_id' => $this->otherDoctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:15:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 15,
        'is_available' => true,
    ]);

    ($this->book)();

    expect(fn () => ($this->book)([
        'doctor_id' => $this->otherDoctor->id,
        'appointment_time' => '9:15 AM',
    ]))->toThrow(SlotUnavailableException::class);

    expect(Appointment::count())->toBe(1);
});

it('caps how many appointments one patient may hold in a day', function () {
    foreach (['9:00 AM', '11:00 AM', '2:00 PM'] as $time) {
        ($this->book)(['appointment_time' => $time]);
    }

    expect(BookingService::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY)->toBe(3);

    expect(fn () => ($this->book)(['appointment_time' => '4:00 PM']))
        ->toThrow(SlotUnavailableException::class, 'maximum of 3 appointments');

    expect(Appointment::count())->toBe(3);
});

it('frees the day again when an appointment is cancelled', function () {
    $first = ($this->book)();
    ($this->book)(['appointment_time' => '11:00 AM']);
    ($this->book)(['appointment_time' => '2:00 PM']);

    $this->booking->cancelAppointment($first, 'Changed my mind.');

    // Both rules read the same "still occupies the calendar" predicate, so one
    // cancellation has to give back both the 9:00 window and the cap slot.
    $replacement = ($this->book)();

    expect($replacement->appointment_time)->toBe('9:00 AM')
        ->and(Appointment::whereNotIn('status', Appointment::RELEASED_STATUSES)->count())->toBe(3);
});

// ── What the booking form is shown ───────────────────────────────────────────

it('hides times the patient is already occupied at from the slot list', function () {
    $appointment = ($this->book)();
    $patientId = $appointment->patient_id;
    $date = $this->date->toDateString();

    $all = $this->booking->getAvailableSlots($this->otherDoctor->id, $date);
    $forPatient = $this->booking->getAvailableSlotsForPatient($this->otherDoctor->id, $date, $patientId);

    // The other doctor's 9:00 is genuinely free — it is only unbookable by this
    // patient, so it has to disappear from their list and stay in the general one.
    expect($all)->toContain('9:00 AM')
        ->and($forPatient)->not->toContain('9:00 AM')
        ->and($forPatient)->toContain('9:30 AM');
});

it('offers a patient with no bookings the full list', function () {
    $patient = Patient::create([
        'guarantor_id' => $this->guarantor->id,
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'email' => 'ana@example.com',
        'contact_number' => '09170000001',
        'gender' => 'female',
    ]);

    $date = $this->date->toDateString();

    expect($this->booking->getAvailableSlotsForPatient($this->doctor->id, $date, $patient->id))
        ->toBe($this->booking->getAvailableSlots($this->doctor->id, $date));
});

it('empties the slot list once the patient has hit their daily maximum', function () {
    $appointment = null;

    foreach (['9:00 AM', '11:00 AM', '2:00 PM'] as $time) {
        $appointment = ($this->book)(['appointment_time' => $time]);
    }

    $date = $this->date->toDateString();
    $patientId = $appointment->patient_id;

    expect($this->booking->remainingPatientCapacity($patientId, $date))->toBe(0)
        // The other doctor's day is untouched — full for this patient, open for
        // everyone else. The endpoint reports which of the two it is.
        ->and($this->booking->getAvailableSlotsForPatient($this->otherDoctor->id, $date, $patientId))
        ->toBe([])
        ->and($this->booking->getAvailableSlots($this->otherDoctor->id, $date))
        ->not->toBeEmpty();
});

// ── The duration each appointment carries ────────────────────────────────────

it('snapshots the slot length onto the appointment', function () {
    expect(($this->book)()->duration_minutes)->toBe(30);
});

it('keeps the snapshotted length when the doctor later reshapes their schedule', function () {
    $appointment = ($this->book)();

    AvailabilityBlock::where('doctor_id', $this->doctor->id)
        ->update(['slot_duration_minutes' => 15]);

    // The visit was booked as a 30-minute one and is still a 30-minute one.
    // Re-deriving from the schedule would shorten it retroactively, and the
    // overlap check would then admit a 9:15 booking against it.
    expect($appointment->fresh()->duration_minutes)->toBe(30);

    expect(fn () => ($this->book)([
        'doctor_id' => $this->otherDoctor->id,
        'appointment_time' => '9:15 AM',
    ]))->toThrow(SlotUnavailableException::class);
});
