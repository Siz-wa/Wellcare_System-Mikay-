<?php

use App\Models\Patient;
use App\Models\RecordAccessLog;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * GV-2, GV-5 and GV-6 in WELLCARE-GOVERNANCE-PLAN.md — the permission matrix
 * and the two governance roles it introduced.
 *
 * The matrix asserted here is the one in RoleAndPermissionSeeder::MATRIX. These
 * tests exist so that a grant added there for convenience — the commonest way a
 * role model erodes — fails loudly rather than silently widening somebody's
 * reach.
 *
 * The negative assertions are the important ones. "The DPO cannot manage
 * accounts" is not a limitation to be relaxed when it becomes inconvenient; it
 * is the control that makes their view of administrator activity independent of
 * the administrators it describes (NIST SP 800-53 AU-9(4)).
 */

// ── The matrix exists at all (GV-2) ───────────────────────────────────────────

it('creates every permission in the vocabulary', function () {
    // Before 2026-09-10 this seeder created five roles and zero permissions, so
    // spatie/laravel-permission was carried at full cost for none of its
    // benefit and authorization was role-NAME string matching.
    expect(Permission::count())->toBe(count(RoleAndPermissionSeeder::PERMISSIONS));

    foreach (RoleAndPermissionSeeder::PERMISSIONS as $permission) {
        expect(Permission::where('name', $permission)->exists())->toBeTrue();
    }
});

it('gives every role exactly the permissions the matrix names', function () {
    foreach (RoleAndPermissionSeeder::MATRIX as $roleName => $expected) {
        $actual = Role::where('name', $roleName)
            ->firstOrFail()
            ->permissions
            ->pluck('name')
            ->sort()
            ->values()
            ->all();

        expect($actual)->toBe(collect($expected)->sort()->values()->all());
    }
});

it('is idempotent — re-seeding converges rather than accumulating', function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(RoleAndPermissionSeeder::class);

    expect(Permission::count())->toBe(count(RoleAndPermissionSeeder::PERMISSIONS))
        ->and(Role::where('name', 'admin')->firstOrFail()->permissions)
        ->toHaveCount(count(RoleAndPermissionSeeder::MATRIX['admin']));
});

// ── The owner tier (GV-6) ─────────────────────────────────────────────────────

it('lands the owner on their own dashboard', function () {
    $owner = userWithRole('owner');

    $this->actingAs($owner)
        ->get('/owner/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('owner/dashboard'));
});

it('lets the owner appoint an administrator', function () {
    // The capability that justifies the tier existing at all. An admin cannot
    // do this — see AdminPrivilegeBoundaryTest.
    $owner = userWithRole('owner');
    $nurse = userWithRole('nurse');

    $this->actingAs($owner)
        ->post("/admin/users/{$nurse->id}/role", ['role' => 'admin'])
        ->assertSessionHas('success');

    expect($nurse->fresh()->hasRole('admin'))->toBeTrue();
});

it('lets the owner reach an administrator account an admin cannot', function () {
    // The tier rule in one assertion: tier 3 administers tier 2, and tier 2
    // does not administer tier 2.
    $owner = userWithRole('owner');
    $admin = userWithRole('admin');

    $this->actingAs($owner)
        ->post("/admin/users/{$admin->id}/reset-password")
        ->assertSessionHas('success');
});

it('keeps the owner out of every patient surface', function (string $url) {
    // §5.1: the tier that appoints administrators is the tier with the most to
    // gain from a compromise. Keeping it away from the record means an owner
    // compromise costs the control plane and not the charts.
    $this->actingAs(userWithRole('owner'))
        ->get($url)
        ->assertForbidden();
})->with([
    '/admin/patients',
    '/admin/archive',
    '/admin/staff',
]);

it('exposes no route that can create an owner', function () {
    // The invariant behind CreateOwnerAccount being a console command. If a web
    // request could mint this role, the tier would add a rank without adding a
    // control.
    $admin = userWithRole('admin');

    $this->actingAs($admin)
        ->post('/admin/users', [
            'first_name' => 'Escalated',
            'last_name' => 'Owner',
            'email' => 'escalated@wellcare.com',
            'password' => 'Str0ng-Passw0rd!',
            'password_confirmation' => 'Str0ng-Passw0rd!',
            'role' => 'owner',
            'contact_number' => '09171234567',
        ])
        // `owner` is not in StoreUserRequest::ROLES, so this fails validation
        // before the tier guard is even reached — two independent walls.
        ->assertSessionHasErrors('role');

    expect(User::where('email', 'escalated@wellcare.com')->exists())->toBeFalse();
});

// ── The DPO (GV-5) ────────────────────────────────────────────────────────────

it('gives the DPO the oversight surface', function (string $url, string $component) {
    $this->actingAs(userWithRole('dpo'))
        ->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['/dpo/dashboard', 'dpo/dashboard'],
    ['/dpo/access-log', 'dpo/access-log'],
    ['/dpo/activity-log', 'dpo/activity-log'],
]);

it('shows the DPO the break-glass events nobody else can see', function () {
    $patient = Patient::factory()->create();
    $doctor = userWithRole('doctor');

    // The row PatientPolicy writes when clinical staff open a chart they hold
    // no appointment with. Permitted and recorded rather than refused; this
    // screen is the review that makes permitting it defensible.
    RecordAccessLog::create([
        'actor_id' => $doctor->id,
        'actor_role' => 'doctor',
        'patient_id' => $patient->id,
        'action' => 'viewed',
        'had_care_relationship' => false,
        'route' => 'doctor.patient-records.show',
    ]);

    $this->actingAs(userWithRole('dpo'))
        ->get('/dpo/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('stats.breakGlassTotal', 1)
            ->has('breakGlass', 1)
            ->where('breakGlass.0.careRelationship', false)
        );
});

it('refuses the DPO every account-management route', function (string $method, string $url) {
    // The negative space in the matrix, asserted. A DPO who could manage
    // accounts would be auditing colleagues they can appoint and suspend, and
    // the independence would be decorative.
    $target = userWithRole('nurse');
    $url = str_replace('{id}', (string) $target->id, $url);

    $this->actingAs(userWithRole('dpo'))
        ->{$method}($url)
        ->assertForbidden();
})->with([
    ['get', '/admin/users'],
    ['post', '/admin/users'],
    ['post', '/admin/users/{id}/deactivate'],
    ['post', '/admin/users/{id}/role'],
    ['post', '/admin/users/{id}/reset-password'],
]);

it('refuses the DPO every patient surface', function (string $url) {
    $this->actingAs(userWithRole('dpo'))
        ->get($url)
        ->assertForbidden();
})->with([
    '/admin/patients',
    '/admin/archive',
    '/doctor/patient-records',
    '/nurse/patient-records',
]);

it('keeps the access log away from administrators', function () {
    // The other half of AU-9(4): the read log records the administrators, so
    // the administrators are not the ones who read it.
    $this->actingAs(userWithRole('admin'))
        ->get('/dpo/access-log')
        ->assertForbidden();
});
