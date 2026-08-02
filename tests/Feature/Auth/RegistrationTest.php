<?php

use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

// CreateNewUser takes first_name/last_name — there is no `name` column on
// users; names live on patient_profiles. It also assigns the "user" role and
// creates the profile + medical records.
test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::where('email', 'test@example.com')->firstOrFail();

    expect($user->hasRole('user'))->toBeTrue()
        ->and($user->profile->first_name)->toBe('Test')
        ->and($user->profile->last_name)->toBe('User')
        ->and($user->profile->medical)->not->toBeNull();
});

test('registration requires a first and last name', function () {
    $this->post(route('register.store'), [
        'email' => 'nameless@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertSessionHasErrors(['first_name', 'last_name']);

    $this->assertGuest();
});
