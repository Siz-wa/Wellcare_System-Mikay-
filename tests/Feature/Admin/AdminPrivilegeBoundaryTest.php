<?php

use App\Exceptions\AccountActionNotAllowedException;
use App\Models\LoaRequest;
use App\Models\RecordAccessLog;
use App\Models\User;
use App\Services\StaffAccountService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

/**
 * GV-1 and GV-6 in WELLCARE-GOVERNANCE-PLAN.md — the privilege boundary around
 * the account-management module.
 *
 * The defect this file exists to keep closed: until 2026-09-10,
 * `PUT /admin/users/{user}` accepted a `password` for ANY target user with no
 * role restriction. An administrator could set a doctor's password, sign in as
 * that doctor and read every chart in the clinic — and since
 * `User::activityLogAttributes()` audits only `email` and `is_active`, the
 * credential change left no trace at all and every read that followed was
 * attributed to the doctor. The compliance plan's A-9 verdict ("admin limited
 * to demographics — Pass") was true of the administrator's own screens and
 * false of their reach.
 *
 * The tests below assert the boundary from both directions: the routes refuse
 * what they should refuse, AND they still permit the legitimate work, so a
 * future change cannot satisfy them by disabling the module.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

// ── The password field is gone ────────────────────────────────────────────────

it('ignores a password submitted to the account edit route', function () {
    $doctor = userWithRole('doctor');
    $original = $doctor->password;

    $this->actingAs($this->admin)
        ->put("/admin/users/{$doctor->id}", [
            'first_name' => 'Renato',
            'last_name' => 'Bautista',
            'email' => $doctor->email,
            'contact_number' => '09171234567',
            // The attack payload. It must be inert, not merely unvalidated.
            'password' => 'Attacker-Kn0ws-This!',
            'password_confirmation' => 'Attacker-Kn0ws-This!',
        ])
        ->assertSessionHas('success');

    expect($doctor->fresh()->password)->toBe($original)
        ->and(Hash::check('Attacker-Kn0ws-This!', $doctor->fresh()->password))->toBeFalse();
});

it('still lets an administrator fix a subordinate account\'s details', function () {
    // The mirror of every refusal below: the module has to keep working, or
    // these tests could be satisfied by breaking it.
    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->put("/admin/users/{$nurse->id}", [
            'first_name' => 'Corazon',
            'last_name' => 'Villamor',
            'email' => 'corazon.villamor@wellcare.com',
            'contact_number' => '09181234567',
        ])
        ->assertSessionHas('success');

    expect($nurse->fresh()->email)->toBe('corazon.villamor@wellcare.com')
        ->and($nurse->fresh()->name)->toBe('Corazon Villamor');
});

// ── Peer and upward accounts are out of reach ─────────────────────────────────

it('refuses to let one administrator edit another', function () {
    $peer = userWithRole('admin');
    $originalEmail = $peer->email;

    $this->actingAs($this->admin)
        ->put("/admin/users/{$peer->id}", [
            'first_name' => 'Taken',
            'last_name' => 'Over',
            'email' => 'attacker-controlled@example.com',
            'contact_number' => '09171234567',
        ])
        ->assertSessionHas('error');

    expect($peer->fresh()->email)->toBe($originalEmail);
});

it('refuses to let an administrator edit their own account from the admin screen', function () {
    // Not a security boundary so much as an attribution one: changing your own
    // credentials belongs in Settings, where the audit trail records it as
    // yours rather than as "an administrator edited a user".
    $this->actingAs($this->admin)
        ->put("/admin/users/{$this->admin->id}", [
            'first_name' => 'Self',
            'last_name' => 'Edit',
            'email' => 'self-edit@wellcare.com',
            'contact_number' => '09171234567',
        ])
        ->assertSessionHas('error');

    expect($this->admin->fresh()->email)->not->toBe('self-edit@wellcare.com');
});

// ── Password reset goes to the account holder ─────────────────────────────────

it('mails a reset link to the account holder rather than setting a password', function () {
    Notification::fake();

    $nurse = userWithRole('nurse');
    $original = $nurse->password;

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/reset-password")
        ->assertSessionHas('success');

    Notification::assertSentTo($nurse, ResetPassword::class);

    // The administrator started the recovery and still does not hold the
    // credential — that is the whole point of the route.
    expect($nurse->fresh()->password)->toBe($original);
});

it('refuses to send a reset link for a peer administrator', function () {
    Notification::fake();

    $peer = userWithRole('admin');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$peer->id}/reset-password")
        ->assertSessionHas('error');

    Notification::assertNothingSent();
});

// ── An administrator cannot mint another administrator (GV-6) ─────────────────

it('refuses to let an administrator create a second administrator', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', [
            'first_name' => 'Second',
            'last_name' => 'Admin',
            'email' => 'second.admin@wellcare.com',
            'password' => 'Str0ng-Passw0rd!',
            'password_confirmation' => 'Str0ng-Passw0rd!',
            'role' => 'admin',
            'contact_number' => '09171234567',
        ])
        ->assertSessionHas('error');

    expect(User::where('email', 'second.admin@wellcare.com')->exists())->toBeFalse();
});

it('refuses to let an administrator promote an account to administrator', function () {
    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/role", ['role' => 'admin'])
        ->assertSessionHas('error');

    expect($nurse->fresh()->hasRole('admin'))->toBeFalse()
        ->and($nurse->fresh()->hasRole('nurse'))->toBeTrue();
});

it('still lets an administrator grant roles below their own tier', function () {
    $patient = userWithRole('user');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$patient->id}/role", ['role' => 'nurse'])
        ->assertSessionHas('success');

    expect($patient->fresh()->hasRole('nurse'))->toBeTrue();
});

// ── Containment stays available (the deliberate asymmetry) ────────────────────

it('still lets one administrator suspend another', function () {
    // Deliberately NOT tier-guarded — see StaffAccountService::setActive().
    // A compromised admin account must be stoppable at 2am without waiting for
    // the system owner, and suspension is loud and reversible where a silent
    // credential reset is neither.
    $peer = userWithRole('admin');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$peer->id}/deactivate")
        ->assertSessionHas('success');

    expect($peer->fresh()->is_active)->toBeFalse();
});

// ── Administrative reads are audited (GV-4) ───────────────────────────────────

it('records the administrator reading the patient roster', function () {
    // The compliance plan applied LogsRecordAccess to the doctor, nurse,
    // patient-portal and analytics surfaces and skipped this one. "Demographics
    // only" is a narrower disclosure than a chart, not a harmless one — this
    // screen is the whole roster, which is the shape of data an insider takes.
    $this->actingAs($this->admin)->get('/admin/patients')->assertOk();

    $entry = RecordAccessLog::query()->where('actor_id', $this->admin->id)->first();

    expect($entry)->not->toBeNull()
        ->and($entry->action)->toBe('searched')
        ->and($entry->actor_role)->toBe('admin')
        // Unscoped: a roster read is not a read of one person's record, and
        // recording a patient_id here would be a lie the breach query trusts.
        ->and($entry->patient_id)->toBeNull()
        ->and($entry->route)->toBe('admin.patients');
});

it('records the administrator reading the archive', function () {
    // Every row on that screen is a record somebody deliberately removed, which
    // makes it a more sensitive read than the live roster rather than a less
    // sensitive one.
    $this->actingAs($this->admin)->get('/admin/archive')->assertOk();

    expect(
        RecordAccessLog::query()
            ->where('actor_id', $this->admin->id)
            ->where('route', 'admin.archive')
            ->where('action', 'searched')
            ->exists()
    )->toBeTrue();
});

// ── Separation of duties: visibility without authority (GV-3) ─────────────────

it('lets an administrator see the LOA queue', function () {
    // Visibility is deliberate, not an oversight. The admin dashboard counts
    // `pendingLoa`, and a backlog an administrator cannot see is a backlog
    // nobody escalates.
    $this->actingAs($this->admin)
        ->get('/hr/hmo-approvals')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('hr/hmo-approvals/hmo-approvals')
            // …and the page is told not to offer the verbs.
            ->where('canDecide', false)
        );
});

it('refuses an LOA decision from an administrator', function (string $action) {
    // The control this file exists for, on the SoD side: the account that
    // provisions users, credentials doctors and restores archived records must
    // not also decide benefit eligibility. NIST SP 800-53 AC-5.
    $loa = LoaRequest::factory()->create();

    $this->actingAs($this->admin)
        ->post("/hr/hmo-approvals/{$loa->id}/{$action}", ['reason' => 'nope'])
        ->assertForbidden();

    expect($loa->fresh()->status)->toBe('submitted');
})->with(['approve', 'reject']);

it('still lets HR decide, and tells their page so', function () {
    $hr = userWithRole('hr');

    $this->actingAs($hr)
        ->get('/hr/hmo-approvals')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canDecide', true));
});

// ── The tier map itself ───────────────────────────────────────────────────────

it('ranks the roles so that authority only ever points downwards', function () {
    $owner = User::factory()->create();
    $owner->syncRoles(['admin']);

    expect(User::ROLE_TIERS['owner'])->toBeGreaterThan(User::ROLE_TIERS['admin'])
        // The DPO is a PEER of admin, not a subordinate: an admin who could
        // edit the DPO's account could take it over, and the independence that
        // makes DPO oversight worth anything would be decorative.
        ->and(User::ROLE_TIERS['dpo'])->toBe(User::ROLE_TIERS['admin'])
        ->and(User::ROLE_TIERS['admin'])->toBeGreaterThan(User::ROLE_TIERS['doctor'])
        ->and(User::ROLE_TIERS['doctor'])->toBeGreaterThan(User::ROLE_TIERS['user']);
});

it('gives an unknown role no authority at all', function () {
    // The safe direction for a role added to the seeder and forgotten here.
    $stranger = User::factory()->create();

    expect($stranger->privilegeTier())->toBe(0)
        ->and($stranger->mayAdminister($this->admin))->toBeFalse()
        ->and($stranger->mayGrantRole('user'))->toBeFalse();
});

it('refuses at the service layer, not only at the route', function () {
    // Defence in depth: a future console command or bulk action that calls the
    // service without a session behind it must hit the same wall.
    $service = app(StaffAccountService::class);
    $peer = userWithRole('admin');

    expect(fn () => $service->update($peer, [
        'first_name' => 'X',
        'last_name' => 'Y',
        'email' => 'x@example.com',
    ], $this->admin))->toThrow(AccountActionNotAllowedException::class);

    expect(fn () => $service->sendPasswordReset($peer, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class);
});
