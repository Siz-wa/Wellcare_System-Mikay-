<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/confirm-password'),
    );
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});

test('signing in counts as confirming the password', function () {
    // A new staff account is sent to Security to enrol 2FA straight after
    // signing in; asking for the password again seconds later was friction.
    $nurse = userWithRole('nurse');
    $nurse->forceFill(['password' => 'Str0ng-Passw0rd!', 'two_factor_confirmed_at' => null, 'two_factor_secret' => null])->save();

    $this->post(route('login.store'), ['email' => $nurse->email, 'password' => 'Str0ng-Passw0rd!']);

    $this->get(route('security.edit'))->assertOk();
});

test('an ordinary session still has to confirm the password', function () {
    $this->actingAs(userWithRole('nurse'))
        ->get(route('security.edit'))
        ->assertRedirect(route('password.confirm'));
});
