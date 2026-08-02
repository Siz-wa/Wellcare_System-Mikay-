<?php

use App\Models\Appointment;
use App\Models\Patient;

/**
 * Figure 3's "Archive" use case.
 *
 * No schema was added for this: `appointments` and `patients` have carried
 * softDeletes() since they were created, so archiving already happened —
 * there was simply no way to see or undo it. These tests cover the surface
 * that makes it usable, plus the one behaviour that is easy to assume wrongly:
 * restoring a patient does NOT cascade to their appointments.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

// ── Listing ───────────────────────────────────────────────────────────────────

it('lists archived appointments and patients, and nothing live', function () {
    $liveAppointment = Appointment::factory()->create();
    $archivedAppointment = Appointment::factory()->create();
    $archivedAppointment->delete();

    $livePatient = Patient::factory()->create();
    $archivedPatient = Patient::factory()->create();
    $archivedPatient->delete();

    $this->actingAs($this->admin)
        ->get('/admin/archive')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/archive/archive')
            ->has('appointments', 1)
            ->has('patients', 1)
            ->where('stats.appointments', 1)
            ->where('stats.patients', 1)
            ->where('appointments.0.id', $archivedAppointment->id)
            ->where('patients.0.id', $archivedPatient->id)
        );

    // The live rows must not appear anywhere in the archive payload.
    expect(Appointment::find($liveAppointment->id))->not->toBeNull()
        ->and(Patient::find($livePatient->id))->not->toBeNull();
});

it('shows an empty archive when nothing has been archived', function () {
    Appointment::factory()->create();

    $this->actingAs($this->admin)
        ->get('/admin/archive')
        ->assertInertia(fn ($page) => $page
            ->has('appointments', 0)
            ->has('patients', 0)
        );
});

// ── Restoring ─────────────────────────────────────────────────────────────────

it('restores an archived appointment', function () {
    $appointment = Appointment::factory()->create();
    $appointment->delete();

    $this->actingAs($this->admin)
        ->post("/admin/archive/appointments/{$appointment->id}/restore")
        ->assertRedirect();

    expect(Appointment::find($appointment->id))->not->toBeNull()
        ->and(Appointment::onlyTrashed()->find($appointment->id))->toBeNull();
});

it('restores an archived patient', function () {
    $patient = Patient::factory()->create();
    $patient->delete();

    $this->actingAs($this->admin)
        ->post("/admin/archive/patients/{$patient->id}/restore")
        ->assertRedirect();

    expect(Patient::find($patient->id))->not->toBeNull();
});

it('does not restore a patient\'s appointments along with them', function () {
    // Laravel's soft deletes carry no parent/child relationship. Guessing at
    // one would resurrect visits that were cancelled for their own reasons, so
    // the two lists are restored independently and the UI says so.
    $patient = Patient::factory()->create();
    $appointment = Appointment::factory()->create(['patient_id' => $patient->id]);

    $appointment->delete();
    $patient->delete();

    $this->actingAs($this->admin)
        ->post("/admin/archive/patients/{$patient->id}/restore");

    expect(Patient::find($patient->id))->not->toBeNull()
        ->and(Appointment::onlyTrashed()->find($appointment->id))->not->toBeNull();
});

it('404s when restoring a record that was never archived', function () {
    $appointment = Appointment::factory()->create();

    $this->actingAs($this->admin)
        ->post("/admin/archive/appointments/{$appointment->id}/restore")
        ->assertNotFound();
});

it('404s when restoring a record that does not exist', function () {
    $this->actingAs($this->admin)
        ->post('/admin/archive/patients/999999/restore')
        ->assertNotFound();
});

// ── Restored records return to their owning role ──────────────────────────────

it('makes a restored appointment visible to its doctor again', function () {
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'confirmed',
    ]);

    $appointment->delete();

    $this->actingAs($doctor)
        ->get('/doctor/appointments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointments', fn ($rows) => collect($rows)
                ->pluck('id')
                ->doesntContain($appointment->id)
            )
        );

    $this->actingAs($this->admin)
        ->post("/admin/archive/appointments/{$appointment->id}/restore");

    $this->actingAs($doctor)
        ->get('/doctor/appointments')
        ->assertInertia(fn ($page) => $page
            ->where('appointments', fn ($rows) => collect($rows)
                ->pluck('id')
                ->contains($appointment->id)
            )
        );
});
