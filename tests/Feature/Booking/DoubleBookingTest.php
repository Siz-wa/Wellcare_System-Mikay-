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
 * The panel reported being able to book the same day and time twice.
 *
 * Three guards are supposed to prevent it: a unique index on a generated
 * active_slot_key column, a lockForUpdate slot check, and a per-patient
 * one-appointment-per-day rule. These tests pin down what each one actually
 * covers — and, importantly, what none of them cover.
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

    // One guarantor for the whole file unless a test overrides it. Patient
    // dedup is scoped per guarantor, so sharing the account is what keeps
    // "the same person booking twice" resolving to one Patient row.
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
            'branch' => 'Dasmariñas',
            'appointment_date' => $this->date->toDateString(),
            'appointment_time' => '9:00 AM',
            'patient_status' => 'new',
            'coverage' => 'cash',
            'doctor_id' => $this->doctor->id,
        ], $overrides));
    };
});

it('refuses the same doctor, date and time for a different person', function () {
    ($this->book)();

    // Different person entirely — only the slot collides.
    expect(fn () => ($this->book)([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria@example.com',
        'contact_number' => '09189999999',
    ]))->toThrow(SlotUnavailableException::class);

    expect(Appointment::count())->toBe(1);
});

it('refuses the same patient twice on one day even at a different time', function () {
    ($this->book)();

    expect(fn () => ($this->book)(['appointment_time' => '2:00 PM']))
        ->toThrow(SlotUnavailableException::class);

    expect(Appointment::count())->toBe(1);
});

it('treats one person booked twice through the same account as the same patient', function () {
    ($this->book)();

    // The same person, same guarantor, a later slot. The dedup in
    // Patient::findOrCreateFromBooking() is what makes this collide.
    expect(fn () => ($this->book)(['appointment_time' => '3:00 PM']))
        ->toThrow(SlotUnavailableException::class);

    expect(Patient::count())->toBe(1);
});

/**
 * The dedup is scoped to the guarantor, and this is why.
 *
 * Matching on lowercased name + contact_number alone is not identity — two
 * unrelated families can collide on it. Reusing the found row would hand the
 * second booking a Patient owned by someone else, and every allergy, diagnosis
 * and document on that record would come with it. `guarantor_id` is never
 * reassigned on the found branch, so the bleed would be silent and permanent.
 *
 * Two accounts therefore mean two records, even when the details match exactly.
 */
it('keeps identical details under two different accounts as separate patients', function () {
    ($this->book)();

    $second = ($this->book)([
        'user_id' => User::factory()->create()->id,
        'appointment_time' => '3:00 PM',
    ]);

    expect($second)->not->toBeNull()
        ->and(Patient::count())->toBe(2)
        ->and(Patient::pluck('guarantor_id')->unique())->toHaveCount(2);
});

/**
 * This is the gap the panel most likely hit.
 *
 * Patient dedup keys on lowercased first + last name + contact_number. Change
 * any one of those and a second Patient row is created, so the per-patient
 * one-per-day rule never fires. Booking a different doctor at the same time
 * then avoids the slot guard too — and the booking succeeds.
 *
 * Whether that is a bug is a policy question, not a technical one: two genuinely
 * different people may well see two different doctors at 9 AM. It only looks
 * wrong when it is the SAME person who typed their details differently.
 */
it('allows the same time with a different doctor when details differ', function () {
    ($this->book)();

    $second = ($this->book)([
        'contact_number' => '09180000000',   // one digit different → new Patient
        'doctor_id' => $this->otherDoctor->id,
    ]);

    expect($second)->not->toBeNull()
        ->and(Appointment::count())->toBe(2)
        ->and(Patient::count())->toBe(2)
        ->and($second->appointment_time)->toBe('9:00 AM');
});

it('lets a cancelled slot be rebooked', function () {
    $first = ($this->book)();
    $this->booking->cancelAppointment($first, 'Changed my mind.');

    $second = ($this->book)([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria@example.com',
        'contact_number' => '09189999999',
    ]);

    // active_slot_key collapses to NULL for cancelled rows, so the unique index
    // permits the replacement — a freed slot must not stay locked forever.
    expect($second->appointment_time)->toBe('9:00 AM')
        ->and(Appointment::whereNot('status', 'cancelled')->count())->toBe(1);
});
