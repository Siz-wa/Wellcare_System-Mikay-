<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SMS driver
    |--------------------------------------------------------------------------
    |
    | Task 1.2. Before this, no notification the system produced ever left the
    | application: WellcareNotification::via() returned ['database'] and the one
    | outbound Mail::send covered a single notification type. A patient waiting
    | on a lab result had to log in and look at a bell icon to learn anything.
    |
    | For a Philippine outpatient clinic that inverts the real channel
    | hierarchy — SMS first, email behind it, the portal as the archive.
    |
    | `log` is the default ON PURPOSE. It writes the message to the application
    | log and delivers nothing, which means:
    |
    |   • the whole delivery path — preferences, queueing, formatting, failure
    |     handling — is exercised and testable today, and
    |   • choosing and paying for a provider stays the clinic's decision rather
    |     than being made implicitly by whichever SDK got installed first.
    |
    | Swapping in a real provider is a driver class and an env var. Nothing that
    | calls SmsSender has to change.
    |
    */

    'driver' => env('SMS_DRIVER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Sender identity
    |--------------------------------------------------------------------------
    |
    | The name or shortcode recipients see. Philippine networks require a
    | registered sender name for A2P traffic, so this is provider-issued rather
    | than free text — hence env, not a literal.
    |
    */

    'from' => env('SMS_FROM', 'WELLCARE'),

    /*
    |--------------------------------------------------------------------------
    | Message length
    |--------------------------------------------------------------------------
    |
    | A GSM-7 segment is 160 characters; anything longer is billed as multiple
    | segments, and anything containing a non-GSM character (a curly quote, an
    | en dash, an emoji) drops the whole message to UCS-2 at 70 characters per
    | segment. SmsSender truncates to this rather than letting a clinic discover
    | its per-message cost tripled because a body used a typographic dash.
    |
    */

    'max_length' => (int) env('SMS_MAX_LENGTH', 320),

    /*
    |--------------------------------------------------------------------------
    | Provider credentials
    |--------------------------------------------------------------------------
    |
    | Unused by the `log` driver. Present so the shape is documented for
    | whoever wires a real provider.
    |
    */

    'providers' => [
        'log' => [
            // Which log channel the fake driver writes to.
            'channel' => env('SMS_LOG_CHANNEL', 'stack'),
        ],
    ],

];
