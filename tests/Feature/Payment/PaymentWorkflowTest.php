<?php

use App\Exceptions\InvalidPaymentTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\PaymentVerification;
use App\Models\Service;
use App\Models\User;
use App\Services\BookingService;
use App\Services\PaymentVerificationService;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Booking → patient declares → clinic confirms, and the guards that keep it in
 * order.
 *
 * The module exists because `coverage = cash` and `consultation_type = virtual`
 * was a legal combination with no meaning: cash is handed to a cashier and
 * there is no cashier on a video call. So the first thing these tests pin down
 * is WHICH bookings raise a fee — a false positive here would put an in-person
 * patient behind a payment gate they have never needed, and a false negative
 * puts the system back where it started.
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

    // tests/Pest.php already seeds the catalogue; this pins the fee the
    // assertions below depend on.
    Service::updateOrCreate(['slug' => 'general'], [
        'name' => 'General / Family Medicine',
        'description' => 'Everyday complaints.',
        'specialties' => ['general'],
        'requires_in_person' => false,
        'virtual_fee' => 750.00,
        'is_active' => true,
        'sort_order' => 10,
    ]);

    $this->date = Carbon::parse('next monday');
    $this->booking = app(BookingService::class);
    $this->payments = app(PaymentVerificationService::class);

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
            'coverage' => 'cash',
            'consultation_type' => 'virtual',
            'doctor_id' => $this->doctor->id,
        ], $overrides));
    };
});

// ── Which bookings owe anything ───────────────────────────────────────────────

it('raises exactly one pending fee when a self-payer books a video consultation', function () {
    $appointment = ($this->book)();

    expect(PaymentVerification::count())->toBe(1);

    $payment = PaymentVerification::firstOrFail();

    expect($payment->status)->toBe('pending')
        ->and($payment->appointment_id)->toBe($appointment->id)
        ->and($payment->patient_id)->toBe($appointment->patient_id)
        ->and($payment->user_id)->toBe($appointment->user_id)
        ->and((float) $payment->amount_due)->toBe(750.00)
        ->and($payment->payment_reference)->toStartWith('WC-PAY-')
        ->and($payment->due_at)->not->toBeNull()
        ->and($payment->method)->toBeNull()
        ->and($payment->verified_at)->toBeNull();

    // Raising a fee must not disturb the state machine — the visit is still
    // waiting on the doctor exactly as a free one would be.
    expect($appointment->status)->toBe('requested');
});

it('raises nothing for an in-person visit, whatever the coverage', function (string $coverage) {
    ($this->book)([
        'consultation_type' => 'in_person',
        'coverage' => $coverage,
        'hmo' => $coverage === 'hmo' ? 'Maxicare' : null,
        'hmo_id' => $coverage === 'hmo' ? 'MX-1' : null,
    ]);

    // The cashier stands between the patient and the doctor, as it always has.
    expect(PaymentVerification::count())->toBe(0);
})->with(['cash', 'hmo', 'philhealth', 'corporate']);

it('raises nothing for an HMO video consultation', function () {
    ($this->book)([
        'coverage' => 'hmo',
        'hmo' => 'Maxicare',
        'hmo_id' => 'MX-1',
    ]);

    // The coverage pays, and HR approves it through the LOA workflow. Raising
    // a fee alongside it would bill the patient twice.
    expect(PaymentVerification::count())->toBe(0);
});

it('raises a bill for a PhilHealth or corporate video consultation that gets past the form', function (string $coverage) {
    // The booking form refuses these over video: nobody checks a PhilHealth
    // card or a company ID on a call. One written past the form still gets a
    // bill, so it cannot go ahead unverified; HR waives it once the coverage
    // is confirmed.
    ($this->book)(['coverage' => $coverage]);

    expect(PaymentVerification::sole()->status)->toBe('pending');
})->with(['philhealth', 'corporate']);

it('falls back to the configured default when the service has no virtual price', function () {
    Service::where('slug', 'general')->update(['virtual_fee' => null]);
    config(['payments.default_fee' => 450.00]);

    ($this->book)();

    // A zero would be a real and wrong answer — it settles a bill the clinic
    // means to collect and opens the gate.
    expect((float) PaymentVerification::firstOrFail()->amount_due)->toBe(450.00);
});

it('gives every fee a unique reference number', function () {
    ($this->book)();
    ($this->book)([
        'first_name' => 'Maria', 'last_name' => 'Santos',
        'contact_number' => '09180000001', 'appointment_time' => '10:00 AM',
    ]);

    $references = PaymentVerification::pluck('payment_reference');

    expect($references)->toHaveCount(2)
        ->and($references->unique())->toHaveCount(2)
        ->and($references->first())->toStartWith('WC-PAY-');
});

// ── The deadline ──────────────────────────────────────────────────────────────

it('sets the deadline the configured number of hours before the visit', function () {
    config(['payments.settlement_deadline_hours' => 3]);

    $appointment = ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    expect($payment->due_at->toDateTimeString())
        ->toBe($appointment->startsAt()->copy()->subHours(3)->toDateTimeString());
});

