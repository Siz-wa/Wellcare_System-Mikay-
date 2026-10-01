<?php

use App\Models\PatientProfile;
use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

// Email lives on users; the name lives on the patient profile. The form used
// to submit a single `name`, which User::$fillable silently dropped.
test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->email)->toBe('test@example.com')
        ->and($user->email_verified_at)->toBeNull()
        ->and($user->profile->first_name)->toBe('Test')
        ->and($user->profile->last_name)->toBe('User')
        // The computed accessor now reflects the change.
        ->and($user->name)->toBe('Test User');
});

test('an existing profile is updated rather than duplicated', function () {
    $user = User::factory()->create();
    $user->profile()->create(['first_name' => 'Old', 'last_name' => 'Name']);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'first_name' => 'New',
            'last_name' => 'Name',
            'email' => $user->email,
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->profile->first_name)->toBe('New')
        ->and(PatientProfile::where('user_id', $user->id)->count())->toBe(1);
});

test('first and last name are required', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'first_name' => '',
            'last_name' => '',
            'email' => $user->email,
        ])
        ->assertSessionHasErrors(['first_name', 'last_name']);
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can close their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();

    // This assertion used to read `expect($user->fresh())->toBeNull()`, because
    // the endpoint performed a hard DELETE. That was the defect, not the
    // contract: six ON DELETE CASCADE keys carried it into the account holder's
    // allergies, diagnoses and documents (compliance plan §2.6, RET-1). The row
    // is now retired rather than removed.
    //
    // Asserted through a normal query, NOT through `fresh()`: that helper uses
    // newQueryWithoutScopes() and so looks straight past SoftDeletes, which
    // would make this pass whether the scope worked or not. A plain find() is
    // what the application actually does — it is the thing that has to come
    // back empty for a closed account to be unable to sign in.
    expect(User::find($user->id))->toBeNull();
    $this->assertSoftDeleted('users', ['id' => $user->id]);

    // The full retention behaviour — records surviving, credentials destroyed,
    // sessions dropped — is covered in tests/Feature/Compliance.
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
