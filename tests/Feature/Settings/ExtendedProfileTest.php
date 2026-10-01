<?php

use App\Models\User;

function fullProfilePayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria@example.com',
        'contact_number' => '09171234567',
        'address' => '12 Aguinaldo Highway, Dasmariñas',
        'company' => 'WellCare Corp',
        'gender' => 'F',
        'birthdate' => '1990-05-14',
        'civil_status' => 'married',
    ], $overrides);
}

test('the full demographic profile can be saved', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), fullProfilePayload())
        ->assertSessionHasNoErrors();

    $profile = $user->refresh()->profile;

    expect($profile->contact_number)->toBe('09171234567')
        ->and($profile->address)->toBe('12 Aguinaldo Highway, Dasmariñas')
        ->and($profile->company)->toBe('WellCare Corp')
        ->and($profile->gender)->toBe('F')
        ->and($profile->birthdate->toDateString())->toBe('1990-05-14')
        ->and($profile->civil_status)->toBe('married');
});

/**
 * The regression this guards. A cleared <input type="date"> posts '', and ''
 * is not null — so `nullable|date` would run `date` against the empty string
 * and reject a save whose only fault was a blank optional field.
 */
test('optional fields can be cleared', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patch(route('profile.update'), fullProfilePayload());

    $this->actingAs($user)
        ->patch(route('profile.update'), fullProfilePayload([
            'contact_number' => '',
            'address' => '',
            'company' => '',
            'gender' => '',
            'birthdate' => '',
            'civil_status' => '',
        ]))
        ->assertSessionHasNoErrors();

    $profile = $user->refresh()->profile;

    expect($profile->contact_number)->toBeNull()
        ->and($profile->birthdate)->toBeNull()
        ->and($profile->gender)->toBeNull()
        // The required identity fields are untouched by clearing the optionals.
        ->and($profile->first_name)->toBe('Maria');
});

test('a profile saves with only the required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'email' => 'maria@example.com',
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->profile->first_name)->toBe('Maria');
});

test('the contact number must be a PH mobile', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), fullProfilePayload(['contact_number' => '12345']))
        ->assertSessionHasErrors('contact_number');
});

/**
 * patient_profiles.gender is a MySQL ENUM of exactly ['M','F'] — NOT the
 * male/female/other used by the separate `patients` table. Sending 'male' here
 * is rejected by the driver, so validation has to catch it first.
 */
test('gender is validated against the patient_profiles enum', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), fullProfilePayload(['gender' => 'male']))
        ->assertSessionHasErrors('gender');
});

test('a birthdate in the future is rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), fullProfilePayload([
            'birthdate' => now()->addYear()->toDateString(),
        ]))
        ->assertSessionHasErrors('birthdate');
});

/**
 * Registration offers separated and annulled. If the settings form could not
 * hand them back, the next profile save would post '' and wipe the answer.
 */
test('separated and annulled civil statuses save and are handed back to the form', function (string $status) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), fullProfilePayload(['civil_status' => $status]))
        ->assertSessionHasNoErrors();

    expect($user->refresh()->profile->civil_status)->toBe($status);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn ($page) => $page->where('profile.civil_status', $status));
})->with(['separated', 'annulled']);

test('the profile page exposes the read-only client number', function () {
    $user = User::factory()->create();
    $user->profile()->create(['first_name' => 'Maria', 'last_name' => 'Santos']);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn ($page) => $page
            ->where('clientNumber', $user->profile->client_number)
            ->where('profile.first_name', 'Maria')
        );
});
