<?php

use App\Models\Patient;
use App\Models\User;

/**
 * One shape for a contact number, whichever screen typed it.
 *
 * Six surfaces collect a mobile number and three of them validated it as
 * `string|max:20`, so `not-a-number` was storable from the admin and nurse
 * screens while registration, booking and the profile page all enforced a PH
 * mobile format.
 *
 * That gap is not cosmetic. `Patient::findOrCreateFromBooking()` dedupes on
 * lowercased first name + last name + `contact_number`, so the same person
 * entered as `0917 123 4567` by a nurse and `09171234567` at booking becomes
 * two patient records — the exact split the dedupe was written to prevent.
 * These tests hold the shape at every door rather than at four of them.
 *
 * The normalizing half matters as much as the rejecting half: people paste
 * numbers out of their contacts with a `+63` and spaces, and read them off an
 * HMO card without the trunk zero. Those are correct numbers written a correct
 * way, and the answer is to reshape them, not to bounce the user.
 */
beforeEach(function () {
    $this->record = Patient::factory()->create([
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'contact_number' => '09170000001',
    ]);

    $this->demographics = fn (array $overrides = []) => array_merge([
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
    ], $overrides);
});

// ── Rejected: the shape is now enforced at the doors that had no rule ─────────

it('refuses a contact number with letters when a nurse edits demographics', function () {
    $this->actingAs(userWithRole('nurse'))
        ->patch(
            "/nurse/patient-records/{$this->record->id}",
            ($this->demographics)(['contact_number' => 'not-a-number'])
        )
        ->assertSessionHasErrors('contact_number');

    expect($this->record->refresh()->contact_number)->toBe('09170000001');
});

it('refuses a contact number with letters when an admin creates a user', function () {
    $this->actingAs(userWithRole('admin'))
        ->post('/admin/users', [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'email' => 'ana.reyes@example.com',
            'role' => 'user',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'contact_number' => 'call me',
        ])
        ->assertSessionHasErrors('contact_number');

    expect(User::where('email', 'ana.reyes@example.com')->exists())->toBeFalse();
});

it('refuses a landline where a mobile is required', function () {
    $this->actingAs(userWithRole('nurse'))
        ->patch(
            "/nurse/patient-records/{$this->record->id}",
            ($this->demographics)(['contact_number' => '0281234567'])
        )
        ->assertSessionHasErrors('contact_number');
});

// ── Normalized: a correct number written another way still saves ─────────────

it('reshapes every way a PH mobile is written into the one stored form', function (string $typed) {
    $this->actingAs(userWithRole('nurse'))
        ->patch(
            "/nurse/patient-records/{$this->record->id}",
            ($this->demographics)(['contact_number' => $typed])
        )
        ->assertSessionHasNoErrors();

    expect($this->record->refresh()->contact_number)->toBe('09171234567');
})->with([
    'already normalized' => '09171234567',
    'spaced' => '0917 123 4567',
    'dashed' => '0917-123-4567',
    'country code' => '+639171234567',
    'country code, spaced' => '+63 917 123 4567',
    'country code, no plus' => '639171234567',
    'trunk zero dropped' => '9171234567',
]);

it('normalizes at registration, so a pasted number does not fail the last step', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'email' => 'ana.reyes@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'contact_number' => '+63 917 123 4567',
        'gender' => 'F',
        'birthdate' => now()->subYears(30)->toDateString(),
        'consent_data_processing' => '1',
        'consent_treatment' => '1',
    ])->assertSessionHasNoErrors();

    expect(User::where('email', 'ana.reyes@example.com')->first()->profile->contact_number)
        ->toBe('09171234567');
});

it('normalizes when an admin edits a patient record', function () {
    $this->actingAs(userWithRole('admin'))
        ->put("/admin/patients/{$this->record->id}", [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'email' => 'ana.reyes@example.com',
            'contact_number' => '+63 917 123 4567',
        ])
        ->assertSessionHasNoErrors();

    expect($this->record->refresh()->contact_number)->toBe('09171234567');
});

it('leaves an optional contact number null rather than an empty string', function () {
    $user = userWithRole('user');

    $this->actingAs($user)
        ->patch('/settings/profile', [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'email' => $user->email,
            'contact_number' => '',
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->profile->contact_number)->toBeNull();
});
