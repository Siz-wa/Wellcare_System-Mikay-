<?php

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Spatie\Activitylog\Models\Activity;

/**
 * Figure 3's "Activity Log" oval and Figure 4's "Monitor System" flow.
 *
 * The security assertion is the important one. Spatie's logAll()/logFillable()
 * would copy `password`, `two_factor_secret`, `two_factor_recovery_codes` and
 * `remember_token` into activity_log.properties as readable JSON — the exact
 * fields User::$hidden exists to keep out of serialized output — and then
 * render them in an admin table. App\Concerns\RecordsActivity names attributes
 * explicitly to prevent that, and these tests hold that line.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');

    // userWithRole() creates the account only. Names live on patient_profiles
    // (User::getNameAttribute reads it), so without this the causer column
    // falls back to the email and the assertions below would test the fallback
    // rather than the real path.
    $this->admin->profile()->create([
        'first_name' => 'Sofia',
        'last_name' => 'Delacruz',
        'classification' => 'old',
    ]);
});

// ── Entries are written ───────────────────────────────────────────────────────

it('records an entry when an admin deactivates an account', function () {
    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)->post("/admin/users/{$nurse->id}/deactivate");

    // Filter on the event, not on ordering: creating the nurse writes its own
    // `created` entry in the same second.
    $entry = Activity::where('subject_type', User::class)
        ->where('subject_id', $nurse->id)
        ->where('event', 'updated')
        ->latest('id')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->event)->toBe('updated')
        ->and($entry->causer_id)->toBe($this->admin->id)
        ->and($entry->properties['attributes']['is_active'])->toBeFalse();
});

it('records the appointment status transitions a doctor makes', function () {
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'checked_in',
    ]);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/start");

    // Target the `updated` entry explicitly. The factory's own insert also
    // writes a `created` entry in the same second, so filtering by event is
    // what makes this deterministic rather than relying on ordering.
    $entry = Activity::where('subject_type', Appointment::class)
        ->where('subject_id', $appointment->id)
        ->where('event', 'updated')
        ->latest('id')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->properties['attributes']['status'])->toBe('in_progress')
        ->and($entry->properties['old']['status'])->toBe('checked_in');
});

it('writes nothing when a save changes none of the audited attributes', function () {
    // dontSubmitEmptyLogs() keeps the table a list of real changes rather than
    // a list of requests.
    $nurse = userWithRole('nurse');
    Activity::query()->delete();

    $nurse->touch();

    expect(Activity::count())->toBe(0);
});

// ── Credentials never reach the log ───────────────────────────────────────────

it('never records a password hash', function () {
    $user = userWithRole('nurse');

    $user->update(['password' => 'a-completely-new-password']);

    $properties = Activity::where('subject_id', $user->id)->get()
        ->flatMap(fn (Activity $a) => [json_encode($a->properties)])
        ->implode(' ');

    expect($properties)
        ->not->toContain('password')
        ->not->toContain('$2y$');
});

it('never records two-factor secrets or the remember token', function () {
    $user = userWithRole('doctor');

    $user->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['code-1'])),
        'remember_token' => 'a-remember-token',
    ])->save();

    $properties = Activity::where('subject_id', $user->id)->get()
        ->flatMap(fn (Activity $a) => [json_encode($a->properties)])
        ->implode(' ');

    expect($properties)
        ->not->toContain('two_factor_secret')
        ->not->toContain('two_factor_recovery_codes')
        ->not->toContain('remember_token')
        ->not->toContain('a-remember-token');
});

it('never sends credentials to the activity log page', function () {
    $user = userWithRole('nurse');
    $user->update(['email' => 'changed@wellcare.com']);

    $response = $this->actingAs($this->admin)->get('/admin/activity-log');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('two_factor_secret')
        ->not->toContain('remember_token')
        ->not->toContain('$2y$');
});

// ── The viewer ────────────────────────────────────────────────────────────────

it('lists entries with the causer and a field-level diff', function () {
    $nurse = userWithRole('nurse');
    // Clear the account-creation entries so the deactivation is the newest.
    Activity::query()->delete();

    $this->actingAs($this->admin)->post("/admin/users/{$nurse->id}/deactivate");

    $this->actingAs($this->admin)
        ->get('/admin/activity-log')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/activity-log/activity-log')
            ->has('activities.data', 1)
            ->where('activities.data.0.causer', 'Sofia Delacruz')
            ->where('activities.data.0.subjectType', 'User')
            ->where('activities.data.0.causerRole', 'admin')
            ->where('activities.data.0.changes', fn ($changes) => collect($changes)
                ->contains(fn ($change) => $change['field'] === 'is active'
                    && $change['to'] === 'no')
            )
        );
});

it('filters entries by record type', function () {
    $nurse = userWithRole('nurse');
    $this->actingAs($this->admin)->post("/admin/users/{$nurse->id}/deactivate");

    Appointment::factory()->create()->update(['status' => 'cancelled']);

    $this->actingAs($this->admin)
        ->get('/admin/activity-log?log=appointment')
        ->assertInertia(fn ($page) => $page
            ->where('activities.data', fn ($rows) => collect($rows)
                ->every(fn ($row) => $row['logName'] === 'appointment')
            )
        );
});

it('labels a system action rather than leaving the causer blank', function () {
    // A null causer is a seeder, migration or console command. An empty cell
    // would read as missing data.
    $nurse = userWithRole('nurse');
    Activity::query()->delete();

    $nurse->update(['is_active' => false]);   // no authenticated user

    $this->actingAs($this->admin)
        ->get('/admin/activity-log')
        ->assertInertia(fn ($page) => $page
            ->has('activities.data', 1)
            ->where('activities.data.0.causer', 'System')
        );
});

it('offers no route to edit or delete an entry', function () {
    // An audit trail an administrator can rewrite is not an audit trail.
    $routes = collect(Route::getRoutes())
        ->map(fn ($route) => $route->uri())
        ->filter(fn (string $uri) => str_contains($uri, 'activity-log'));

    expect($routes)->toHaveCount(1)
        ->and($routes->first())->toBe('admin/activity-log');
});
