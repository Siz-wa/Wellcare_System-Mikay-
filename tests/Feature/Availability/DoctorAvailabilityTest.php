<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * Doctor-managed availability.
 *
 * The day_of_week column is stored in the MySQL DAYOFWEEK convention
 * (1 = Sun … 7 = Sat), which matches neither Carbon (0 = Sun) nor ISO-8601
 * (1 = Mon). CLAUDE.md calls this out as the source of past bugs, so the
 * conversion is asserted directly rather than only through its effects.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
});

it('stores weekly hours in the MySQL DAYOFWEEK convention', function () {
    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'days' => [
                ['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '17:00', 'slot_duration_minutes' => 30], // Mon
                ['iso_day' => 7, 'start_time' => '10:00', 'end_time' => '14:00', 'slot_duration_minutes' => 20], // Sun
            ],
        ])
        ->assertRedirect();

    $blocks = AvailabilityBlock::where('doctor_id', $this->doctor->id)
        ->whereNotNull('day_of_week')
        ->get()
        ->keyBy('day_of_week');

    // ISO Monday (1) must land on DAYOFWEEK 2; ISO Sunday (7) on DAYOFWEEK 1.
    expect($blocks->keys()->sort()->values()->all())->toBe([1, 2]);
    expect($blocks[2]->start_time)->toStartWith('09:00');
    expect($blocks[1]->start_time)->toStartWith('10:00');
});

it('round-trips a weekday through storage and back to the editor', function () {
    // Every ISO day must survive write → read unchanged. An off-by-one here is
    // invisible until a patient books on the wrong day.
    $days = collect(range(1, 7))->map(fn (int $iso) => [
        'iso_day' => $iso,
        'start_time' => '08:00',
        'end_time' => '12:00',
        'slot_duration_minutes' => 30,
    ])->all();

    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', ['days' => $days])
        ->assertRedirect();

    $this->actingAs($this->doctor)
        ->get('/doctor/availability')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/availability/availability')
            ->has('weekly', 7)
        );

    $returned = collect(
        $this->actingAs($this->doctor)->get('/doctor/availability')
            ->viewData('page')['props']['weekly']
    )->pluck('isoDay')->sort()->values()->all();

    expect($returned)->toBe([1, 2, 3, 4, 5, 6, 7]);
});

it('makes slots bookable on the day the doctor opened', function () {
    $monday = Carbon::parse('next monday');

    // No schedule yet — nothing is bookable.
    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString()))
        ->toBeEmpty();

    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'days' => [
                ['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30],
            ],
        ])
        ->assertRedirect();

    // Fresh slots without waiting out the 60s cache proves the write busted it.
    $slots = app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString());

    expect($slots)->not->toBeEmpty()
        ->and(count($slots))->toBe(4); // 09:00, 09:30, 10:00, 10:30
});

it('clears a weekday that the doctor removed from the schedule', function () {
    $monday = Carbon::parse('next monday');

    $this->actingAs($this->doctor)->put('/doctor/availability/weekly', [
        'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30]],
    ]);

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString()))
        ->not->toBeEmpty();

    // Submitting a schedule without Monday must actually drop it, not leave an
    // orphan row still generating slots.
    $this->actingAs($this->doctor)->put('/doctor/availability/weekly', [
        'days' => [['iso_day' => 2, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30]],
    ]);

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString()))
        ->toBeEmpty();
});

it('blanks a date and cancels its pending appointments when time off is added', function () {
    $monday = Carbon::parse('next monday');

    $this->actingAs($this->doctor)->put('/doctor/availability/weekly', [
        'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30]],
    ]);

    $patient = Patient::factory()->create();
    $appointment = Appointment::factory()
        ->forPatient($patient)
        ->forDoctor($this->doctor)
        ->create([
            'appointment_date' => $monday->toDateString(),
            'status' => 'confirmed',
        ]);

    $this->actingAs($this->doctor)
        ->post('/doctor/availability/time-off', [
            'date' => $monday->toDateString(),
            'reason' => 'Conference leave.',
        ])
        ->assertRedirect();

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString()))
        ->toBeEmpty();

    $appointment->refresh();
    expect($appointment->status)->toBe('cancelled')
        ->and($appointment->cancellation_reason)->toBe('Conference leave.');
});

it('restores the weekday when the time off entry is removed', function () {
    $monday = Carbon::parse('next monday');

    $this->actingAs($this->doctor)->put('/doctor/availability/weekly', [
        'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30]],
    ]);
    $this->actingAs($this->doctor)->post('/doctor/availability/time-off', [
        'date' => $monday->toDateString(),
    ]);

    $block = AvailabilityBlock::where('doctor_id', $this->doctor->id)
        ->whereNotNull('specific_date')
        ->firstOrFail();

    $this->actingAs($this->doctor)
        ->delete("/doctor/availability/{$block->id}")
        ->assertRedirect();

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday->toDateString()))
        ->not->toBeEmpty();
});

it('rejects an end time that is not after the start time', function () {
    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'days' => [['iso_day' => 1, 'start_time' => '17:00', 'end_time' => '09:00', 'slot_duration_minutes' => 30]],
        ])
        ->assertSessionHasErrors('days.0.end_time');

    expect(AvailabilityBlock::count())->toBe(0);
});

it('rejects the same weekday listed twice', function () {
    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'days' => [
                ['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30],
                ['iso_day' => 1, 'start_time' => '13:00', 'end_time' => '15:00', 'slot_duration_minutes' => 30],
            ],
        ])
        ->assertSessionHasErrors('days');

    expect(AvailabilityBlock::count())->toBe(0);
});

it('stops a doctor deleting another doctors availability', function () {
    $otherDoctor = userWithRole('doctor');

    $this->actingAs($otherDoctor)->put('/doctor/availability/weekly', [
        'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30]],
    ]);

    $block = AvailabilityBlock::where('doctor_id', $otherDoctor->id)->firstOrFail();

    $this->actingAs($this->doctor)
        ->delete("/doctor/availability/{$block->id}")
        ->assertForbidden();

    expect(AvailabilityBlock::find($block->id))->not->toBeNull();
});

it('saves the daily patient cap alongside the hours', function () {
    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Test',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'daily_cap' => 3,
            'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '17:00', 'slot_duration_minutes' => 30]],
        ])
        ->assertRedirect();

    expect(app(BookingService::class)->dailyCapFor($this->doctor->id))->toBe(3);

    // A lowered cap must close the day right away, not after the 60s slot cache
    // expires — hence bustDoctorSlotCache() on the write.
    $monday = Carbon::parse('next monday')->toDateString();
    expect(count(app(BookingService::class)->getAvailableSlots($this->doctor->id, $monday)))
        ->toBeGreaterThan(0);
});

it('rejects a daily cap outside the allowed range', function () {
    $this->actingAs($this->doctor)
        ->put('/doctor/availability/weekly', [
            'daily_cap' => 0,
            'days' => [['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '17:00', 'slot_duration_minutes' => 30]],
        ])
        ->assertSessionHasErrors('daily_cap');
});

it('keeps non-doctors out of the availability page', function () {
    $this->actingAs(userWithRole('nurse'))->get('/doctor/availability')->assertForbidden();
    $this->actingAs(userWithRole('user'))->get('/doctor/availability')->assertForbidden();
});
