<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Before this existed, a 404 in this app rendered Laravel's stock Symfony error
 * page: a bare white screen with no navigation, no clinic name and no way back
 * except the browser's back button. For a patient who mistypes a URL trying to
 * reach a lab result, that is indistinguishable from the clinic being offline.
 *
 * APP_ENV is `testing` here, so the branded page is what these requests get —
 * `local` is the only environment excluded, so that Ignition's stack trace is
 * still what a developer sees while debugging.
 */
test('an unknown URL renders the branded error page', function () {
    $this->get('/no-such-page')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/index')
            ->where('status', 404)
        );
});

test('a forbidden page renders the branded error page', function () {
    // A patient reaching for the doctor workspace: `role:doctor` aborts 403.
    $this->actingAs(User::factory()->role('user')->create())
        ->get('/doctor/appointments')
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/index')
            ->where('status', 403)
        );
});

/**
 * An exception message can carry a file path, a SQL fragment or a class name,
 * and this page renders to whoever triggered the error — so the server sends a
 * status code and nothing else. The copy is chosen client-side from that code.
 */
test('the error page carries no exception detail', function () {
    $this->get('/no-such-page')
        ->assertInertia(fn (Assert $page) => $page
            ->has('status')
            ->has('previousUrl')
            ->missing('message')
            ->missing('exception')
        );
});

test('the error page still carries the security headers', function () {
    $this->get('/no-such-page')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});
