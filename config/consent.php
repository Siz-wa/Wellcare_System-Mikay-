<?php

/*
 * Keys are plain strings, not Consent:: constants. Config files are loaded
 * before the container is fully up (and are cached to a flat array by
 * `config:cache`), so a class reference here is a load-order dependency for no
 * gain. App\Models\Consent carries matching constants for use in code.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Consent purposes
    |--------------------------------------------------------------------------
    |
    | One entry per purpose, captured SEPARATELY — never bundled behind a single
    | "I agree to the terms" tick, which is the specific failure finding C-1
    | records. RA 10173 expects consent to be freely given, specific and
    | informed; one checkbox covering every purpose is none of those.
    |
    | `version` is a plain string, bumped by hand whenever `body` changes. Stored
    | on each consent row, so a record always says which wording the person
    | actually agreed to, and ConsentService::isStale() can spot people who
    | consented to superseded text.
    |
    | `required` — registration cannot complete without it.
    | `withdrawable` — the patient may revoke it from settings/privacy.
    |
    | Note the asymmetry: data_processing is required and NOT withdrawable
    | through self-service. That is not a trick. Withdrawing it would oblige the
    | clinic to stop processing a medical record it is separately obliged to
    | retain (see config/retention.php), and those two obligations cannot both
    | be satisfied by a button. The panel says so and points the person at the
    | clinic, where a human can handle the conflict. ND-9 governs whether a
    | regime demanding unconditional erasure applies here at all.
    |
    */

    'purposes' => [

        'data_processing' => [
            'title' => 'Processing of your health information',
            'version' => '2026-09-08.1',
            'required' => true,
            'withdrawable' => false,
            'summary' => 'Allows WellCare to hold and use your health records to provide care.',
            'body' => <<<'TEXT'
            To provide care, WellCare Clinics & Laboratory (Dasmariñas) collects and
            stores the following about you and about anyone you book appointments for:

            • Identity and contact details — name, date of birth, sex, address,
              contact number, email, civil status, and employer where you give it.
            • Coverage details — whether you pay cash or use an HMO, PhilHealth or a
              corporate account, the provider's name, and your member number.
            • Health information — allergies, diagnoses, prescriptions, vital signs,
              laboratory results, consultation notes, and any documents a clinician
              attaches to your record such as scans or referrals.

            Who can see it: the doctors and nurses involved in your care. Reception
            and administrative staff can see your contact and appointment details but
            are not given access to your clinical record. HR staff handling an HMO
            approval see the details needed to process it — your name, contact, age,
            sex, the service booked, and your coverage — and not your medical record.

            Every time a member of clinic staff opens or downloads part of your
            record, that access is logged with their role and the time. You can see
            that list yourself on your record page.

            How long: your medical record is kept for the period set by the clinic's
            retention policy, counted from your most recent visit, because health
            records must be retained for a minimum period. Closing your online
            account does not delete your medical record — it removes your login and
            your contact details from the account system while the clinical record
            is retained.

            You can download everything held about your account at any time from
            Settings → Privacy & data.
            TEXT,
        ],

        'treatment' => [
            'title' => 'Examination and treatment',
            'version' => '2026-09-08.1',
            'required' => true,
            'withdrawable' => true,
            'summary' => 'Allows the clinician you booked to examine you and record what they find.',
            'body' => <<<'TEXT'
            You are consenting to be examined and treated by the clinician you have
            booked with, and to have their findings written into your medical record.

            That record includes the consultation note (the clinician's assessment and
            plan), your vital signs, any diagnosis made, any medication prescribed,
            and any laboratory work requested as part of the visit.

            You can decline or stop at any point during a consultation, and you can
            withdraw this consent from Settings → Privacy & data. Withdrawing it
            applies to future visits; it does not remove notes already written about
            care you have already received.
            TEXT,
        ],

        'telemedicine' => [
            'title' => 'Video consultation',
            'version' => '2026-09-08.1',
            'required' => false,
            'withdrawable' => true,
            'summary' => 'Needed only if you book a consultation held over video rather than in person.',
            'body' => <<<'TEXT'
            A video consultation is held in your browser. The audio and video travel
            directly between your device and your clinician's; WellCare's server passes
            the messages that set the call up, and the call itself is not routed
            through it.

            The call is NOT recorded. No audio or video is stored by WellCare. What is
            stored is the same thing an in-person visit produces: the clinician's
            consultation note, and the time the session started and ended.

            A video consultation has limits an in-person one does not — a clinician
            cannot physically examine you — and your clinician may ask you to come in
            instead. You can ask for an in-person appointment at any time.

            You need a device with a working camera and microphone, and a connection
            good enough to hold the call.
            TEXT,
        ],

    ],

];
