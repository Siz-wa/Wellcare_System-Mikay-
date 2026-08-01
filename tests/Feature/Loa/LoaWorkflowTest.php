<?php

use App\Exceptions\InvalidLoaTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;
use App\Services\LoaService;
use Carbon\Carbon;

/**
 * The booking → HR → patient LOA workflow (Fig. 6 processes 3 and 4), plus the
 * guards that keep it in order.
 *
 * The point of the module is that `appointments.status` is *derived* from the
 * LOA, so every transition test asserts both rows moved together — a passing
 * LOA status with a stuck appointment is the exact bug this replaces.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->hr = userWithRole('hr');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Test',
        'specialty' => 'general',
        'is_active' => true,
    ]);
    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->date = Carbon::parse('next monday');
    $this->booking = app(BookingService::class);
    $this->loa = app(LoaService::class);

    $this->book = function (array $overrides = []) {
        return $this->booking->bookSlot(array_merge([
            'user_id' => User::factory()->role('user')->create()->id,
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
            'coverage' => 'hmo',
            'hmo' => 'Maxicare',
            'hmo_id' => 'MX-00099',
            'doctor_id' => $this->doctor->id,
        ], $overrides));
    };
});

// ── Creation at booking ───────────────────────────────────────────────────────

it('creates exactly one submitted LOA when booking under HMO coverage', function () {
    $appointment = ($this->book)();

    expect(LoaRequest::count())->toBe(1);

    $loa = LoaRequest::firstOrFail();

    expect($loa->status)->toBe('submitted')
        ->and($loa->appointment_id)->toBe($appointment->id)
        ->and($loa->patient_id)->toBe($appointment->patient_id)
        ->and($loa->user_id)->toBe($appointment->user_id)
        ->and($loa->hmo_provider)->toBe('Maxicare')
        ->and($loa->hmo_id)->toBe('MX-00099')
        ->and($loa->requested_at)->not->toBeNull()
        ->and($loa->approved_at)->toBeNull()
        ->and($loa->rejected_at)->toBeNull()
        ->and($loa->approved_by)->toBeNull();

    // The appointment still waits on HR — submit() must not release it.
    expect($appointment->status)->toBe('pending_hmo_approval');
});

it('creates no LOA for cash or philhealth coverage', function (string $coverage) {
    $appointment = ($this->book)([
        'coverage' => $coverage,
        'hmo' => null,
        'hmo_id' => null,
    ]);

    expect(LoaRequest::count())->toBe(0)
        ->and($appointment->status)->toBe('requested');
})->with(['cash', 'philhealth']);

it('notifies every HR officer when an LOA is submitted', function () {
    $secondOfficer = userWithRole('hr');

    ($this->book)();

    $notifications = AppointmentNotification::where('type', 'hmo_submitted')->get();

    expect($notifications)->toHaveCount(2)
        ->and($notifications->pluck('user_id')->sort()->values()->all())
        ->toBe(collect([$this->hr->id, $secondOfficer->id])->sort()->values()->all());
});

it('gives every LOA a unique reference number', function () {
    // Three different people so the per-patient one-per-day rule does not fire.
    ($this->book)();
    ($this->book)([
        'first_name' => 'Maria', 'last_name' => 'Santos',
        'contact_number' => '09180000001', 'appointment_time' => '10:00 AM',
    ]);
    ($this->book)([
        'first_name' => 'Pedro', 'last_name' => 'Cruz',
        'contact_number' => '09180000002', 'appointment_time' => '11:00 AM',
    ]);

    $numbers = LoaRequest::pluck('loa_number');

    expect($numbers)->toHaveCount(3)
        ->and($numbers->unique())->toHaveCount(3)
        ->and($numbers->first())->toStartWith('WC-LOA-');
});

// ── Approval ──────────────────────────────────────────────────────────────────

it('releases the appointment to the doctor when HR approves', function () {
    $appointment = ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->actingAs($this->hr)
        ->post("/hr/hmo-approvals/{$loa->id}/approve", [
            'remarks' => 'Coverage verified with Maxicare.',
            'valid_until' => today()->addDays(30)->toDateString(),
        ])
        ->assertRedirect();

    $loa->refresh();
    $appointment->refresh();

    expect($loa->status)->toBe('approved')
        ->and($loa->approved_by)->toBe($this->hr->id)
        ->and($loa->approved_at)->not->toBeNull()
        ->and($loa->rejected_at)->toBeNull()
        ->and($loa->remarks)->toBe('Coverage verified with Maxicare.')
        ->and($loa->valid_until->toDateString())->toBe(today()->addDays(30)->toDateString())
        // The derived half — this is the whole point of the module.
        ->and($appointment->status)->toBe('requested');
});

it('notifies the guarantor when an LOA is approved', function () {
    $appointment = ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->loa->approve($loa, $this->hr);

    $notification = AppointmentNotification::where('type', 'hmo_approved')->firstOrFail();

    expect($notification->user_id)->toBe($appointment->user_id)
        ->and($notification->appointment_id)->toBe($appointment->id)
        ->and($notification->body)->toContain($loa->loa_number);
});

// ── Rejection ─────────────────────────────────────────────────────────────────

it('cancels the appointment with the reason when HR rejects', function () {
    $appointment = ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->actingAs($this->hr)
        ->post("/hr/hmo-approvals/{$loa->id}/reject", [
            'reason' => 'Member ID not recognised by Maxicare.',
        ])
        ->assertRedirect();

    $loa->refresh();
    $appointment->refresh();

    expect($loa->status)->toBe('rejected')
        ->and($loa->approved_by)->toBe($this->hr->id)
        ->and($loa->rejected_at)->not->toBeNull()
        ->and($loa->approved_at)->toBeNull()
        ->and($loa->remarks)->toBe('Member ID not recognised by Maxicare.')
        ->and($appointment->status)->toBe('cancelled')
        // A bare "cancelled" tells the patient nothing — the reason travels.
        ->and($appointment->cancellation_reason)->toBe('Member ID not recognised by Maxicare.')
        ->and($appointment->cancelled_at)->not->toBeNull();
});

it('requires a reason to reject', function () {
    ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->actingAs($this->hr)
        ->post("/hr/hmo-approvals/{$loa->id}/reject", [])
        ->assertSessionHasErrors('reason');

    expect($loa->fresh()->status)->toBe('submitted');
});

// ── Transition guards ─────────────────────────────────────────────────────────

it('refuses to decide an LOA twice', function (string $first, string $second) {
    ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->loa->{$first}($loa, $this->hr, 'First decision.');

    expect(fn () => $this->loa->{$second}($loa->fresh(), $this->hr, 'Second decision.'))
        ->toThrow(InvalidLoaTransitionException::class);
})->with([
    'approve then approve' => ['approve', 'approve'],
    'approve then reject' => ['approve', 'reject'],
    'reject then approve' => ['reject', 'approve'],
    'reject then reject' => ['reject', 'reject'],
]);

it('surfaces a double decision as a form error rather than a crash', function () {
    ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->loa->approve($loa, $this->hr);

    $this->actingAs($this->hr)
        ->post("/hr/hmo-approvals/{$loa->id}/approve", [])
        ->assertSessionHasErrors('remarks');
});

it('refuses a validity date in the past', function () {
    ($this->book)();
    $loa = LoaRequest::firstOrFail();

    $this->actingAs($this->hr)
        ->post("/hr/hmo-approvals/{$loa->id}/approve", [
            'valid_until' => today()->subDay()->toDateString(),
        ])
        ->assertSessionHasErrors('valid_until');

    expect($loa->fresh()->status)->toBe('submitted');
});

// ── Expiry is derived, not stored ─────────────────────────────────────────────

it('reports an approved LOA past its validity date as expired', function () {
    $loa = LoaRequest::factory()
        ->for(Patient::factory(), 'patient')
        ->expired()
        ->create();

    expect($loa->status)->toBe('approved')   // nothing sweeps the column yet
        ->and($loa->is_expired)->toBeTrue()
        ->and($loa->display_status)->toBe('expired');
});

it('does not report an in-date approved LOA as expired', function () {
    $loa = LoaRequest::factory()
        ->for(Patient::factory(), 'patient')
        ->approved()
        ->create();

    expect($loa->is_expired)->toBeFalse()
        ->and($loa->display_status)->toBe('approved');
});

// ── HR queue ──────────────────────────────────────────────────────────────────

it('lists only undecided LOAs in the HR queue', function () {
    $patient = Patient::factory()->create();

    LoaRequest::factory()->forPatient($patient)->count(2)->create();
    LoaRequest::factory()->forPatient($patient)->approved()->create();
    LoaRequest::factory()->forPatient($patient)->rejected()->create();

    $this->actingAs($this->hr)
        ->get('/hr/hmo-approvals')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('hr/hmo-approvals/hmo-approvals')
            ->has('appointments', 2)
            ->where('stats.pending', 2)
        );
});

it('keeps an appointment out of the doctor queue until its LOA is approved', function () {
    ($this->book)();
    $loa = LoaRequest::firstOrFail();

    expect(Appointment::where('status', 'requested')->count())->toBe(0);

    $this->loa->approve($loa, $this->hr);

    expect(Appointment::where('status', 'requested')->count())->toBe(1);
});
