<?php

use App\Models\Appointment;
use App\Models\LoaRequest;
use App\Models\Patient;

/**
 * The HR dashboard and the HMO approvals queue must report the same work.
 *
 * They used to count different tables. The dashboard counted
 * `appointments.status = pending_hmo_approval`; the queue listed
 * `LoaRequest::awaitingApproval()`. An HMO appointment written without its LOA
 * row — a seeder, or any future path that skips LoaService — appeared in the
 * dashboard's count and list but was absent from the only screen where the
 * decision can be made.
 *
 * Found in the September end-to-end run: the dashboard said six pending, the
 * queue offered three, and the three patients in the gap waited on a decision
 * nobody could reach. The invariant is that the number shown is the number of
 * requests HR can actually action.
 */
function pendingHmoAppointment(bool $withLoa = true): Appointment
{
    $patient = Patient::factory()->create();

    $appointment = Appointment::factory()
        ->forPatient($patient)
        ->create([
            'coverage' => 'hmo',
            'hmo' => 'Maxicare',
            'hmo_id' => 'MC-'.fake()->numerify('######'),
            'status' => 'pending_hmo_approval',
        ]);

    if ($withLoa) {
        $appointment->loaRequest()->create([
            'patient_id' => $appointment->patient_id,
            'user_id' => $appointment->user_id,
            'hmo_provider' => $appointment->hmo,
            'hmo_id' => $appointment->hmo_id,
            'status' => 'submitted',
            'requested_at' => now()->subDay(),
        ]);
    }

    return $appointment;
}

it('reports the same pending count on the dashboard and in the queue', function () {
    $hr = userWithRole('hr');

    pendingHmoAppointment();
    pendingHmoAppointment();

    // The shape that used to break it: an appointment stuck at
    // pending_hmo_approval with no request row behind it.
    pendingHmoAppointment(withLoa: false);

    expect(Appointment::where('status', 'pending_hmo_approval')->count())->toBe(3)
        ->and(LoaRequest::awaitingApproval()->count())->toBe(2);

    $dashboard = $this->actingAs($hr)->get('/hr/dashboard')->assertOk();
    $queue = $this->actingAs($hr)->get('/hr/hmo-approvals')->assertOk();

    $dashboardCount = $dashboard->viewData('page')['props']['stats']['pendingHmo'];
    $queueCount = $queue->viewData('page')['props']['stats']['pending'];

    // Both report what HR can act on, so they agree — and neither claims the
    // orphaned appointment is waiting for them.
    expect($dashboardCount)->toBe($queueCount)
        ->and($dashboardCount)->toBe(2);
});

it('lists on the dashboard only what the queue can open', function () {
    $hr = userWithRole('hr');

    $actionable = pendingHmoAppointment();
    $orphaned = pendingHmoAppointment(withLoa: false);

    $page = $this->actingAs($hr)->get('/hr/dashboard')->assertOk();
    $ids = collect($page->viewData('page')['props']['pending'])->pluck('id');

    expect($ids)->toContain($actionable->id)
        ->and($ids)->not->toContain($orphaned->id);
});

it('counts today decisions from the LOA register, not from appointment timestamps', function () {
    $hr = userWithRole('hr');

    $approved = pendingHmoAppointment();
    $approved->loaRequest->update([
        'status' => 'approved',
        'approved_by' => $hr->id,
        'approved_at' => now(),
    ]);

    $rejected = pendingHmoAppointment();
    $rejected->loaRequest->update([
        'status' => 'rejected',
        'rejected_at' => now(),
    ]);

    // An appointment merely touched today must not read as a decision. Before
    // the fix `approvedToday` was any HMO appointment at `requested` whose
    // `updated_at` fell today, which is true of any edit at all.
    $untouched = pendingHmoAppointment();
    $untouched->touch();

    $page = $this->actingAs($hr)->get('/hr/dashboard')->assertOk();
    $stats = $page->viewData('page')['props']['stats'];

    expect($stats['approvedToday'])->toBe(1)
        ->and($stats['rejectedToday'])->toBe(1)
        ->and($stats['pendingHmo'])->toBe(1);
});
