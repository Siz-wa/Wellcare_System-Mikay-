<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Settlement deadline
    |--------------------------------------------------------------------------
    |
    | How many hours before a video consultation the fee must be settled.
    |
    | A virtual visit cannot be collected on at the door, which is the whole
    | reason this module exists: in the clinic the cashier is between the
    | patient and the doctor, and on a video call there is nobody in that
    | position. Every Philippine teleconsult service resolves this the same way
    | — collect first, and release the slot if nothing arrives. DigiHealth gives
    | the patient three hours and auto-cancels the request; three hours is
    | therefore the default here.
    |
    | Measured back from the appointment start and stamped onto
    | payment_verifications.due_at at booking, so changing this value never
    | moves a deadline a patient was already given.
    |
    */

    'settlement_deadline_hours' => (int) env('PAYMENT_DEADLINE_HOURS', 3),

    /*
    |--------------------------------------------------------------------------
    | Auto-cancel unsettled bookings
    |--------------------------------------------------------------------------
    |
    | Whether wellcare:payments:sweep releases the slot when the deadline
    | passes with nothing paid.
    |
    | TRUE is the production behaviour and the point of the deadline: an unpaid
    | slot held to the last minute is a slot another patient could not book and
    | a doctor sits idle through.
    |
    | Set false to have the sweep report what it WOULD cancel and change
    | nothing — useful while the clinic is still deciding how strict to be, and
    | the safe setting for a demo where nobody wants seeded appointments
    | disappearing mid-presentation.
    |
    */

    'auto_cancel_unsettled' => (bool) env('PAYMENT_AUTO_CANCEL', true),

    /*
    |--------------------------------------------------------------------------
    | Fallback consultation fee
    |--------------------------------------------------------------------------
    |
    | Used when a service has no `virtual_fee` set at /admin/services.
    |
    | A fallback rather than a zero, because ₱0.00 is a real and wrong answer: a
    | patient would be shown a settled bill for a consultation the clinic
    | intends to charge for, and the gate would let them in. The clinic changes
    | the real prices per service; this only catches the gap.
    |
    */

    'default_fee' => (float) env('PAYMENT_DEFAULT_FEE', 500.00),

    /*
    |--------------------------------------------------------------------------
    | Where the money actually goes
    |--------------------------------------------------------------------------
    |
    | The clinic's own remittance destinations, shown to the patient on the
    | settlement page and checked by staff against the clinic's statements.
    |
    | **Nothing here touches a payment API.** These are the same account details
    | the front desk reads out over the phone today. The application records
    | that a patient says they sent money to one of them and that a staff member
    | confirmed it landed — which is bookkeeping, not funds transfer, and is why
    | this system needs no payment gateway to collect for a video consultation.
    |
    | `otc_cash` has no account number for the obvious reason: the patient, or
    | someone acting for them, pays the cashier at the branch and the cashier
    | enters the OR number. That is how cash reaches a consultation nobody
    | attends in person.
    |
    | Left blank out of the box. A blank channel is hidden from the patient
    | rather than rendered as an empty row to send money to.
    |
    */

    'channels' => [

        'otc_cash' => [
            'label' => 'Cash at the clinic',
            'instructions' => 'Pay at the Dasmariñas branch cashier and quote your payment reference. Someone may pay on your behalf. Keep the Official Receipt — the OR number confirms your slot.',
            'account_name' => null,
            'account_number' => null,
        ],

        'gcash' => [
            'label' => 'GCash',
            'instructions' => 'Send the exact amount, then enter the 13-digit GCash reference number from your receipt.',
            'account_name' => env('PAYMENT_GCASH_NAME'),
            'account_number' => env('PAYMENT_GCASH_NUMBER'),
        ],

        'maya' => [
            'label' => 'Maya',
            'instructions' => 'Send the exact amount, then enter the reference number shown on your Maya receipt.',
            'account_name' => env('PAYMENT_MAYA_NAME'),
            'account_number' => env('PAYMENT_MAYA_NUMBER'),
        ],

        'bank_transfer' => [
            'label' => 'Bank transfer',
            'instructions' => 'Transfer the exact amount via InstaPay or PESONet, then enter the transaction reference from your confirmation.',
            'account_name' => env('PAYMENT_BANK_NAME'),
            'account_number' => env('PAYMENT_BANK_ACCOUNT'),
        ],

    ],

];
