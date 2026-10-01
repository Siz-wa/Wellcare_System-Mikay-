<?php

namespace App\Http\Requests\Admin;

use App\Concerns\NormalizesPhoneNumbers;
use App\Concerns\PasswordValidationRules;
use App\Enums\Specialty;
use App\Models\Patient;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Figure 4's "Add New User" flow.
 *
 * The React form sends camelCase; prepareForValidation() maps it to snake_case
 * before the rules run, the same convention BookAppointmentRequest uses.
 */
class StoreUserRequest extends FormRequest
{
    use NormalizesPhoneNumbers, PasswordValidationRules;

    /**
     * The roles that can be granted through the web.
     *
     * Deliberately NOT the same list as `RoleAndPermissionSeeder::MATRIX`.
     * `owner` exists as a role and is absent here on purpose (GV-6): the Tier 0
     * account is created only by `php artisan wellcare:owner:create`, because a
     * route that could mint the role that mints every other role would be the
     * thing the tier exists to prevent. Its absence here is the first of two
     * independent walls — `User::mayGrantRole()` is the second.
     *
     * `dpo` IS here, because the owner has to be able to appoint one. Whether
     * a given actor may actually grant any entry in this list is a separate
     * question, answered by tier: `dpo` and `admin` both sit at tier 2, so an
     * administrator can grant neither and an owner can grant both.
     *
     * @var array<int, string>
     */
    public const ROLES = ['admin', 'dpo', 'hr', 'doctor', 'nurse', 'user'];

    /**
     * The route is already behind `role:admin|owner` plus `permission:users.view`;
     * returning true here avoids duplicating that gate in a second place where
     * the two could drift. The per-target authority check is the tier rule in
     * StaffAccountService, not this method.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'first_name' => $this->input('firstName', $this->input('first_name')),
            'last_name' => $this->input('lastName', $this->input('last_name')),
            'contact_number' => $this->normalizePhoneNumber(
                $this->input('contactNumber', $this->input('contact_number'))
            ),
            'civil_status' => $this->input('civilStatus', $this->input('civil_status')),
            'password_confirmation' => $this->input(
                'passwordConfirmation',
                $this->input('password_confirmation')
            ),
            'display_name' => $this->input('displayName', $this->input('display_name')),
            'send_invite' => $this->boolean('sendInvite', $this->boolean('send_invite')),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            // G-11: with an invitation the new staff member sets their own
            // password from the emailed link, so none is typed here.
            'send_invite' => ['boolean'],
            'password' => $this->boolean('send_invite') ? ['nullable', 'prohibited'] : $this->passwordRules(),
            'role' => ['required', Rule::in(self::ROLES)],

            'contact_number' => $this->phoneRules(),
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'civil_status' => ['nullable', Rule::in(Patient::CIVIL_STATUSES)],

            // ── Doctor-only (Phase 9) ────────────────────────────────────────
            // A doctor account is incomplete without a doctor_profiles row, and
            // that row needs a display name and a specialty to be NOT NULL. The
            // specialty recorded here is provisional: it is what the doctor
            // claims, and CredentialingService::conferSpecialty() is what makes
            // it a conferred privilege once the board certificate is seen.
            'display_name' => ['nullable', 'string', 'max:150'],
            'specialty' => ['nullable', Rule::in(Specialty::values())],
            'specialization' => ['nullable', 'string', 'max:150'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
            'role.in' => 'Please choose one of the system roles.',
            'specialty.in' => 'Choose a specialty the clinic offers.',
            'birthdate.before' => 'Birthdate must be in the past.',
            ...$this->phoneMessages(),
        ];
    }
}
