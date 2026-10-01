<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * What a patient declares when they say they have settled a video consultation.
 *
 * The allow-list is the security boundary, as it is on
 * UpdatePatientDemographicsRequest. `PaymentVerification::$fillable` includes
 * `status`, `verified_by` and `verified_at` — everything the clinic's decision
 * is made of — so a bare update from request input would let the patient mark
 * their own payment verified and walk straight through the consultation gate.
 * Nothing here reaches those columns; only PaymentVerificationService writes
 * them, and only for a staff user.
 *
 * Authorization is the controller's job, not this class's: it binds the record
 * through the guarantor's own patient list before this request is ever
 * validated.
 */
class SubmitPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'remittance_reference' => trim((string) $this->input(
                'remittanceReference',
                $this->input('remittance_reference', '')
            )),
            'amount_paid' => $this->input('amountPaid', $this->input('amount_paid')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Only the channels the clinic actually publishes. A method that is
            // not in config is one nobody is watching a statement for, so a
            // payment sent to it could never be verified.
            'method' => ['required', Rule::in(array_keys(config('payments.channels', [])))],

            /*
             * Money the patient says they sent. Bounded on both sides: 0 is not
             * a payment, and the upper bound stops a typo like 50000 instead of
             * 500.00 from landing in the queue as a plausible-looking figure
             * that someone has to chase down with the bank.
             */
            'amount_paid' => ['required', 'numeric', 'min:1', 'max:999999.99'],

            /*
             * The GCash/Maya/bank reference, or the cashier's OR number.
             *
             * Alphanumeric with spaces and hyphens, because that is the whole
             * range of what the receipts in question actually print: GCash gives
             * 13 digits, InstaPay a mixed alphanumeric string, and a clinic OR
             * is typically hyphenated. Deliberately NOT format-checked per
             * channel — a rule tuned to today's GCash receipt would reject a
             * valid payment the day the format changes, and the human check
             * that follows is the real validation.
             */
            'remittance_reference' => ['required', 'string', 'min:4', 'max:60', 'regex:/^[A-Za-z0-9 \-]+$/'],

            /*
             * The screenshot. Optional, because an over-the-counter cash payment
             * has an OR number and nothing to photograph.
             *
             * 5 MB and images or PDF only — a phone screenshot is a few hundred
             * kilobytes, and PaymentProofStorage holds the whole file in memory
             * to encrypt it (see its docblock on why that cap matters).
             */
            'proof' => ['nullable', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'method.required' => 'Please choose how you paid.',
            'method.in' => 'That payment channel is not one the clinic accepts.',
            'amount_paid.required' => 'Please enter the amount you sent.',
            'amount_paid.min' => 'Please enter the amount you actually sent.',
            'remittance_reference.required' => 'Please enter the reference number from your receipt.',
            'remittance_reference.regex' => 'A reference number may only contain letters, numbers, spaces and hyphens.',
            'remittance_reference.min' => 'That reference number looks too short — please check your receipt.',
            'proof.max' => 'The screenshot must not exceed 5 MB.',
            'proof.mimes' => 'Please upload a JPG, PNG, WEBP or PDF.',
        ];
    }
}
