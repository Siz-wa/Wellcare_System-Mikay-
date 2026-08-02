<?php

use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\Patient;

/**
 * The nurse dashboard and the daily appointment monitor.
 *
 * Also pins the landing route: before Phase 5 a nurse logging in went straight
 * to the lab queue, because that was the whole role. DashboardController and
 * LoginResponse share `routeForUser()` precisely so the two can never disagree
 * about that, and this file asserts the shared answer.
 */
beforeEach(function () {
    $this->nurse = userWithRole('nurse');
    $this->doctor = userWithRole('doctor');
});

// ── Landing route ─────────────────────────────────────────────────────────────

it('lands a nurse on the dashboard rather than the lab queue', function () {
    $this->actingAs($this->nurse)
        ->get('/dashboard')
        ->assertRedirect(route('nurse.dashboard'));
});

// ── Dashboard stats ───────────────────────────────────────────────────────────

it('counts today\'s work on the nurse dashboard', function () {
    $patient = Patient::factory()->create();

    // Two appointments today, one of them checked in; one cancelled today,
    // which must not count toward the active total.
    Appointment::factory()->count(2)->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'confirmed',
    ]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'checked_in',
    ]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'cancelled',
    ]);
    // Tomorrow — must not appear in today's numbers at all.
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => today()->addDay(),
        'status' => 'confirmed',
    ]);

    LabTestResult::factory()->count(2)->create([
        'patient_id' => $patient->id,
        'status' => 'requested',
    ]);

    $this->actingAs($this->nurse)
        ->get('/nurse/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('nurse/dashboard/dashboard')
            ->where('stats.appointmentsToday', 3)
            ->where('stats.checkedInToday', 1)
            ->where('stats.pendingLabs', 2)
            ->has('upcoming', 3)
        );
});

// ── Appointment monitor ───────────────────────────────────────────────────────

it('shows only the requested day in the appointment monitor', function () {
    $patient = Patient::factory()->create();

    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'confirmed',
    ]);
    Appointment::factory()->count(2)->create([
        'patient_id' => $patient->id,
        'appointment_date' => today()->addDays(3),
        'status' => 'confirmed',
    ]);

    $this->actingAs($this->nurse)
        ->get('/nurse/appointments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('isToday', true)
            ->has('appointments', 1)
        );

    $target = today()->addDays(3)->toDateString();

    $this->actingAs($this->nurse)
        ->get("/nurse/appointments?date={$target}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('date', $target)
            ->where('isToday', false)
            ->has('appointments', 2)
        );
});

it('falls back to today when the date parameter is malformed', function () {
    $this->actingAs($this->nurse)
        ->get('/nurse/appointments?date=not-a-date')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('date', today()->toDateString())
            ->where('isToday', true)
        );
});

it('separates cancelled appointments from the active count', function () {
    $patient = Patient::factory()->create();

    Appointment::factory()->count(2)->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'completed',
    ]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => today(),
        'status' => 'no_show',
    ]);

    $this->actingAs($this->nurse)
        ->get('/nurse/appointments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 2)
            ->where('stats.completed', 2)
            ->where('stats.cancelled', 1)
            // The row is still listed — the nurse needs to see a no-show.
            ->has('appointments', 3)
        );
});
