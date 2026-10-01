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

it('never blocks a visit that has no payment record', function () {
    // Every in-person visit, every HMO/PhilHealth/corporate booking, and every
    // appointment that predates this module. Reading a missing record as
    // "unpaid" would lock the existing appointment book out of its own
    // consultations — which is why the helper treats null as settled.
    expect(PaymentVerification::count())->toBe(0);

    $session = $this->service->openVirtualRoom($this->appointment, $this->doctor);

    expect($session->consultation_status)->toBe('waiting');
});

it('reports an appointment with no payment record as settled', function () {
    expect($this->appointment->isSettledForConsultation())->toBeTrue();
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
