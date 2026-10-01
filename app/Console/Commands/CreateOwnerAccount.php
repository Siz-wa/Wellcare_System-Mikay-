<?php

namespace App\Console\Commands;

use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Create the Tier 0 System Owner — GV-6 in WELLCARE-GOVERNANCE-PLAN.md.
 *
 * ## Why this is a console command and not a screen
 *
 * The owner is the account that appoints administrators. If it could be created
 * through the web, then whoever could reach that route could mint the role that
 * mints every other role, and the tier would add a rank without adding a
 * control. Requiring shell access to the server is the point: it moves the
 * bootstrap out of the application's own trust boundary and into the
 * deployment's.
 *
 * ## What this replaces
 *
 * `StaffAccountService::guardLastActiveAdmin()` refuses to remove the last
 * active administrator, with the comment "there is no console recovery UI and
 * no second admin by default, so removing the last active admin bricks the
 * module permanently". That guard was a workaround for the absence of this
 * command. The guard stays — it is still the right refusal for an admin acting
 * over the web — but there is now a way back in that does not depend on it.
 *
 * ## Usage
 *
 *   php artisan wellcare:owner:create
 *   php artisan wellcare:owner:create --email=owner@wellcare.com --name="Ana Reyes"
 *
 * The password is always prompted for, never accepted as an argument: an
 * argument lands in the shell history and in the process list.
 */
class CreateOwnerAccount extends Command
{
    protected $signature = 'wellcare:owner:create
                            {--email= : The owner\'s email address}
                            {--name= : Full name, e.g. "Ana Reyes"}';

    protected $description = 'Create a Tier 0 System Owner account (appoints administrators; holds no patient access)';

    public function handle(): int
    {
        $email = $this->option('email') ?: text(
            label: 'Owner email address',
            required: true,
        );

        if (User::where('email', $email)->exists()) {
            $this->error("An account already exists for {$email}.");
            $this->line('Promote it instead, or choose a different address.');

            return self::FAILURE;
        }

        $name = $this->option('name') ?: text(
            label: 'Full name',
            placeholder: 'Ana Reyes',
            required: true,
        );

        // Prompted, never an option: a password passed as an argument is a
        // password in `~/.bash_history` and in `ps`.
        $plain = password(label: 'Password', required: true);
        $confirm = password(label: 'Confirm password', required: true);

        if ($plain !== $confirm) {
            $this->error('The passwords did not match.');

            return self::FAILURE;
        }

        // The production password policy, applied regardless of APP_ENV. This
        // account outranks every administrator; there is no environment in
        // which a weak one is acceptable.
        $validator = Validator::make(
            ['email' => $email, 'password' => $plain],
            [
                'email' => ['required', 'email', 'max:255'],
                'password' => [
                    'required',
                    Password::min(12)->mixedCase()->letters()->numbers()->symbols()->uncompromised(),
                ],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        [$first, $last] = $this->splitName($name);

        $user = User::create([
            'email' => $email,
            'password' => Hash::make($plain),
            'is_active' => true,
        ]);

        $user->syncRoles(['owner']);

        // Same reason AdminSeeder does it: User::getNameAttribute() reads
        // patient_profiles, and an account without one renders a blank name in
        // the topbar on every authenticated page.
        PatientProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['first_name' => $first, 'last_name' => $last, 'classification' => 'old'],
        );

        // The owner reaches no route that is not behind `verified`, and there
        // is nobody to click a confirmation link on their behalf.
        $user->markEmailAsVerified();

        $this->newLine();
        $this->info("✓ System Owner created: {$email}");
        $this->newLine();
        $this->warn('Two-factor authentication is mandatory for this account.');
        $this->line('On first sign-in you will be redirected to Settings → Security');
        $this->line('and held there until enrolment is complete.');
        $this->newLine();
        $this->line('This account can appoint administrators and configure the system.');
        $this->line('It holds NO access to patient records of any kind.');

        return self::SUCCESS;
    }

    /**
     * "Ana Reyes" → ['Ana', 'Reyes']; "Ana" → ['Ana', ''].
     *
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $first = array_shift($parts) ?? '';

        return [$first, implode(' ', $parts)];
    }
}
