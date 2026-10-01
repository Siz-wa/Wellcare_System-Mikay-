<?php

namespace App\Concerns;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    use NormalizesPhoneNumbers;

    /**
     * The identity fields every account has: the two names and the login email.
     *
     * Kept separate from the optional demographics below because registration
     * (App\Actions\Fortify\CreateNewUser) collects exactly this much and
     * nothing more — a person signing up must not be made to supply a civil
     * status before they can book.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'first_name' => $this->nameRules(),
            'last_name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Identity plus the optional patient_profiles demographics.
     *
     * Every one of these is nullable: the account already exists by the time
     * this form is reachable, and refusing to save a corrected surname because
     * the person has not filled in a company name would be absurd.
     *
     * The two enum columns are validated against the values the MySQL ENUM
     * actually declares — gender is `['M','F']` on patient_profiles, NOT the
     * `male/female/other` used by the separate `patients` table. Mixing those
     * two up writes a value MySQL rejects at the driver level. See the domain
     * note in CLAUDE.md about User vs Patient.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function extendedProfileRules(?int $userId = null): array
    {
        return array_merge($this->profileRules($userId), [
            // Same PH mobile shape SavePatientRequest enforces, so a number is
            // valid in the same way wherever it is typed. NormalizesPhoneNumbers
            // is now the single owner of that shape — see the note there.
            'contact_number' => $this->phoneRules(),
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'birthdate' => [
                'nullable',
                'date',
                'before:today',
                'after:'.now()->subYears(120)->toDateString(),
            ],
            'civil_status' => ['nullable', Rule::in(Patient::CIVIL_STATUSES)],
        ]);
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * There is no `users.name` column — names live on patient_profiles as
     * first_name/last_name. Bounds match CreateNewUser so registration and
     * profile editing agree.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'min:2', 'max:100'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
