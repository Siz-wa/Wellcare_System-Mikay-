<?php

namespace App\Actions\Fortify;

use App\Concerns\NormalizesPhoneNumbers;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ValidatesHmoProvider;
use App\Models\Consent;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\User;
use App\Services\ConsentService;
use App\Services\StaffAccountService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use NormalizesPhoneNumbers, PasswordValidationRules, ValidatesHmoProvider;

    public function __construct(
        private StaffAccountService $accounts,
        private ConsentService $consents,
    ) {}

    public function create(array $input): User
    {
        // A number pasted out of a phone's contacts arrives as
        // `+63 917 123 4567`. Reshape it before the rule runs rather than
        // bouncing the user back through a three-step wizard over spaces.
        $input['contact_number'] = $this->normalizePhoneNumber($input['contact_number'] ?? null);

        Validator::make($input, [
            // ── Account ───────────────────────────────────────────────────
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => $this->passwordRules(),

            // ── Personal ──────────────────────────────────────────────────
            // contact_number, gender and birthdate are required, not optional.
            // The registration form has always marked all three with an
            // asterisk, but the rules let them through empty — and a profile
            // missing any of them cannot be promoted into the account holder's
            // own Patient record (patients.contact_number is NOT NULL, and the
            // booking flow needs a birthdate and a sex). That left new accounts
            // with no "Myself" patient and nothing in the booking gate.
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'contact_number' => $this->phoneRules(required: true),
            'gender' => ['required', Rule::in(['M', 'F'])],
            'birthdate' => [
                'required',
                'date',
                'before:today',
                'after:'.now()->subYears(120)->toDateString(),
            ],
            'civil_status' => ['nullable', Rule::in(Patient::CIVIL_STATUSES)],

            // ── Medical ───────────────────────────────────────────────────
            'height' => ['nullable', 'numeric', 'min:50', 'max:250'],
            'weight' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'blood_pressure' => ['nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            // G-9: both optional. Allergies are self-reported, comma-separated,
            // and land on the chart marked as such for a clinician to confirm.
            'blood_type' => ['nullable', Rule::in(Patient::BLOOD_TYPES)],
            'known_allergies' => ['nullable', 'string', 'max:500'],
            // Optional at sign-up — but "Other" with nothing typed after
            // it is not one of the answers. See ValidatesHmoProvider.
            'hmo' => ['nullable', 'string', 'max:100', Rule::notIn(['other'])],
            'classification' => ['nullable', Rule::in(['new', 'old'])],
            // payment_method and preferred_doctor collected post-registration

            // ── Consent ───────────────────────────────────────────────────
            // SC-4 / C-1. Each purpose is its own field, validated separately,
            // never one "I agree to the terms" tick covering both.
            //
            // `accepted` rather than `boolean`: it rejects false as well as
            // absent, so an unticked box cannot pass as "answered".
            'consent_data_processing' => ['accepted'],
            'consent_treatment' => ['accepted'],
        ], [
            'first_name.required' => 'First name is required.',
            'first_name.min' => 'First name must be at least 2 characters.',
            'last_name.required' => 'Last name is required.',
            'last_name.min' => 'Last name must be at least 2 characters.',
            'email.unique' => 'An account with this email already exists.',
            'contact_number.required' => 'Contact number is required.',
            ...$this->phoneMessages(),
            'gender.required' => 'Please select your biological sex.',
            'birthdate.required' => 'Birthdate is required.',
            'birthdate.before' => 'Birthdate must be in the past.',
            'birthdate.after' => 'Please check the birth year.',
            'blood_pressure.regex' => 'Blood pressure must be in format 120/80.',
            ...$this->hmoProviderMessages('hmo'),
            'consent_data_processing.accepted' => 'We cannot create an account without your agreement to how your health information is handled.',
            'consent_treatment.accepted' => 'Please confirm your consent to examination and treatment.',
        ])->validate();

        // Account assembly (users + patient_profiles + patient_medical, in one
        // transaction) is shared with the admin module via StaffAccountService,
        // so the two creation paths cannot drift apart — an account is
        // identical in shape whichever way it was made.
        //
        // Two things stay specific to public registration: the role is always
        // `user`, and verified: false leaves Fortify to send the verification
        // mail. An admin creating a staff account vouches for the address, so
        // that path skips it.
        $user = $this->accounts->create(
            $input + ['classification' => $input['classification'] ?? 'new'],
            'user',
            verified: false,
        );

        // Recorded AFTER the account exists, because a consent row is keyed to
        // the account that gave it. StaffAccountService::create() is itself
        // transactional; if it throws, nothing here runs and no orphaned
        // consent is left behind pointing at a user that was never made.
        $this->consents->grant(Consent::DATA_PROCESSING, $user);
        $this->consents->grant(Consent::TREATMENT, $user);

        $this->recordSelfReportedHistory($user, $input);

        return $user;
    }

    /**
     * Blood type and allergies the patient gave at sign-up, written to their
     * own Patient record. Allergies are flagged as self-reported so the doctor
     * knows to confirm them rather than treat them as clinically verified.
     *
     * @param  array<string, mixed>  $input
     */
    private function recordSelfReportedHistory(User $user, array $input): void
    {
        $patient = Patient::ensureSelfPatient($user);

        if ($patient === null) {
            return;
        }

        if (! empty($input['blood_type'])) {
            $patient->update(['blood_type' => $input['blood_type']]);
        }

        $allergens = collect(explode(',', (string) ($input['known_allergies'] ?? '')))
            ->map(fn (string $allergen) => trim($allergen))
            ->filter(fn (string $allergen) => $allergen !== '' && ! in_array(strtolower($allergen), ['none', 'n/a', 'na'], true))
            ->unique(fn (string $allergen) => strtolower($allergen))
            ->take(10);

        foreach ($allergens as $allergen) {
            PatientAllergy::create([
                'patient_id' => $patient->id,
                'user_id' => $user->id,
                'recorded_by' => $user->id,
                'allergen' => mb_substr($allergen, 0, 255),
                'severity' => 'moderate',
                'notes' => 'Self-reported at registration. Confirm with the patient.',
            ]);
        }
    }
}
