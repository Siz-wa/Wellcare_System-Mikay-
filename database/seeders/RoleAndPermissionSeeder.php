<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * The authorization matrix, written down in one place.
 *
 * GV-2 in WELLCARE-GOVERNANCE-PLAN.md. Until 2026-09-10 this seeder created
 * five roles and **zero permissions** — `grep -rn "Permission::" app/ database/`
 * returned nothing — so `spatie/laravel-permission` was carried at full cost
 * (three migrated tables, a registrar on every request) for none of its
 * benefit. Authorization was role-*name* string matching in route middleware,
 * which meant there was no vocabulary in which to say "this administrator may
 * manage users but may not restore archived records". Every admin account was
 * identical and maximal.
 *
 * ## How to read the matrix below
 *
 * A permission is a *capability*, not a screen. `users.credentials.reset` is
 * "may start a password recovery for somebody else", which is a different power
 * from `users.update` ("may correct somebody's phone number") even though both
 * live on the same page. Splitting them is what lets the two be granted apart
 * later without a migration.
 *
 * ## Two roles that are new here
 *
 * `owner` — the Tier 0 account of §5.1. It appoints administrators and recovers
 * the system, and it deliberately holds **no patient permission of any kind**.
 * The tier that can appoint administrators is the tier with the most to gain
 * from a compromise; keeping it away from the record means an owner compromise
 * costs the control plane and not the charts.
 *
 * `dpo` — the Data Protection Officer of §5.3, the role the Health Privacy Code
 * (Joint AO 2016-0002) actually names. Its defining property is what it cannot
 * do: it holds no account-management permission at all. That inability IS the
 * control — it is what makes its view of administrator activity independent of
 * the administrators it describes (NIST SP 800-53 AU-9(4)).
 *
 * ## Idempotent
 *
 * `firstOrCreate` throughout and `syncPermissions` on each role, so re-running
 * this seeder against an existing database converges on the matrix rather than
 * appending to it. A permission REMOVED from the arrays below is removed from
 * the role on the next run, which is the property that makes this file the
 * source of truth rather than a historical record of grants.
 */
class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Every capability the system recognises.
     *
     * @var array<int, string>
     */
    public const PERMISSIONS = [
        // Account lifecycle
        'users.view',
        'users.create',
        'users.update',
        'users.credentials.reset',
        'users.role.assign',
        'users.status.change',

        // The power to create more of yourself. Owner only — see GV-6 and
        // User::mayGrantRole(), which enforces the same rule in code so that a
        // permission grant alone cannot widen it.
        'admin.grant',

        // Clinic governance
        'staff.credential',
        'staff.schedule.publish',

        // Patient administration — demographics only. Nothing here reaches a
        // diagnosis, a SOAP note, a lab result or a document.
        'patients.demographics.view',
        'patients.demographics.update',

        // The recycle bin
        'archive.view',
        'archive.restore',

        // Oversight
        'audit.read',        // activity_log — who CHANGED what
        'access-log.read',   // record_access_log — who LOOKED at what

        // Clinic operations
        'loa.decide',
        'analytics.view',

        // The bookable catalogue. Separate from `system.configure`, which is
        // the owner's: what the clinic OFFERS is a clinical-operations
        // decision the administrator makes, not a platform setting.
        'services.manage',

        // Retention period, consent version, security settings
        'system.configure',
    ];

    /**
     * Which role holds which capability.
     *
     * @var array<string, array<int, string>>
     */
    public const MATRIX = [
        // Tier 0. Narrow on purpose: appointment, recovery, configuration.
        // No patient permission, no clinic operations.
        'owner' => [
            'users.view',
            'users.create',
            'users.update',
            'users.credentials.reset',
            'users.role.assign',
            'users.status.change',
            'admin.grant',
            'audit.read',
            'system.configure',
        ],

        // Tier 1. Everything the role held before 2026-09-10 EXCEPT granting
        // `admin` (GV-6), deciding LOAs (GV-3) and configuring the system.
        'admin' => [
            'users.view',
            'users.create',
            'users.update',
            'users.credentials.reset',
            'users.role.assign',
            'users.status.change',
            'staff.credential',
            'staff.schedule.publish',
            'patients.demographics.view',
            'patients.demographics.update',
            'archive.view',
            'archive.restore',
            'audit.read',
            'analytics.view',
            'services.manage',
        ],

        // Oversight, and nothing else. The empty spaces in this row are the
        // control; do not fill them in for convenience.
        'dpo' => [
            'audit.read',
            'access-log.read',
        ],

        'hr' => [
            'loa.decide',
            'analytics.view',
        ],

        // Clinical roles are gated by `role:` middleware and by PatientPolicy,
        // not by permissions — their authority is over records, not over the
        // system. Listed with empty sets rather than omitted so that the matrix
        // is complete and a reader can see the emptiness is deliberate.
        'doctor' => [],
        'nurse' => [],
        'user' => [],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        foreach (self::MATRIX as $roleName => $permissions) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($permissions);
        }

        // Registrar caches the whole matrix; without a second flush the
        // permissions just written are invisible to anything that runs later in
        // the same process — which includes every other seeder.
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info(sprintf(
            '✓ %d permissions across %d roles: %s',
            count(self::PERMISSIONS),
            count(self::MATRIX),
            implode(', ', array_keys(self::MATRIX)),
        ));
    }
}
