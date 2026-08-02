<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use App\Services\StaffAccountService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(private StaffAccountService $accounts) {}

    public function create(array $input): User
    {
        Validator::make($input, [
            // ── Account ───────────────────────────────────────────────────
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => $this->passwordRules(),

            // ── Personal ──────────────────────────────────────────────────
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed'])],

            // ── Medical ───────────────────────────────────────────────────
            'height' => ['nullable', 'numeric', 'min:50', 'max:250'],
            'weight' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'blood_pressure' => ['nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            'hmo' => ['nullable', 'string', 'max:255'],
            'classification' => ['nullable', Rule::in(['new', 'old'])],
            // payment_method and preferred_doctor collected post-registration
        ], [
            'first_name.required' => 'First name is required.',
            'first_name.min' => 'First name must be at least 2 characters.',
            'last_name.required' => 'Last name is required.',
            'last_name.min' => 'Last name must be at least 2 characters.',
            'email.unique' => 'An account with this email already exists.',
            'birthdate.before' => 'Birthdate must be in the past.',
            'blood_pressure.regex' => 'Blood pressure must be in format 120/80.',
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
        return $this->accounts->create(
            $input + ['classification' => $input['classification'] ?? 'new'],
            'user',
            verified: false,
        );
    }
}
