<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PaymentVerification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

/**
 * Who may see and act on a settlement record.
 *
 * Two boundaries, and they fail differently:
 *
 *  - **Between families.** A payment record carries a name, an amount and a
 *    transaction reference. Scoped through `patients.guarantor_id`, as every
 *    list page in the portal is, and NOT through `payment_verifications.user_id`
 *    — that column is the booking account and is shared between siblings, so
 *    scoping on it would show one family member another's billing. This is the
 *    same rule LoaAccessTest pins down for coverage.
 *
 *  - **Between patient and clinic.** `PaymentVerification::$fillable` includes
 *    `status` and `verified_by`. A patient who could reach those would mark
 *    their own payment verified and walk through gate G5 without paying.
 */
beforeEach(function () {
    Storage::fake('local');

    $this->doctor = userWithRole('doctor');
    $this->booker = userWithRole('user');
    $this->stranger = userWithRole('user');
    $this->hr = userWithRole('hr');

    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'requested', 'coverage' => 'cash']);

    $this->payment = PaymentVerification::factory()
        ->forAppointment($this->appointment)
        ->create(['amount_due' => 750.00]);
});

// ── Between families ──────────────────────────────────────────────────────────

it('shows a guarantor only the payments of patients they guarantee', function () {
    $otherRecord = Patient::factory()->forGuarantor($this->stranger)->create();
    $otherAppointment = Appointment::factory()
        ->forPatient($otherRecord)
        ->forDoctor($this->doctor)
        ->virtual()
        // A distinct time: appointments carry a unique index on
        // (doctor, date, time) for live statuses, and the factory would
        // otherwise place both visits in the same slot.
        ->create(['coverage' => 'cash', 'appointment_time' => '2:00 PM']);
    PaymentVerification::factory()->forAppointment($otherAppointment)->create();

    $this->actingAs($this->booker)
        ->get('/user/payments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/payments/payments')
            ->has('payments', 1)
            ->where('payments.0.reference', $this->payment->payment_reference)
        );
});

it('refuses to let one account submit against another family\'s payment', function () {
    $this->actingAs($this->stranger)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'gcash',
            'amountPaid' => 750.00,
            'remittanceReference' => '1234567890123',
        ])
        ->assertNotFound();

    // A 404 rather than a 403: confirming that a reference exists but belongs
    // to someone else is itself a disclosure.
    expect($this->payment->refresh()->status)->toBe('pending');
});

it('refuses to serve one family\'s receipt to another', function () {
    $this->payment->update([
        'proof_path' => 'payment-proofs/1/whatever.png',
        'proof_name' => 'receipt.png',
    ]);

    $this->actingAs($this->stranger)
        ->get("/user/payments/{$this->payment->id}/proof")
        ->assertNotFound();
});

// ── Between patient and clinic ────────────────────────────────────────────────

it('ignores a status the patient tries to set on themselves', function () {
    $this->actingAs($this->booker)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'gcash',
            'amountPaid' => 750.00,
            'remittanceReference' => '1234567890123',
            // The fields that would open gate G5 without any money changing
            // hands. The form request's allow-list is what stops them.
            'status' => 'verified',
            'verified_by' => $this->booker->id,
            'verified_at' => now()->toDateTimeString(),
        ])
        ->assertRedirect();

    $this->payment->refresh();

    expect($this->payment->status)->toBe('submitted')
        ->and($this->payment->verified_by)->toBeNull()
        ->and($this->payment->verified_at)->toBeNull()
        ->and($this->appointment->refresh()->isSettledForConsultation())->toBeFalse();
});

it('keeps the decision routes away from everyone but HR', function (string $actor, int $status) {
    $this->payment->update(['status' => 'submitted', 'submitted_at' => now()]);

    $this->actingAs($this->{$actor})
        ->post("/hr/payment-verifications/{$this->payment->id}/verify", [])
        ->assertStatus($status);
})->with([
    ['booker', 403],
    ['doctor', 403],
    ['hr', 302],
]);

it('lets an administrator read the queue without deciding it', function () {
    $admin = userWithRole('admin');

    $this->actingAs($admin)
        ->get('/hr/payment-verifications')
        ->assertOk()
        // GV-3 — visibility without authority. The flag is what stops the page
        // rendering buttons that would 403.
        ->assertInertia(fn ($page) => $page->where('canDecide', false));

    $this->actingAs($admin)
        ->post("/hr/payment-verifications/{$this->payment->id}/verify", [])
        ->assertForbidden();
});

it('keeps dead visits out of the staff queue', function () {
    // A swept booking still owns a `pending` record and a completed visit's
    // record is settled history. Neither is work, and an officer scrolling
    // past a month of them stops reading the list.
    $this->appointment->update(['status' => 'cancelled']);

    $this->actingAs($this->hr)
        ->get('/hr/payment-verifications')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('payments', 0)
            ->has('outstanding', 0)
        );
});

it('returns validation errors under the keys the form actually reads', function () {
    // The bug this pins: Laravel keys errors by the RULE name
    // (`amount_paid`), and a form whose field is named `amountPaid` looks up a
    // key that does not exist. The request still fails — correctly — but the
    // field shows no message, so the patient sees their payment refused with
    // nothing on screen marked wrong.
    $this->actingAs($this->booker)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'not-a-channel',
            'amount_paid' => 0,
            'remittance_reference' => '!!',
        ])
        ->assertSessionHasErrors([
            'method',
            'amount_paid',
            'remittance_reference',
        ]);

    expect($this->payment->refresh()->status)->toBe('pending');
});

it('accepts either camelCase or snake_case field names', function () {
    // prepareForValidation() tolerates both. The form posts snake_case so the
    // error keys line up; this makes sure the tolerant path stays working for
    // anything that posts the portal's usual camelCase.
    $this->actingAs($this->booker)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'gcash',
            'amountPaid' => 750.00,
            'remittanceReference' => '1234567890123',
        ])
        ->assertRedirect();

    expect($this->payment->refresh()->status)->toBe('submitted');
});

// ── The uploaded receipt ──────────────────────────────────────────────────────

it('stores an uploaded receipt encrypted and serves it back to its owner', function () {
    $this->actingAs($this->booker)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'gcash',
            'amountPaid' => 750.00,
            'remittanceReference' => '1234567890123',
            'proof' => UploadedFile::fake()->image('receipt.png'),
        ])
        ->assertRedirect();

    $this->payment->refresh();

    expect($this->payment->proof_path)->not->toBeNull();

    $onDisk = Storage::disk('local')->get($this->payment->proof_path);

    // A backup tarball should not be a plaintext ledger of who consulted this
    // clinic and what they paid — the same reason patient documents are
    // encrypted at rest.
    expect($onDisk)->not->toContain('PNG')
        ->and(Crypt::decryptString($onDisk))->toContain('PNG');

    $this->actingAs($this->booker)
        ->get("/user/payments/{$this->payment->id}/proof")
        ->assertOk();
});

it('encrypts the remittance reference at rest', function () {
    $this->actingAs($this->booker)
        ->post("/user/payments/{$this->payment->id}", [
            'method' => 'gcash',
            'amountPaid' => 750.00,
            'remittanceReference' => '1234567890123',
        ]);

    $raw = DB::table('payment_verifications')
        ->where('id', $this->payment->id)
        ->value('remittance_reference');

    expect($raw)->not->toBe('1234567890123')
        ->and($this->payment->refresh()->remittance_reference)->toBe('1234567890123');
});
