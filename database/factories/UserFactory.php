<?php

namespace Database\Factories;

use App\Http\Middleware\EnsureTwoFactorEnrolled;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // No 'name' column — this project keeps names on patient_profiles /
            // doctor_profiles, not users. Setting it here (a starter-kit
            // leftover) made every factory insert fail with "Unknown column".
            'email' => fake()->unique()->safeEmail(),
            'is_active' => true,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ];
    }

    /**
     * Every route in this app is gated on a Spatie role, so a role-less user
     * can reach nothing but 403s — not a useful fixture. Default to "user";
     * override with ->role('doctor') etc.
     *
     * Requires the roles table to be seeded; tests/Pest.php does that per test.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            if ($user->roles()->doesntExist()) {
                $user->assignRole('user');
            }
        });
    }

    /**
     * Attach a Spatie role — and, for staff roles, enrol the account in 2FA.
     *
     * X-01 made two-factor mandatory for doctor, nurse, hr and admin
     * (EnsureTwoFactorEnrolled, registered globally), so an un-enrolled staff
     * account is redirected to its security settings on every page. Without the
     * enrolment here, every test that signs in as staff asserts 200 and gets a
     * 302 — a failure that says nothing about the behaviour under test.
     *
     * It belongs in the factory rather than only in `userWithRole()` because
     * tests reach for both: `SettingsAccessTest` calls
     * `User::factory()->role('doctor')` directly, and a fix that only covered
     * the helper left those failing.
     *
     * This is also the honest default. Once the middleware ships, every staff
     * account in the clinic IS enrolled, so an enrolled account is what a
     * representative staff user looks like. Tests that need the un-enrolled
     * case build it explicitly — see StaffTwoFactorRequiredTest, the one place
     * the absence of enrolment is the subject rather than a nuisance.
     */
    public function role(string $role): static
    {
        return $this->afterCreating(function (User $user) use ($role) {
            $user->syncRoles([$role]);

            // Kept in step with EnsureTwoFactorEnrolled::PROTECTED_ROLES — a
            // staff role missing from that list here builds a user who is
            // bounced to the enrolment screen on their first request, and the
            // test fails somewhere unrelated to what it was asserting.
            if (in_array($role, EnsureTwoFactorEnrolled::PROTECTED_ROLES, true)) {
                $user->forceFill(['two_factor_confirmed_at' => now()])->save();
            }
        });
    }

    /** An account an admin has deactivated — cannot log in, cannot hold a session. */
    public function deactivated(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the model has two-factor authentication configured.
     */
    public function withTwoFactor(): static
    {
        return $this->state(fn (array $attributes) => [
            'two_factor_secret' => encrypt('secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);
    }
}
