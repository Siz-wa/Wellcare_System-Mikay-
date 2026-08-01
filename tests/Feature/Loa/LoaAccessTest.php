<?php

use App\Models\LoaRequest;
use App\Models\Patient;

/**
 * The security boundary around Letters of Authorization.
 *
 * An LOA carries the patient's HMO provider and member ID — insurance identity,
 * not just scheduling data. Two boundaries matter and both are tested directly:
 *
 *   1. Guarantor isolation — a signed-in account may read only the LOAs of the
 *      patients it guarantees. `loa_requests.user_id` is the *guarantor*
 *      account and is shared between siblings, so the controller scopes on
 *      `patients.guarantor_id` instead. Scoping on user_id would leak one
 *      family member's coverage to another.
 *
 *   2. Role separation — Fig. 10 gives the nurse visibility, Fig. 8 gives HR
 *      the decision. Neither patients nor nurses may decide an LOA.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->hr = userWithRole('hr');
    $this->nurse = userWithRole('nurse');

    // Two people receiving care under one booking account.
    $this->alice = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Alice', 'last_name' => 'Reyes',
    ]);
    $this->bob = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Bob', 'last_name' => 'Reyes',
    ]);

    // A completely separate family.
    $this->stranger = userWithRole('user');
    $this->strangersPatient = Patient::factory()->forGuarantor($this->stranger)->create();
});

// ── Guarantor isolation ───────────────────────────────────────────────────────

it('lists the LOAs of every patient under the signed-in account', function () {
    LoaRequest::factory()->forPatient($this->alice)->create();
    LoaRequest::factory()->forPatient($this->bob)->approved()->create();

    $this->actingAs($this->guarantor)
        ->get('/user/loa-status')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/loa-status/loa-status')
            ->has('requests', 2)
            ->where('stats.total', 2)
        );
});

it('does not list LOAs belonging to another account', function () {
    LoaRequest::factory()->forPatient($this->alice)->create();
    $strangers = LoaRequest::factory()->forPatient($this->strangersPatient)->create();

    $this->actingAs($this->guarantor)
        ->get('/user/loa-status')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('requests', 1)
            ->where('requests', fn ($requests) => collect($requests)
                ->pluck('id')
                ->doesntContain($strangers->id)
            )
        );
});

it('never leaks another family\'s HMO member id', function () {
    LoaRequest::factory()->forPatient($this->strangersPatient)->create([
        'hmo_id' => 'SECRET-MEMBER-ID',
    ]);

    $response = $this->actingAs($this->guarantor)->get('/user/loa-status');

    $response->assertOk();
    expect($response->getContent())->not->toContain('SECRET-MEMBER-ID');
});

it('counts each status separately for the signed-in account only', function () {
    LoaRequest::factory()->forPatient($this->alice)->create();
    LoaRequest::factory()->forPatient($this->alice)->approved()->create();
    LoaRequest::factory()->forPatient($this->bob)->rejected()->create();
    // Noise from another family — must not move the counts.
    LoaRequest::factory()->forPatient($this->strangersPatient)->approved()->create();

    $this->actingAs($this->guarantor)
        ->get('/user/loa-status')
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 3)
            ->where('stats.pending', 1)
            ->where('stats.approved', 1)
            ->where('stats.rejected', 1)
        );
});

// ── Role separation ───────────────────────────────────────────────────────────

it('keeps the HR approvals queue away from patients and nurses', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->get('/hr/hmo-approvals')
        ->assertForbidden();
})->with(['guarantor', 'nurse']);

it('refuses an LOA decision from anyone outside HR', function (string $actor, string $action) {
    $loa = LoaRequest::factory()->forPatient($this->alice)->create();

    $this->actingAs($this->{$actor})
        ->post("/hr/hmo-approvals/{$loa->id}/{$action}", ['reason' => 'nope'])
        ->assertForbidden();

    expect($loa->fresh()->status)->toBe('submitted');
})->with([
    'patient approving' => ['guarantor', 'approve'],
    'patient rejecting' => ['guarantor', 'reject'],
    'nurse approving' => ['nurse', 'approve'],
    'nurse rejecting' => ['nurse', 'reject'],
]);

it('lets the nurse monitor LOAs but gives them no decision route', function () {
    LoaRequest::factory()->forPatient($this->alice)->create();
    LoaRequest::factory()->forPatient($this->bob)->approved()->create();

    $this->actingAs($this->nurse)
        ->get('/nurse/loa-monitoring')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('nurse/loa-monitoring/loa-monitoring')
            ->has('pending', 1)
            ->has('recent', 1)
        );
});

it('keeps the nurse LOA monitor away from patients', function () {
    $this->actingAs($this->guarantor)
        ->get('/nurse/loa-monitoring')
        ->assertForbidden();
});

it('requires a login for every LOA surface', function (string $url) {
    $this->get($url)->assertRedirect('/login');
})->with([
    '/user/loa-status',
    '/nurse/loa-monitoring',
    '/hr/hmo-approvals',
]);
