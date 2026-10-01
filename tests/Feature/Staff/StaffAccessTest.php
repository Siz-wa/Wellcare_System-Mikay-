<?php

use App\Models\DoctorProfile;

/**
 * Who may act as the clinic's medical director.
 *
 * Credentialing is an authorization decision — it is the thing that lets a
 * person see patients — so the whole module is `role:admin` and nothing else.
 * A doctor must not be able to verify their own licence, and HR must not be
 * able to confer a specialty.
 *
 * Mirrors AdminAccessTest and NurseAccessTest: every route in the group is
 * listed, so a route added later without a matching gate shows up here as a
 * failure rather than as an open door.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Gated',
        'specialty' => 'general',
        'is_active' => false,
    ]);
});

dataset('non-admin roles', ['doctor', 'nurse', 'hr', 'user']);

it('keeps the staff roster to administrators', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get('/admin/staff')
        ->assertForbidden();
})->with('non-admin roles');

it('keeps the schedule approval queue to administrators', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get('/admin/staff/roster')
        ->assertForbidden();
})->with('non-admin roles');

it('keeps a staff credentialing file to administrators', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get("/admin/staff/{$this->doctor->id}")
        ->assertForbidden();
})->with('non-admin roles');

it('stops a doctor verifying their own credentials', function () {
    $this->actingAs($this->doctor)
        ->post("/admin/staff/{$this->doctor->id}/verify")
        ->assertForbidden();

    expect($this->doctor->fresh()->doctorProfile->is_active)->toBeFalse();
});

it('stops a doctor conferring their own specialty', function () {
    $this->actingAs($this->doctor)
        ->post("/admin/staff/{$this->doctor->id}/specialty", ['specialty' => 'cardiology'])
        ->assertForbidden();

    expect($this->doctor->fresh()->doctorProfile->specialty)->toBe('general');
});

it('stops a doctor publishing their own schedule', function () {
    $this->actingAs($this->doctor)
        ->post("/admin/staff/{$this->doctor->id}/schedule/publish")
        ->assertForbidden();
});

it('stops non-administrators writing a credentialing file', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->put("/admin/staff/{$this->doctor->id}/credentials", ['prc_license_no' => '0123456'])
        ->assertForbidden();

    expect($this->doctor->fresh()->credential)->toBeNull();
})->with('non-admin roles');

it('stops non-administrators suspending a colleague', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->post("/admin/staff/{$this->doctor->id}/suspend", ['remarks' => 'x'])
        ->assertForbidden();
})->with('non-admin roles');

it('requires authentication for the whole module', function () {
    $this->get('/admin/staff')->assertRedirect('/login');
    $this->get('/admin/staff/roster')->assertRedirect('/login');
});

it('404s on a credentialing file for an account that is not clinical', function () {
    // Credentialing describes clinical practice; an HR or patient account has
    // no licence to hold, so there is no file to render.
    $this->actingAs(userWithRole('admin'))
        ->get('/admin/staff/'.userWithRole('user')->id)
        ->assertNotFound();
});
