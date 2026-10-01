<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\Patient;
use App\Models\PaymentVerification;

/**
 * The deadline, enforced.
 *
 * A held slot nobody pays for costs the clinic twice — another patient could
 * not book it, and the doctor sits through it. In the clinic that resolves
 * itself when the patient does or does not walk in; a video consultation has no
 * waiting room to look at, so the sweep is the only signal there is.
 *
 * The interesting assertions here are the ones about what it does NOT cancel.
 * A sweep that is too eager is worse than no sweep: it takes appointments away
 * from patients who did everything right.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->booker = userWithRole('user');

    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->makeAppointment = function (array $attributes = []) {
        return Appointment::factory()
            ->forPatient($this->record)
            ->forDoctor($this->doctor)
            ->virtual()
            ->create(array_merge(['status' => 'requested', 'coverage' => 'cash'], $attributes));
    };
});

// ── What it releases ──────────────────────────────────────────────────────────

it('cancels a video consultation whose deadline passed with nothing paid', function () {
    $appointment = ($this->makeAppointment)();

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->overdue()
        ->create();

    $this->artisan('wellcare:payments:sweep')
        ->expectsOutputToContain('Cancelled 1')
        ->assertSuccessful();

    $appointment->refresh();

    expect($appointment->status)->toBe('cancelled')
        ->and($appointment->cancellation_reason)->toContain('not settled')
        ->and($appointment->cancelled_at)->not->toBeNull();
});

it('also releases a booking whose remittance was rejected and never corrected', function () {
    $appointment = ($this->makeAppointment)();

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->rejected()
        ->overdue()
        ->create();

    $this->artisan('wellcare:payments:sweep')->assertSuccessful();

    expect($appointment->refresh()->status)->toBe('cancelled');
});

it('tells the patient why the slot went away', function () {
    $appointment = ($this->makeAppointment)();

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->overdue()
        ->create(['amount_due' => 750.00]);

    $this->artisan('wellcare:payments:sweep')->assertSuccessful();

    $notification = AppointmentNotification::where('user_id', $this->booker->id)
        ->where('subject', 'Video Consultation Cancelled — Unpaid')
        ->firstOrFail();

    expect($notification->body)->toContain('750.00')
        ->and($notification->body)->toContain('WC-PAY-');
});

// ── What it leaves alone ──────────────────────────────────────────────────────

it('never cancels a patient who is waiting on the clinic', function () {
    $appointment = ($this->makeAppointment)();

    // Submitted and overdue. The patient has done their part; the backlog is
    // the clinic's. Cancelling here punishes them for staff response time.
    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->submitted()
        ->overdue()
        ->create();

    $this->artisan('wellcare:payments:sweep')
        ->expectsOutputToContain('No unsettled')
        ->assertSuccessful();

    expect($appointment->refresh()->status)->toBe('requested');
});

it('leaves an unpaid booking alone until its deadline actually passes', function () {
    $appointment = ($this->makeAppointment)();

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->create(['due_at' => now()->addHours(2)]);

    $this->artisan('wellcare:payments:sweep')->assertSuccessful();

    expect($appointment->refresh()->status)->toBe('requested');
});

it('does not overrule a patient someone has already let into the consultation', function () {
    $appointment = ($this->makeAppointment)(['status' => 'in_progress']);

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->overdue()
        ->create();

    $this->artisan('wellcare:payments:sweep')
        ->expectsOutputToContain('skipped 1')
        ->assertSuccessful();

    // cancelAppointment() refuses this state, and the command catches that
    // refusal rather than forcing past it. A live consultation was opened by a
    // person; a cron job is not the thing to overrule that.
    expect($appointment->refresh()->status)->toBe('in_progress');
});

it('ignores appointments that are already cancelled', function () {
    $appointment = ($this->makeAppointment)(['status' => 'cancelled']);

    PaymentVerification::factory()
        ->forAppointment($appointment)
        ->overdue()
        ->create();

    $this->artisan('wellcare:payments:sweep')
        ->expectsOutputToContain('No unsettled')
        ->assertSuccessful();
});

// ── Reporting without acting ──────────────────────────────────────────────────

it('reports and changes nothing on a dry run', function () {
    $appointment = ($this->makeAppointment)();
    $payment = PaymentVerification::factory()->forAppointment($appointment)->overdue()->create();

    $this->artisan('wellcare:payments:sweep --dry-run')
        ->expectsOutputToContain($payment->payment_reference)
        ->assertSuccessful();

    expect($appointment->refresh()->status)->toBe('requested');
});

it('reports and changes nothing while auto-cancel is switched off', function () {
    config(['payments.auto_cancel_unsettled' => false]);

    $appointment = ($this->makeAppointment)();
    PaymentVerification::factory()->forAppointment($appointment)->overdue()->create();

    $this->artisan('wellcare:payments:sweep')
        ->expectsOutputToContain('auto_cancel_unsettled is false')
        ->assertSuccessful();

    expect($appointment->refresh()->status)->toBe('requested');
});
