<?php

use App\Models\Appointment;
use App\Models\Patient;

/**
 * The patient dashboard payload.
 *
 * The board's whole job is to answer "who is this for, and when" for an account
 * that may guarantee a spouse, three children and a parent. Every assertion here
 * guards one of the three things the flat list got wrong: it named nobody, it
 * separated nothing, and it ordered a single day's visits by string comparison.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');

    $this->alice = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Alice',
        'last_name' => 'Reyes',
        'relationship_to_guarantor' => 'self',
    ]);

    $this->bien = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Bien',
        'last_name' => 'Reyes',
        'relationship_to_guarantor' => 'child',
    ]);
});

// ── Who ───────────────────────────────────────────────────────────────────────

it('names the person every upcoming appointment is for', function () {
    Appointment::factory()->forPatient($this->bien)->create([
        'appointment_date' => now()->addDays(2)->toDateString(),
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/dashboard')
            ->where('appointments.0.patientName', 'Bien Reyes')
            ->where('appointments.0.patientInitials', 'BR')
            ->where('appointments.0.patientRelation', 'Child')
            ->where('appointments.0.patientKey', "patient:{$this->bien->id}")
            ->where('appointments.0.isSelf', false)
        );
});

it('keeps two people on one account in separate filter groups', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDays(1)->toDateString(),
    ]);
    Appointment::factory()->count(2)->forPatient($this->bien)->create([
        'appointment_date' => now()->addDays(2)->toDateString(),
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('appointmentPatients', 2)
            ->where('appointmentPatients.0.name', 'Alice Reyes')
            ->where('appointmentPatients.0.count', 1)
            ->where('appointmentPatients.0.isSelf', true)
            ->where('appointmentPatients.1.name', 'Bien Reyes')
            ->where('appointmentPatients.1.count', 2)
        );
});

// A booking made before `patient_id` was fillable has no Patient row behind it.
// Collapsing every such appointment into one nameless group is exactly the
// record-bleed the domain model warns about, so the name on the row is the key.
it('falls back to the name on the row when no patient record is linked', function () {
    Appointment::factory()->create([
        'user_id' => $this->guarantor->id,
        'patient_id' => null,
        'first_name' => 'Legacy',
        'last_name' => 'Booking',
        'appointment_date' => now()->addDays(3)->toDateString(),
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.patientName', 'Legacy Booking')
            ->where('appointments.0.patientKey', 'name:legacy booking')
            ->where('appointments.0.patientRelation', null)
        );
});

// ── When ──────────────────────────────────────────────────────────────────────

// `appointment_time` is a varchar of "9:00 AM" strings, so ORDER BY files
// 1:00 PM before 9:00 AM. The board groups by day, which makes a day's rows
// sit next to each other — and any mis-ordering immediately visible.
it('orders one days appointments chronologically, not alphabetically', function () {
    $date = now()->addDays(4)->toDateString();

    foreach (['1:00 PM', '10:30 AM', '9:00 AM'] as $time) {
        Appointment::factory()->forPatient($this->alice)->create([
            'appointment_date' => $date,
            'appointment_time' => $time,
        ]);
    }

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.time', '9:00 AM')
            ->where('appointments.1.time', '10:30 AM')
            ->where('appointments.2.time', '1:00 PM')
        );
});

it('buckets each appointment under the day separator it belongs to', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->toDateString(),
        'appointment_time' => '9:00 AM',
    ]);
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDay()->toDateString(),
        'appointment_time' => '9:00 AM',
    ]);
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDays(20)->toDateString(),
        'appointment_time' => '9:00 AM',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.bucket', 'today')
            ->where('appointments.0.dayLabel', 'Today')
            ->where('appointments.1.bucket', 'tomorrow')
            ->where('appointments.1.dayLabel', 'Tomorrow')
            ->where('appointments.2.bucket', 'later')
        );
});

// An open request whose date has slipped past is not "today" — filing it there
// is how a patient stops noticing the clinic never actioned it.
it('flags a still-open appointment whose date has passed', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->subDays(2)->toDateString(),
        'status' => 'requested',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.bucket', 'overdue')
            ->where('appointments.0.isPast', true)
        );
});

// ── Counts and history ────────────────────────────────────────────────────────

it('counts what the patient can act on', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->toDateString(),
        'status' => 'confirmed',
    ]);
    Appointment::factory()->forPatient($this->bien)->create([
        'appointment_date' => now()->addDays(5)->toDateString(),
        'status' => 'requested',
    ]);
    Appointment::factory()->forPatient($this->bien)->create([
        'appointment_date' => now()->addDays(6)->toDateString(),
        'status' => 'pending_hmo_approval',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.upcoming', 3)
            ->where('stats.today', 1)
            ->where('stats.confirmed', 1)
            // Both an HR coverage check and a doctor review are waits the
            // patient is powerless over — they belong in one count.
            ->where('stats.awaiting', 2)
        );
});

it('keeps finished visits out of the board and in the history panel', function () {
    Appointment::factory()->forPatient($this->alice)->completed()->create();
    Appointment::factory()->forPatient($this->bien)->cancelled()->create();

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('appointments', 0)
            ->has('pastByPatient', 2)
            ->where('pastByPatient.0.patient', 'Alice Reyes')
            ->where('pastByPatient.0.relation', 'Myself')
            ->has('pastByPatient.0.records', 1)
        );
});

it('does not show one account the appointments of another', function () {
    $stranger = userWithRole('user');
    $strangersPatient = Patient::factory()->forGuarantor($stranger)->create();
    Appointment::factory()->forPatient($strangersPatient)->create();

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('appointments', 0)
            ->has('appointmentPatients', 0)
        );
});

// ── Actions offered on a card ─────────────────────────────────────────────────

// Check-in is a day-of action. `canCheckIn` used to be `status === 'confirmed'`
// alone, which left a live "Check In Now" button on a visit three weeks out and
// on one whose date passed a month ago.
//
// That rule is now behind `booking.enforce_checkin_day`, which is false while
// the system is in testing — so the tests that assert the rule turn it on
// explicitly rather than inheriting whatever the environment is set to. The
// relaxed behaviour has its own tests further down.
it('offers check-in only on the day of the appointment', function () {
    config(['booking.enforce_checkin_day' => true]);

    $today = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->toDateString(),
        'status' => 'confirmed',
    ]);
    $later = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDays(9)->toDateString(),
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.id', $today->id)
            ->where('appointments.0.canCheckIn', true)
            ->where('appointments.1.id', $later->id)
            ->where('appointments.1.canCheckIn', false)
        );
});

it('withdraws both actions once the date has passed', function () {
    config(['booking.enforce_checkin_day' => true]);

    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->subDay()->toDateString(),
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.canCheckIn', false)
            ->where('appointments.0.canCancel', false)
        );
});

it('still offers cancel while the visit is ahead', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDays(3)->toDateString(),
        'status' => 'requested',
    ]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.canCancel', true)
        );
});

// Hiding a button is not closing a door: the endpoint used to accept any
// confirmed appointment and fire a "patient has arrived" notification at the
// doctor for a visit that was weeks away, or already over.
it('refuses a check-in posted for a date that is not today', function (string $date) {
    config(['booking.enforce_checkin_day' => true]);

    $appointment = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => $date,
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->from(route('user.dashboard'))
        ->post("/user/appointments/{$appointment->id}/check-in")
        ->assertSessionHasErrors('checkin');

    expect($appointment->fresh()->status)->toBe('confirmed');
})->with([
    'a future date' => fn () => now()->addDays(5)->toDateString(),
    'a passed date' => fn () => now()->subDays(5)->toDateString(),
]);

it('accepts a check-in on the day itself', function () {
    config(['booking.enforce_checkin_day' => true]);

    $appointment = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->toDateString(),
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->from(route('user.dashboard'))
        ->post("/user/appointments/{$appointment->id}/check-in")
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->status)->toBe('checked_in');
});

// ── Check-in with the day-of rule relaxed (the testing default) ──────────────
//
// Relaxing the date must not relax anything else: the two checks that stop one
// account checking in against another's appointment, or checking in a visit no
// doctor has confirmed, are independent of the flag and are asserted here so a
// later change to the flag cannot quietly take them with it.

it('accepts a check-in on any date while the day-of rule is off', function (string $date) {
    config(['booking.enforce_checkin_day' => false]);

    $appointment = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => $date,
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->from(route('user.dashboard'))
        ->post("/user/appointments/{$appointment->id}/check-in")
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->status)->toBe('checked_in');
})->with([
    'a future date' => fn () => now()->addDays(5)->toDateString(),
    'a passed date' => fn () => now()->subDays(5)->toDateString(),
]);

it('offers check-in on a future card while the day-of rule is off', function () {
    Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->addDays(9)->toDateString(),
        'status' => 'confirmed',
    ]);

    config(['booking.enforce_checkin_day' => false]);

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.canCheckIn', true)
        );
});

it('still refuses a check-in on an unconfirmed appointment with the rule off', function () {
    config(['booking.enforce_checkin_day' => false]);

    $appointment = Appointment::factory()->forPatient($this->alice)->create([
        'appointment_date' => now()->toDateString(),
        'status' => 'requested',
    ]);

    $this->actingAs($this->guarantor)
        ->from(route('user.dashboard'))
        ->post("/user/appointments/{$appointment->id}/check-in")
        ->assertSessionHasErrors('checkin');

    expect($appointment->fresh()->status)->toBe('requested');
});

it('still refuses a check-in on an appointment belonging to another account with the rule off', function () {
    config(['booking.enforce_checkin_day' => false]);

    $stranger = userWithRole('user');
    $theirPatient = Patient::factory()->forGuarantor($stranger)->create();
    $appointment = Appointment::factory()->forPatient($theirPatient)->create([
        'appointment_date' => now()->toDateString(),
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->guarantor)
        ->post("/user/appointments/{$appointment->id}/check-in")
        ->assertForbidden();

    expect($appointment->fresh()->status)->toBe('confirmed');
});

// ── The route the booking success screen sends people to ─────────────────────

/**
 * "View My Appointments" on the post-booking screen points at the patient
 * dashboard rather than `appointments.index`, because the dashboard is where
 * the visit they just booked actually appears alongside the controls that act
 * on it.
 *
 * Retargeting a link is only safe if the new destination is open to whoever
 * follows it. `/book` and `/user/dashboard` share the `role:user` gate, so
 * anyone who reached the success screen can open the dashboard — this is the
 * assertion that keeps the button from turning into a 403 the way the admin
 * landing page once did (see tests/Feature/DashboardTest.php).
 */
it('is open to the same audience that can reach the booking page', function () {
    $this->actingAs($this->guarantor)->get(route('book'))->assertOk();

    $this->actingAs($this->guarantor)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('user/dashboard'));
});