it('never issues a deadline that has already passed', function () {
    // A same-day booking two hours out is legal (BookingService's minimum lead
    // time) while the settlement window defaults to three. Without the clamp
    // such a record is created already overdue and the sweeper cancels it
    // before the patient has finished reading the instructions.
    //
    // Built directly rather than booked: bookSlot() will not place an
    // appointment inside its own lead time, so the collision this guards
    // against cannot be reached through the booking path on demand.
    config(['payments.settlement_deadline_hours' => 3]);

    $soon = now()->addHour();

    $appointment = Appointment::factory()->virtual()->create([
        'appointment_date' => $soon->toDateString(),
        'appointment_time' => $soon->format('g:i A'),
    ]);

    $deadline = $this->payments->deadlineFor($appointment);

    expect($deadline->toDateTimeString())->toBe($appointment->startsAt()->toDateTimeString())
        ->and($deadline->isPast())->toBeFalse();
});

// ── The patient declares ──────────────────────────────────────────────────────

it('records what the patient says they sent without deciding anything', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');

    $payment->refresh();

    expect($payment->status)->toBe('submitted')
        ->and($payment->method)->toBe('gcash')
        ->and((float) $payment->amount_paid)->toBe(750.00)
        ->and($payment->remittance_reference)->toBe('1234567890123')
        ->and($payment->submitted_at)->not->toBeNull()
        // The whole point: a claim is not payment. Nothing here settles.
        ->and($payment->isSettled())->toBeFalse()
        ->and($payment->verified_at)->toBeNull();
});

it('notifies every HR officer when a remittance is declared', function () {
    $secondOfficer = userWithRole('hr');

    ($this->book)();
    $this->payments->submit(PaymentVerification::firstOrFail(), 'gcash', 750.00, '1234567890123');

    $notifications = AppointmentNotification::where('type', 'payment_submitted')->get();

    expect($notifications)->toHaveCount(2)
        ->and($notifications->pluck('user_id')->sort()->values()->all())
        ->toBe(collect([$this->hr->id, $secondOfficer->id])->sort()->values()->all());
});

it('tells the patient what they owe as soon as the fee is raised', function () {
    $appointment = ($this->book)();

    $notification = AppointmentNotification::where('type', 'payment_due')->firstOrFail();

    expect($notification->user_id)->toBe($appointment->user_id)
        ->and($notification->body)->toContain('750.00')
        ->and($notification->body)->toContain('WC-PAY-');
});

// ── The clinic decides ────────────────────────────────────────────────────────

it('settles the record when staff confirms the remittance', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');

    $this->payments->verify($payment, $this->hr, 'Matched against the clinic GCash statement.');

    $payment->refresh();

    expect($payment->status)->toBe('verified')
        ->and($payment->verified_by)->toBe($this->hr->id)
        ->and($payment->verified_at)->not->toBeNull()
        ->and($payment->rejected_at)->toBeNull()
        ->and($payment->isSettled())->toBeTrue();

    expect(AppointmentNotification::where('type', 'payment_verified')->count())->toBe(1);
});

it('does not cancel the appointment when a remittance cannot be matched', function () {
    $appointment = ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '9999999999999');

    $this->payments->reject($payment, $this->hr, 'No remittance found for that reference.');

    $payment->refresh();
    $appointment->refresh();

    expect($payment->status)->toBe('rejected')
        ->and($payment->remarks)->toBe('No remittance found for that reference.');

    // The divergence from LoaService::reject(). A declined LOA ends the visit;
    // a mistyped reference does not, and the patient still has until the
    // deadline to correct it. Only the sweeper cancels.
    expect($appointment->status)->toBe('requested');
});

it('lets a patient correct a rejected reference and be decided again', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '9999999999999');
    $this->payments->reject($payment, $this->hr, 'Reference not found.');

    $this->payments->submit($payment->refresh(), 'gcash', 750.00, '1234567890123');

    $payment->refresh();

    expect($payment->status)->toBe('submitted')
        ->and($payment->remittance_reference)->toBe('1234567890123')
        // The previous decision is cleared, or the queue renders a row that
        // reads as both pending and already refused.
        ->and($payment->rejected_at)->toBeNull()
        ->and($payment->remarks)->toBeNull();

    $this->payments->verify($payment, $this->hr);

    expect($payment->refresh()->isSettled())->toBeTrue();
});

it('settles a waived fee with no money and a recorded reason', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    $this->payments->waive($payment, $this->hr, 'Follow-up on a consultation already paid for.');

    $payment->refresh();

    expect($payment->status)->toBe('waived')
        ->and($payment->isSettled())->toBeTrue()
        ->and($payment->amount_paid)->toBeNull()
        ->and($payment->remarks)->toBe('Follow-up on a consultation already paid for.');
});

// ── Guards ────────────────────────────────────────────────────────────────────

it('refuses to decide a payment the patient has not submitted', function () {
    ($this->book)();

    $this->payments->verify(PaymentVerification::firstOrFail(), $this->hr);
})->throws(InvalidPaymentTransitionException::class, 'has not submitted');

