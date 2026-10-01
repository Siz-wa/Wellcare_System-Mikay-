<?php

/**
 * The server posts events to Reverb over loopback, whatever address browsers
 * are told to dial.
 *
 * Both used to read REVERB_HOST. Pointed at a trycloudflare tunnel for
 * two-device testing, every server-side broadcast then failed with "cURL error
 * 6: Could not resolve host" the moment the tunnel rotated.
 */
it('does not send server-side broadcasts to the public browser address', function () {
    $config = require base_path('config/broadcasting.php');
    $options = $config['connections']['reverb']['options'];

    expect($options['host'])->toBe(env('REVERB_INTERNAL_HOST', '127.0.0.1'))
        ->and(file_get_contents(base_path('config/broadcasting.php')))
        ->toContain("env('REVERB_INTERNAL_HOST'")
        ->not->toContain("'host' => env('REVERB_HOST')");
});
