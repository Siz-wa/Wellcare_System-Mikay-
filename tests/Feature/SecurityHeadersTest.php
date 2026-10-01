<?php

use App\Models\User;

test('security headers are sent on public pages', function () {
    $response = $this->get(route('home'));

    $response->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
});

test('security headers are sent on authenticated pages', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('profile.edit'))
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});

/**
 * The middleware runs first in the web stack precisely so a short-circuiting
 * middleware below it (EnsureUserIsActive redirecting, Inertia returning a
 * version mismatch) cannot produce a response with no headers.
 */
test('security headers survive a redirect', function () {
    $this->get(route('profile.edit'))
        ->assertRedirect(route('login'))
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});

/**
 * The consultation room needs the camera and microphone; nothing else does,
 * and nothing needs them in a cross-origin frame.
 */
test('the permissions policy allows only camera and microphone', function () {
    $header = $this->get(route('home'))->headers->get('Permissions-Policy');

    expect($header)->toContain('camera=(self)')
        ->and($header)->toContain('microphone=(self)')
        ->and($header)->toContain('geolocation=()');
});

/**
 * HSTS pins a host to HTTPS in every visitor's browser for a year. Sending it
 * from a staging domain is a genuinely painful thing to undo.
 */
test('HSTS is not sent over plain http', function () {
    $this->get(route('home'))->assertHeaderMissing('Strict-Transport-Security');
});
