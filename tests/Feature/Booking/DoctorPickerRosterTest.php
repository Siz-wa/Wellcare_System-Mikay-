<?php

use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\User;

/**
 * Who the booking picker offers, and what it says about their hours.
 *
 * Two separate complaints, one cause. The picker listed every active doctor
 * whether or not an administrator had ever published their hours, and the only
 * thing the wizard said when a patient then picked a date was "This doctor has
 * no availability configured for 2026-09-15" — a sentence about a database
 * table, which never named the days the doctor does work.
 *
 * So the roster is now part of the picker's data: a doctor with no published
 * weekly hours is not offered at all, and one who is offered arrives carrying
 * the days they keep clinic.
 */
beforeEach(function () {
    $this->patient = userWithRole('user');
});

/**
 * A doctor on the roster, optionally with published weekly hours.
 *
 * `approval_status` is the whole point of the fixture: the same row in `draft`
 * or `pending` generates no bookable slot, so a doctor who has only those is
 * indistinguishable, to a patient, from one with no hours at all.
 */
function rosteredDoctor(string $name, string $specialty, ?string $approval, array $isoDays = [1]): User
{
    $doctor = User::factory()->role('doctor')->create();

    DoctorProfile::create([
        'user_id' => $doctor->id,
        'display_name' => $name,
        'specialty' => $specialty,
        'is_active' => true,
    ]);

    if ($approval !== null) {
        foreach ($isoDays as $isoDay) {
            AvailabilityBlock::create([
                'doctor_id' => $doctor->id,
                'day_of_week' => AvailabilityBlock::isoToStoredDay($isoDay),
                'start_time' => '09:00',
                'end_time' => '17:00',
                'slot_duration_minutes' => 30,
                'is_available' => true,
                'approval_status' => $approval,
            ]);
        }
    }

    return $doctor;
}

/** The doctor ids the booking page offered. */
function offeredDoctorIds($page): array
{
    return collect($page->toArray()['props']['doctors'])->pluck('id')->all();
}

// ── Who is offered ───────────────────────────────────────────────────────────

it('offers a doctor whose weekly hours an administrator has published', function () {
    $doctor = rosteredDoctor('Dr. Published', 'general', AvailabilityBlock::APPROVAL_PUBLISHED);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(fn ($page) => expect(offeredDoctorIds($page))->toContain($doctor->id));
});

it('does not offer a doctor with no weekly hours at all', function () {
    $doctor = rosteredDoctor('Dr. Unrostered', 'general', null);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(fn ($page) => expect(offeredDoctorIds($page))->not->toContain($doctor->id));
});

// A roster the doctor has written but nobody has approved is exactly as
// unbookable as no roster — BookingService reads through scopePublished — so
// offering it is a dead end on every date in the booking window.
it('does not offer a doctor whose hours are still awaiting approval', function (string $approval) {
    $doctor = rosteredDoctor('Dr. Waiting', 'general', $approval);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(fn ($page) => expect(offeredDoctorIds($page))->not->toContain($doctor->id));
})->with([
    'a draft' => AvailabilityBlock::APPROVAL_DRAFT,
    'awaiting an administrator' => AvailabilityBlock::APPROVAL_PENDING,
]);

it('does not offer a doctor whose only published block is an Out of Office', function () {
    $doctor = rosteredDoctor('Dr. Away', 'general', AvailabilityBlock::APPROVAL_PUBLISHED);

    AvailabilityBlock::where('doctor_id', $doctor->id)->update(['is_available' => false]);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(fn ($page) => expect(offeredDoctorIds($page))->not->toContain($doctor->id));
});

// ── What is said about their hours ───────────────────────────────────────────

it('carries the days each offered doctor holds clinic', function () {
    // Mon and Wed, same hours, so they collapse into one display row.
    $doctor = rosteredDoctor('Dr. Weekly', 'cardiology', AvailabilityBlock::APPROVAL_PUBLISHED, [1, 3]);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(function ($page) use ($doctor) {
            $offered = collect($page->toArray()['props']['doctors'])
                ->firstWhere('id', $doctor->id);

            expect($offered['schedules'])->toBe([
                ['days' => 'Mon / Wed', 'hours' => '9AM – 5PM'],
            ]);
        });
});

it('never advertises unapproved hours as clinic days', function () {
    $doctor = rosteredDoctor('Dr. Mixed', 'general', AvailabilityBlock::APPROVAL_PUBLISHED, [1]);

    // A second day the doctor has proposed and nobody has approved. It must not
    // reach the patient: it generates no slot, so naming it as a clinic day
    // sends them to a date that will come back empty.
    AvailabilityBlock::create([
        'doctor_id' => $doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(5),
        'start_time' => '09:00',
        'end_time' => '17:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
        'approval_status' => AvailabilityBlock::APPROVAL_PENDING,
    ]);

    $this->actingAs($this->patient)
        ->get('/book')
        ->assertOk()
        ->assertInertia(function ($page) use ($doctor) {
            $offered = collect($page->toArray()['props']['doctors'])
                ->firstWhere('id', $doctor->id);

            expect($offered['schedules'])->toBe([
                ['days' => 'Mon', 'hours' => '9AM – 5PM'],
            ]);
        });
});

// ── Deep links from the public pages ─────────────────────────────────────────

// "Book this service" on the public services page carries the choice the
// patient already made. Nothing read it until now, so every one of those links
// dropped them on an empty dropdown and asked them to choose again.
it('opens the wizard on the service the link asked for', function () {
    $this->actingAs($this->patient)
        ->get('/book?service=laboratory')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('prefill.service', 'laboratory'));
});

it('preselects a video consultation when the link asks for one', function () {
    $this->actingAs($this->patient)
        ->get('/book?type=virtual')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('prefill.consultationType', 'virtual'));
});

// The query string is user-editable, and writing an unknown slug into the form
// would fail validation at submit with nothing on screen to explain why.
it('ignores a service the catalogue does not know', function (string $service) {
    $this->actingAs($this->patient)
        ->get("/book?service={$service}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('prefill.service', null));
})->with([
    // The four the public services page used to link to, none of which ever
    // existed as bookable services.
    'consultation' => 'consultation',
    'preventive' => 'preventive',
    'emergency' => 'emergency',
    'telemedicine' => 'telemedicine',
    'nonsense' => 'not-a-service',
]);
