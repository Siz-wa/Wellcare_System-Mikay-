<?php

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use App\Models\RecordAccessLog;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

/**
 * SC-3 (the read audit trail) and QW-3 (auditing the four clinical models).
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.3, AU-1 through AU-3.
 *
 * Before these, a doctor could open any chart in the clinic and leave no trace,
 * and could create then delete a diagnosis with neither event recorded. The
 * consequence, spelled out in §2.7 B-1: after a compromised staff account the
 * only honest breach-notification scope was "every patient".
 */
function patientWithGuarantor(): array
{
    $guarantor = userWithRole('user');
    $patient = Patient::factory()->create(['guarantor_id' => $guarantor->id]);

    return [$guarantor, $patient];
}

// ── AU-2: reads are recorded ─────────────────────────────────────────────────

test('a doctor opening a chart is recorded against that patient', function () {
    [, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)
        ->get(route('doctor.patient-records.show', $patient))
        ->assertOk();

    $entry = RecordAccessLog::latest('id')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->action)->toBe('viewed')
        ->and($entry->actor_id)->toBe($doctor->id)
        ->and($entry->actor_role)->toBe('doctor')
        ->and($entry->patient_id)->toBe($patient->id)
        ->and($entry->route)->toBe('doctor.patient-records.show')
        ->and($entry->ip_address)->not->toBeNull();
});

test('a nurse opening a chart is recorded with the nurse role', function () {
    [, $patient] = patientWithGuarantor();
    $nurse = userWithRole('nurse');

    $this->actingAs($nurse)->get(route('nurse.patient-records.show', $patient))->assertOk();

    $entry = RecordAccessLog::latest('id')->first();

    expect($entry->actor_role)->toBe('nurse')
        ->and($entry->patient_id)->toBe($patient->id);
});

test('browsing the clinic-wide patient roster is recorded as a search', function () {
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->get(route('doctor.patient-records'))->assertOk();

    $entry = RecordAccessLog::latest('id')->first();

    // No patient_id: this is the roster, not one person's chart. The row exists
    // so that bulk enumeration by a single account is visible.
    expect($entry->action)->toBe('searched')
        ->and($entry->patient_id)->toBeNull();
});

test('downloading a patient document is recorded against the document', function () {
    Storage::fake('local');
    [, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    Storage::disk('local')->put("patient-documents/{$patient->id}/scan.pdf", 'x');

    $document = PatientDocument::create([
        'patient_id' => $patient->id,
        'user_id' => $patient->guarantor_id,
        'uploaded_by' => $doctor->id,
        'title' => 'Scan',
        'type' => 'imaging',
        'file_path' => "patient-documents/{$patient->id}/scan.pdf",
        'file_name' => 'scan.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1,
    ]);

    $this->actingAs($doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id))
        ->assertOk();

    $entry = RecordAccessLog::where('action', 'downloaded')->latest('id')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->patient_id)->toBe($patient->id)
        ->and($entry->subject_type)->toBe(PatientDocument::class)
        ->and($entry->subject_id)->toBe($document->id);
});

// ── AU-3: exports are recorded ───────────────────────────────────────────────

test('a full data export is recorded', function () {
    $user = userWithRole('user');

    $this->actingAs($user)->get(route('settings.privacy.export'))->assertOk();

    $entry = RecordAccessLog::where('action', 'exported')->latest('id')->first();

    expect($entry)->not->toBeNull()->and($entry->actor_id)->toBe($user->id);
});

test('an HR analytics export is recorded', function () {
    $hr = userWithRole('hr');

    $this->actingAs($hr)->get(route('hr.analytics.export', 'appointment-volume'))->assertOk();

    $entry = RecordAccessLog::where('action', 'exported')->latest('id')->first();

    expect($entry)->not->toBeNull()->and($entry->actor_role)->toBe('hr');
});

// ── The patient-facing half — DS-1 / transparency ────────────────────────────

test('a patient sees staff access to their record but not their own visits', function () {
    [$guarantor, $patient] = patientWithGuarantor();
    $nurse = userWithRole('nurse');

    // A nurse opens the chart, then the guarantor opens it themselves.
    $this->actingAs($nurse)->get(route('nurse.patient-records.show', $patient));

    $this->actingAs($guarantor)
        ->get(route('user.records.show', $patient))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('accessLog', 1)
            ->where('accessLog.0.role', 'Nurse')
            ->where('accessLog.0.action', 'viewed')
        );
});

test('the access list never names the individual staff member', function () {
    [$guarantor, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->get(route('doctor.patient-records.show', $patient));

    $this->actingAs($guarantor)
        ->get(route('user.records.show', $patient))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('accessLog.0.role', 'Doctor')
            ->missing('accessLog.0.actor_id')
            ->missing('accessLog.0.email')
        );
});

// ── AU-1: the four previously-unaudited clinical models ──────────────────────

test('creating and deleting a diagnosis both land in the activity log', function () {
    [, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->post(route('doctor.patient-records.diagnoses.store', $patient), [
        'diagnosis' => 'Acute Upper Respiratory Infection',
        'icd_code' => 'J06.9',
        'type' => 'primary',
        'status' => 'active',
        'diagnosed_at' => now()->subDay()->toDateString(),
    ]);

    $diagnosis = PatientDiagnosis::latest('id')->first();

    expect(Activity::where('subject_type', PatientDiagnosis::class)
        ->where('subject_id', $diagnosis->id)
        ->where('event', 'created')
        ->exists())->toBeTrue();

    $this->actingAs($doctor)
        ->delete(route('doctor.patient-records.diagnoses.destroy', $diagnosis->id));

    expect(Activity::where('subject_type', PatientDiagnosis::class)
        ->where('subject_id', $diagnosis->id)
        ->where('event', 'deleted')
        ->exists())->toBeTrue();
});

test('the audit log records who touched a diagnosis without recording what it said', function () {
    [, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->post(route('doctor.patient-records.diagnoses.store', $patient), [
        'diagnosis' => 'Major Depressive Disorder',
        'icd_code' => 'F32.9',
        'type' => 'primary',
        'status' => 'active',
        'diagnosed_at' => now()->subDay()->toDateString(),
    ]);

    $activity = Activity::where('subject_type', PatientDiagnosis::class)->latest('id')->first();
    $properties = json_encode($activity->properties);

    // Accountability without disclosure: the admin activity screen renders these
    // properties in full, so the clinical narrative must not be in them.
    expect($properties)->not->toContain('Major Depressive Disorder')
        ->and($properties)->not->toContain('F32.9')
        ->and($activity->properties['attributes']['patient_id'])->toBe($patient->id)
        ->and($activity->properties['attributes']['recorded_by'])->toBe($doctor->id)
        ->and($activity->properties['attributes']['status'])->toBe('active');
});

test('an allergy write is audited without naming the allergen', function () {
    [, $patient] = patientWithGuarantor();
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->post(route('doctor.patient-records.allergies.store', $patient), [
        'allergen' => 'Penicillin',
        'severity' => 'severe',
    ]);

    $allergy = PatientAllergy::latest('id')->first();
    $activity = Activity::where('subject_type', PatientAllergy::class)->latest('id')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->subject_id)->toBe($allergy->id)
        ->and(json_encode($activity->properties))->not->toContain('Penicillin')
        // Severity IS kept: silently downgrading a severe allergy is exactly the
        // change an audit trail is for, and it names no substance.
        ->and($activity->properties['attributes']['severity'])->toBe('severe');
});