it('refuses to decide the same remittance twice', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');
    $this->payments->verify($payment, $this->hr);

    $this->payments->reject($payment->refresh(), $this->hr, 'Changed my mind.');
})->throws(InvalidPaymentTransitionException::class, 'already been verified');

it('refuses a second submission while the first is still being checked', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');

    $this->payments->submit($payment->refresh(), 'maya', 750.00, '7777777777777');
})->throws(InvalidPaymentTransitionException::class, 'already being checked');

it('refuses to waive a fee that has already been paid', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');
    $this->payments->verify($payment, $this->hr);

    $this->payments->waive($payment->refresh(), $this->hr, 'Goodwill.');
})->throws(InvalidPaymentTransitionException::class, 'already been paid');

it('refuses a second payment record for the same appointment', function () {
    $appointment = ($this->book)();

    // The database, not the service, is what guarantees this. Two writes
    // racing would otherwise leave a verified row and a rejected row against
    // one visit, and isSettledForConsultation() reads ->paymentVerification
    // expecting a single answer.
    //
    // Worth an explicit test because the obvious spelling of the constraint —
    // unique(['appointment_id', 'deleted_at']) — enforces nothing in MySQL,
    // where a UNIQUE index treats every NULL as distinct.
    expect(fn () => PaymentVerification::factory()
        ->forAppointment($appointment)
        ->create()
    )->toThrow(UniqueConstraintViolationException::class);

    expect(PaymentVerification::where('appointment_id', $appointment->id)->count())
        ->toBe(1);
});

// ── Cash at the counter ───────────────────────────────────────────────────────
//
// The path the whole module exists to make possible: a video consultation paid
// for in cash. Not at the consultation — there is nobody there to take it — but
// at the branch beforehand, by the patient or by anyone acting for them.

it('settles a video consultation paid in cash at the branch counter', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    $this->payments->recordCounterPayment($payment, $this->hr, 750.00, 'OR-2026-0042');

    $payment->refresh();

    // One step, not two. The cashier took the notes and issued the receipt, so
    // the collection and the verification are the same act by the same person.
    expect($payment->status)->toBe('verified')
        ->and($payment->method)->toBe('otc_cash')
        ->and($payment->remittance_reference)->toBe('OR-2026-0042')
        ->and((float) $payment->amount_paid)->toBe(750.00)
        ->and($payment->verified_by)->toBe($this->hr->id)
        ->and($payment->submitted_at)->not->toBeNull()
        ->and($payment->isSettled())->toBeTrue();
});

it('accepts cash at the counter even after the patient declared a transfer', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');

    // Someone who said they would send GCash and then walked in with cash is
    // an ordinary sequence, and the notes in the drawer are better evidence
    // than the reference they typed.
    $this->payments->recordCounterPayment($payment->refresh(), $this->hr, 750.00, 'OR-2026-0043');

    expect($payment->refresh()->method)->toBe('otc_cash')
        ->and($payment->remittance_reference)->toBe('OR-2026-0043');
});

it('refuses to collect twice for the same consultation', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $this->payments->recordCounterPayment($payment, $this->hr, 750.00, 'OR-1');

    $this->payments->recordCounterPayment($payment->refresh(), $this->hr, 750.00, 'OR-2');
})->throws(InvalidPaymentTransitionException::class, 'already been paid');

it('lets the cashier record a counter payment through the HR route', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    $this->actingAs($this->hr)
        ->post("/hr/payment-verifications/{$payment->id}/counter-payment", [
            'amount_paid' => 750.00,
            'official_receipt' => 'OR-2026-0044',
        ])
        ->assertRedirect();

    expect($payment->refresh()->isSettled())->toBeTrue();
});

// ── Derived state ─────────────────────────────────────────────────────────────

it('reports a shortfall only when the figures actually disagree', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();

    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');
    expect($payment->refresh()->shortfall)->toBeNull();

    $payment->update(['amount_paid' => 500.00]);
    expect($payment->refresh()->shortfall)->toBe(250.00);
});

it('reports overdue only while something is still owed', function () {
    ($this->book)();
    $payment = PaymentVerification::firstOrFail();
    $payment->update(['due_at' => now()->subHour()]);

    expect($payment->refresh()->is_overdue)->toBeTrue();

    $this->payments->submit($payment, 'gcash', 750.00, '1234567890123');
    $this->payments->verify($payment->refresh(), $this->hr);

    // A paid consultation is not overdue, whatever the clock says.
    expect($payment->refresh()->is_overdue)->toBeFalse();
});

it('keeps a decided payment visible in the queue history', function () {
    // Confirmed payments used to vanish from the page that confirmed them.
    $appointment = Appointment::factory()->virtual()->create();
    $payment = PaymentVerification::factory()->forAppointment($appointment)->create([
        'status' => 'verified',
        'amount_paid' => 500,
        'verified_by' => $this->hr->id,
        'verified_at' => now(),
    ]);

    $this->actingAs($this->hr)
        ->get('/hr/payment-verifications')
        ->assertInertia(fn ($page) => $page
            ->where('history.0.reference', $payment->payment_reference)
            ->where('history.0.status', 'verified')
            ->where('history.0.decidedBy', $this->hr->name));
});
