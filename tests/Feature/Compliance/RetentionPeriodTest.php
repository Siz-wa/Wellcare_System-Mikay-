<?php

use App\Exceptions\RetentionPeriodNotElapsedException;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use App\Models\RecordAccessLog;

/**
 * SC-1(d) / RET-5 — the enforced retention floor.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.6. The period itself is ND-6 and lives in
 * config/retention.php; these tests assert the mechanism, not the number, so a
 * corrected period does not break them.
 */
function retentionYears(string $key = 'clinical_record'): int
{
    return (int) config("retention.periods.{$key}");
}

test('the clinical-record period is configurable and defaults to the briefed 15 years', function () {
    expect(retentionYears())->toBe(15);
});

/**
 * The structural half of ND-6: DOH AO 2022-0007 sets laboratory retention per
 * document type, which a single global integer could not express. These assert
 * the table exists and is wired up — not that any figure is legally correct,
 * which no test in this repository can establish.
 */
test('laboratory paperwork is on its own, shorter schedule', function () {
    expect(retentionYears('lab_document'))->toBeLessThan(retentionYears('clinical_record'));
});

test('an unclassified record falls back to the longest period, never the shortest', function () {
    $default = (int) config('retention.periods.'.config('retention.default_period'));

    expect($default)->toBe(max(array_values((array) config('retention.periods'))));
});

test('a lab document is governed by the laboratory period and other documents are not', function () {
    $lab = new PatientDocument(['type' => 'lab']);
    $referral = new PatientDocument(['type' => 'referral']);

    $read = fn ($doc) => (new ReflectionMethod($doc, 'retentionPeriodKey'))->invoke($doc);

    expect($read($lab))->toBe('lab_document')
        ->and($read($referral))->toBe('clinical_record');
});

// ── The floor holds ──────────────────────────────────────────────────────────

test('a patient inside the retention period cannot be permanently deleted', function () {
    $patient = Patient::factory()->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYear(),
    ]);

    expect(fn () => $patient->forceDelete())
        ->toThrow(RetentionPeriodNotElapsedException::class);

    $this->assertDatabaseHas('patients', ['id' => $patient->id]);
});

test('soft-deleting is still allowed inside the period — archiving is not erasure', function () {
    $patient = Patient::factory()->create();

    $patient->delete();

    $this->assertSoftDeleted('patients', ['id' => $patient->id]);
});

test('an archived patient is still protected from permanent deletion', function () {
    $patient = Patient::factory()->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYear(),
    ]);
    $patient->delete();

    // Archiving must not start a shorter clock.
    expect(fn () => $patient->forceDelete())
        ->toThrow(RetentionPeriodNotElapsedException::class);
});

test('a clinical child record inherits the patient\'s retention, not its own age', function () {
    $patient = Patient::factory()->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subMonth(),
    ]);

    // Written long ago, but the patient was seen last month.
    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subYears(retentionYears() + 5),
        'created_at' => now()->subYears(retentionYears() + 5),
    ]);

    expect(fn () => $diagnosis->forceDelete())
        ->toThrow(RetentionPeriodNotElapsedException::class);
});

// ── The clock runs from the last encounter ───────────────────────────────────

test('retention is measured from the last encounter, not from record creation', function () {
    $patient = Patient::factory()->create(['created_at' => now()->subYears(retentionYears() + 5)]);

    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYear(),
    ]);

    expect($patient->retentionPeriodHasElapsed())->toBeFalse()
        ->and($patient->retentionExpiresAt()->year)->toBe(now()->subYear()->addYears(retentionYears())->year);
});

test('a new appointment extends retention across the whole record', function () {
    $patient = Patient::factory()->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYears(retentionYears() + 1),
    ]);

    expect($patient->refresh()->retentionPeriodHasElapsed())->toBeTrue();

    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subDay(),
    ]);

    expect($patient->refresh()->retentionPeriodHasElapsed())->toBeFalse();
});

test('an expired record can be permanently deleted', function () {
    $patient = Patient::factory()->create(['created_at' => now()->subYears(retentionYears() + 1)]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYears(retentionYears() + 1),
    ]);

    $patient->refresh()->forceDelete();

    $this->assertDatabaseMissing('patients', ['id' => $patient->id]);
});

// ── The purge command ────────────────────────────────────────────────────────

test('the purge command reports and deletes nothing by default', function () {
    $patient = Patient::factory()->create(['created_at' => now()->subYears(retentionYears() + 1)]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYears(retentionYears() + 1),
    ]);

    $this->artisan('wellcare:records:purge')
        ->expectsOutputToContain('eligible')
        ->assertSuccessful();

    $this->assertDatabaseHas('patients', ['id' => $patient->id]);
});

test('the purge command refuses --force while the config lock is on', function () {
    config(['retention.purge_enabled' => false]);

    $patient = Patient::factory()->create(['created_at' => now()->subYears(retentionYears() + 1)]);
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'appointment_date' => now()->subYears(retentionYears() + 1),
    ]);

    $this->artisan('wellcare:records:purge --force')->assertFailed();

    $this->assertDatabaseHas('patients', ['id' => $patient->id]);
});

test('the purge command removes expired records with both locks off', function () {
    config(['retention.purge_enabled' => true]);

    $expired = Patient::factory()->create(['created_at' => now()->subYears(retentionYears() + 1)]);
    Appointment::factory()->create([
        'patient_id' => $expired->id,
        'appointment_date' => now()->subYears(retentionYears() + 1),
    ]);

    $current = Patient::factory()->create();
    Appointment::factory()->create([
        'patient_id' => $current->id,
        'appointment_date' => now()->subMonth(),
    ]);

    $this->artisan('wellcare:records:purge --force')->assertSuccessful();

    $this->assertDatabaseMissing('patients', ['id' => $expired->id]);
    $this->assertDatabaseHas('patients', ['id' => $current->id]);
});

// ── Audit log retention (ND-3 / AU-6) ────────────────────────────────────────

test('the access log cleaner removes only entries past the audit period', function () {
    $patient = Patient::factory()->create();

    $old = RecordAccessLog::create([
        'actor_role' => 'doctor', 'patient_id' => $patient->id, 'action' => 'viewed',
    ]);
    $old->forceFill(['created_at' => now()->subYears((int) config('retention.audit_log_years') + 1)])->save();

    $recent = RecordAccessLog::create([
        'actor_role' => 'nurse', 'patient_id' => $patient->id, 'action' => 'viewed',
    ]);

    $this->artisan('wellcare:access-log:clean')->assertSuccessful();

    $this->assertDatabaseMissing('record_access_log', ['id' => $old->id]);
    $this->assertDatabaseHas('record_access_log', ['id' => $recent->id]);
});

test('the access log cleaner reports without deleting on a dry run', function () {
    $old = RecordAccessLog::create(['actor_role' => 'doctor', 'action' => 'viewed']);
    $old->forceFill(['created_at' => now()->subYears((int) config('retention.audit_log_years') + 1)])->save();

    $this->artisan('wellcare:access-log:clean --dry-run')->assertSuccessful();

    $this->assertDatabaseHas('record_access_log', ['id' => $old->id]);
});
