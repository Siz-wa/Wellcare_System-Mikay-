<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * @param  array<string, bool>  $overrides
 */
function preferencesFor(User $user, array $overrides): NotificationPreference
{
    $row = NotificationPreference::forUser($user);

    $row->update([
        'preferences' => array_merge(NotificationPreference::defaults(), $overrides),
    ]);

    return $row;
}

/**
 * `appointment_notifications.appointment_id` is a NOT NULL foreign key, so a
 * notification cannot exist without an appointment to hang off.
 */
function notifyUser(User $user, string $type): void
{
    AppointmentNotification::create([
        'appointment_id' => Appointment::factory()->create(['user_id' => $user->id])->id,
        'user_id' => $user->id,
        'type' => $type,
        'subject' => 'Subject',
        'body' => 'Body',
        'read' => false,
    ]);
}

test('the preferences page is displayed with defaults', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.notifications.edit'))
        ->assertOk();

    expect(NotificationPreference::where('user_id', $user->id)->exists())->toBeTrue();
});

test('preferences can be saved', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('settings.notifications.update'), [
            'preferences' => [
                'inapp.appointments' => '1',
                'email.lab_results' => '1',
            ],
        ])
        ->assertSessionHasNoErrors();

    $saved = NotificationPreference::forUser($user)->resolved();

    expect($saved['inapp.appointments'])->toBeTrue()
        ->and($saved['email.lab_results'])->toBeTrue()
        // Absent keys mean "unchecked", not "leave as it was" — an unchecked
        // checkbox posts nothing at all.
        ->and($saved['email.appointments'])->toBeFalse()
        ->and($saved['inapp.consultations'])->toBeFalse();
});

test('an always-on category cannot be switched off', function () {
    $user = User::factory()->create();

    // Nothing at all submitted for security, and the client would not send it
    // anyway because the input is rendered disabled. The server must not rely
    // on that.
    $this->actingAs($user)
        ->put(route('settings.notifications.update'), [
            'preferences' => [
                'inapp.security' => '0',
                'email.security' => '0',
            ],
        ])
        ->assertSessionHasNoErrors();

    $saved = NotificationPreference::forUser($user)->resolved();

    expect($saved['inapp.security'])->toBeTrue()
        ->and($saved['email.security'])->toBeTrue();
});

test('turning every category off is a valid save', function () {
    $user = User::factory()->create();

    // The page posts a placeholder key so `preferences` is always present;
    // without it this request fails the `required|array` rule and the one save
    // a person is most likely to want is the only one that cannot go through.
    $this->actingAs($user)
        ->put(route('settings.notifications.update'), [
            'preferences' => ['_submitted' => '1'],
        ])
        ->assertSessionHasNoErrors();

    $saved = NotificationPreference::forUser($user)->resolved();

    expect($saved['inapp.appointments'])->toBeFalse()
        ->and($saved)->not->toHaveKey('_submitted');
});

// ── Enforcement ──────────────────────────────────────────────────────────────

test('a muted category is not delivered in-app', function () {
    $user = User::factory()->create();

    preferencesFor($user, ['inapp.appointments' => false]);

    notifyUser($user, 'confirmed');

    expect(AppointmentNotification::where('user_id', $user->id)->count())->toBe(0);
});

test('an unmuted category is still delivered', function () {
    $user = User::factory()->create();

    preferencesFor($user, ['inapp.appointments' => false]);

    notifyUser($user, 'lab_recorded');

    expect(AppointmentNotification::where('user_id', $user->id)->count())->toBe(1);
});

test('an account with no preferences row receives everything', function () {
    $user = User::factory()->create();

    notifyUser($user, 'confirmed');

    expect(AppointmentNotification::where('user_id', $user->id)->count())->toBe(1);
});

/**
 * The exemption that matters clinically. Muting "Laboratory results" must not
 * be able to suppress the message telling a patient a value is out of range —
 * that is the one notification in this system whose non-delivery can cause
 * harm.
 */
test('a critical lab result ignores the mute', function () {
    $user = User::factory()->create();

    preferencesFor($user, ['inapp.lab_results' => false]);

    notifyUser($user, 'lab_recorded');
    notifyUser($user, 'lab_critical');

    $delivered = AppointmentNotification::where('user_id', $user->id)->pluck('type');

    expect($delivered)->toHaveCount(1)
        ->and($delivered->first())->toBe('lab_critical');
});

test('an unmapped notification type is delivered rather than dropped', function () {
    $user = User::factory()->create();

    preferencesFor($user, ['inapp.appointments' => false]);

    // A type with no entry in TYPE_CATEGORIES must still reach the person it
    // concerns — the safe direction for a notification added later without a
    // matching category.
    expect(NotificationPreference::allows($user->id, 'inapp', 'some_future_type'))->toBeTrue();
});

test('a doctor confirming an appointment respects the email preference', function () {
    $patient = User::factory()->create();
    $doctor = User::factory()->role('doctor')->create();

    preferencesFor($patient, ['email.appointments' => false]);

    $appointment = Appointment::factory()->create([
        'user_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => 'requested',
        'email' => $patient->email,
    ]);

    Mail::fake();

    $this->actingAs($doctor)
        ->post(route('doctor.appointments.confirm', $appointment))
        ->assertSessionHasNoErrors();

    Mail::assertNothingSent();

    expect($appointment->refresh()->status)->toBe('confirmed');
});
