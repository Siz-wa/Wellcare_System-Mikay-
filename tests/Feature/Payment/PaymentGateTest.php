<?php

use App\Exceptions\InvalidConsultationTransitionException;
use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Models\PaymentVerification;
use App\Services\ConsultationSessionService;

/**
 * Gate G5 — the software standing where the cashier stands.
 *
 * In the clinic a patient walks past a cashier on the way to the consulting
 * room. On a video call there is nobody in that position, which is the entire
 * reason `coverage = cash` on a virtual booking was incoherent before this
 * module: the visit could happen and nothing in the system knew a fee existed.
 *
 * These tests are the part that closes it. The gate is deliberately narrow —
 * it must hold an unpaid video consultation shut, and it must be invisible to
 * every other kind of visit in the system, including the hundred appointments
 * that predate the payments table.
 */
beforeEach(function () {
    $this->service = app(ConsultationSessionService::class);

    $this->doctor = userWithRole('doctor');
    $this->booker = userWithRole('user');

    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in', 'coverage' => 'cash']);
});

// ── The gate holds ────────────────────────────────────────────────────────────

it('refuses to open the video room while the fee is unpaid', function (string $state) {
    PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->{$state}()
        ->create();

    expect(fn () => $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class, 'has not been paid for yet');
})->with([
    'pending',      // nothing declared
    'submitted',    // declared but unchecked — a claim is not payment
    'rejected',     // checked and not found
]);

it('leaves no consultation session behind when it refuses', function () {
    PaymentVerification::factory()->forAppointment($this->appointment)->create();

    try {
        $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor);
    } catch (InvalidConsultationTransitionException) {
        // expected
    }

    // Checked before ensureSession() precisely so an unsettled visit does not
    // accumulate a half-made consultation row that later reads as a real one.
    expect(ConsultationSession::count())->toBe(0);
});

// ── The gate opens ────────────────────────────────────────────────────────────

it('opens the video room once the clinic has settled the record', function (string $state) {
    PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->{$state}()
        ->create();

    $session = $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor);

    expect($session->consultation_status)->toBe('waiting')
        ->and($session->room_id)->not->toBeNull();
})->with([
    'verified',     // the money arrived and someone checked
    'waived',       // the clinic chose not to collect
]);

// ── The gate is invisible to everything else ──────────────────────────────────

it('never blocks an HMO video visit, which HR already cleared through its LOA', function () {
    // An HMO booking owes nothing here and never gets a record. Reading a
    // missing record as "unpaid" for it would lock it out of its own call.
    $this->appointment->update(['coverage' => 'hmo']);

    $session = $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor);

    expect($session->consultation_status)->toBe('waiting')
        ->and(PaymentVerification::count())->toBe(0);
});

it('holds a PhilHealth or corporate video visit until HR settles it', function (string $coverage) {
    // Nobody checks a PhilHealth card or a company ID over a video call, so
    // these were free consultations. Booking now refuses them; any that exist
    // anyway get a bill HR can verify, or waive once the coverage is confirmed.
    $this->appointment->update(['coverage' => $coverage]);

    expect(fn () => $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class, 'has not been paid for yet');

    expect(PaymentVerification::where('appointment_id', $this->appointment->id)->sole()->status)
        ->toBe('pending');
})->with(['philhealth', 'corporate']);

it('reports a covered or in-person visit with no payment record as settled', function () {
    $this->appointment->update(['coverage' => 'hmo']);
    expect($this->appointment->fresh()->isSettledForConsultation())->toBeTrue();

    $this->appointment->update(['coverage' => 'cash', 'consultation_type' => 'in_person']);
    expect($this->appointment->fresh()->isSettledForConsultation())->toBeTrue();
});

// ── Self-pay video visits booked before the payment module ───────────────────

it('treats a self-paid video visit with no payment record as unpaid', function () {
    // The hole this closes: such visits were read as settled, and one went
    // through to a finished call without anyone paying.
    expect(PaymentVerification::count())->toBe(0)
        ->and($this->appointment->isSettledForConsultation())->toBeFalse();
});

it('refuses the room for a self-paid video visit with no record, and raises its bill', function () {
    expect(fn () => $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class, 'has not been paid for yet');

    // Raised, so the patient is told what they owe and HR has something to
    // verify or waive. Otherwise the room would stay shut for good.
    $payment = PaymentVerification::where('appointment_id', $this->appointment->id)->sole();

    expect($payment->status)->toBe('pending')
        ->and((float) $payment->amount_due)->toBeGreaterThan(0)
        ->and(ConsultationSession::count())->toBe(0);
});

it('opens the room once the raised bill is waived', function () {
    try {
        $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor);
    } catch (InvalidConsultationTransitionException) {
        // expected: the bill is raised here
    }

    PaymentVerification::where('appointment_id', $this->appointment->id)
        ->sole()
        ->update(['status' => 'waived']);

    $session = $this->service->openVirtualRoom($this->appointment->fresh(), $this->doctor);

    expect($session->consultation_status)->toBe('waiting');
});

// ── The patient's side of the same door ───────────────────────────────────────

it('sends the patient to a closed room that names the fee, not a bare error', function () {
    $payment = PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->create(['amount_due' => 750.00]);

    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/consultations/closed')
            ->where('reason', 'unpaid')
            // 750.0 serialises to JSON as 750 and decodes as an int.
            ->where('payment.amountDue', 750)
            ->where('payment.reference', $payment->payment_reference)
        );
});

it('prefers the unpaid reason over the generic not-open one', function () {
    PaymentVerification::factory()->forAppointment($this->appointment)->create();

    // Both are true — there is no session AND the fee is unpaid — and only one
    // of them tells the patient what to do about it. The room is missing
    // BECAUSE the gate refused, so reporting "not open" would hide the reason
    // behind the symptom.
    expect(ConsultationSession::count())->toBe(0);

    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertInertia(fn ($page) => $page->where('reason', 'unpaid'));
});

it('carries no payment payload on a closed room that was simply never opened', function () {
    // A visit that owes nothing. A self-paid one with no record now reads as
    // unpaid, which is a different closed room.
    $this->appointment->update(['coverage' => 'hmo']);

    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertInertia(fn ($page) => $page
            ->where('reason', 'not_open')
            ->where('payment', null)
        );
});

// ── Where the patient actually looks ──────────────────────────────────────────

it('shows the outstanding fee on the dashboard, not only on the payments page', function () {
    $this->appointment->update(['status' => 'confirmed']);

    PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->create(['amount_due' => 750.00]);

    // A patient who never thinks to open "Payments" would otherwise meet both
    // the fee and the released booking at the moment their room refused to
    // open. The fee is raised at booking; it has to be visible from booking.
    $this->actingAs($this->booker)
        ->get('/user/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments.0.payment.amountDue', 750)
            ->where('appointments.0.payment.status', 'pending')
        );
});

it('shows no payment badge on a visit that owes nothing', function () {
    $this->appointment->update(['status' => 'confirmed']);

    // Null rather than a settled badge: every in-person and covered visit
    // reaches this branch, and "paid" on something never billed is reassurance
    // about nothing.
    $this->actingAs($this->booker)
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page->where('appointments.0.payment', null));
});

it('drops the badge once the clinic has confirmed the payment', function () {
    $this->appointment->update(['status' => 'confirmed']);

    PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->verified()
        ->create();

    $this->actingAs($this->booker)
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page->where('appointments.0.payment', null));
});
