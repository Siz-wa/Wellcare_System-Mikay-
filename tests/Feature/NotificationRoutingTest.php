<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\Patient;

/**
 * Where a notification takes you when it is clicked.
 *
 * Written after a defect that two earlier fixes failed to reach, because the
 * routing existed in two places and the tests only covered one:
 *
 *   - `HandleInertiaRequests` shares `notifications` on every request.
 *   - `PatientDashboardController` builds its OWN `notifications` payload, which
 *     overrides the shared one for that page — and hardcoded
 *     `'action_url' => null`.
 *
 * So every notification on the patient dashboard was a dead click, a passing
 * test asserted the correct URL on a different page, and correcting the
 * middleware changed nothing where it was actually broken. The routing now lives
 * on the model; these tests assert it arrives through **both** doors.
 *
 * A null `action_url` fails silently — the click handler simply does nothing —
 * which is why this is asserted rather than left to manual testing.
 */
beforeEach(function () {
    $this->booker = userWithRole('user');
    $this->doctor = userWithRole('doctor');
    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->notify = function (string $type, $user = null) {
        $appointment = Appointment::factory()
            ->forPatient($this->record)
            ->forDoctor($this->doctor)
            ->create();

        return AppointmentNotification::create([
            'appointment_id' => $appointment->id,
            'user_id' => ($user ?? $this->booker)->id,
            'type' => $type,
            'subject' => 'Test',
            'body' => 'Test',
            'read' => false,
        ]);
    };
});

it('routes a notification by the reader role and the type', function (string $role, string $type, string $expected) {
    $user = $role === 'user' ? $this->booker : userWithRole($role);

    expect(($this->notify)($type, $user)->actionUrlFor($user))->toBe($expected);
})->with([
    // The most time-critical notification in the app: a doctor is in a room
    // waiting. It had no case at all and fell through to the dashboard, which
    // has no join button.
    'patient, room opened' => ['user', 'consultation_started', '/user/consultations'],
    'patient, anything else' => ['user', 'confirmed', '/user/dashboard'],
    'doctor, critical result' => ['doctor', 'lab_critical', '/doctor/lab-reviews'],
    'doctor, anything else' => ['doctor', 'confirmed', '/doctor/appointments'],
    'hr, hmo request' => ['hr', 'hmo_submitted', '/hr/hmo-approvals'],
    'nurse, one workspace' => ['nurse', 'lab_requested', '/nurse/lab-queue'],
]);

/**
 * The regression that matters. Both of these pages hand notifications to the
 * same bell; only one of them goes through the middleware.
 */
it('gives every page that ships notifications a usable action url', function (string $url) {
    ($this->notify)('consultation_started');

    $this->actingAs($this->booker)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.0.type', 'consultation_started')
            // Not merely present — a null here is the bug, and it is invisible
            // until a human clicks and nothing happens.
            ->where('notifications.0.action_url', '/user/consultations')
        );
})->with([
    // Builds its own notifications payload, overriding the shared prop.
    'patient dashboard' => '/user/dashboard',
    // Uses the shared prop from HandleInertiaRequests.
    'consultations list' => '/user/consultations',
]);
