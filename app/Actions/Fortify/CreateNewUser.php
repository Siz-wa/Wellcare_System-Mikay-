<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use App\Concerns\PasswordValidationRules;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function create(array $input): User
    {
        Validator::make($input, [
            // ── Account ───────────────────────────────────────────────────
            'first_name'       => ['required', 'string', 'min:2', 'max:100'],
            'last_name'        => ['required', 'string', 'min:2', 'max:100'],
            'email'            => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'         => $this->passwordRules(),

            // ── Personal ──────────────────────────────────────────────────
            'address'          => ['nullable', 'string', 'max:500'],
            'company'          => ['nullable', 'string', 'max:255'],
            'contact_number'   => ['nullable', 'string', 'max:20'],
            'gender'           => ['nullable', Rule::in(['M', 'F'])],
            'birthdate'        => ['nullable', 'date', 'before:today'],
            'civil_status'     => ['nullable', Rule::in(['single', 'married', 'widowed'])],

            // ── Medical ───────────────────────────────────────────────────
            'height'           => ['nullable', 'numeric', 'min:50', 'max:250'],
            'weight'           => ['nullable', 'numeric', 'min:1', 'max:300'],
            'blood_pressure'   => ['nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            'hmo'              => ['nullable', 'string', 'max:255'],
            'classification'   => ['nullable', Rule::in(['new', 'old'])],
            // payment_method and preferred_doctor collected post-registration
        ], [
            'first_name.required'  => 'First name is required.',
            'first_name.min'       => 'First name must be at least 2 characters.',
            'last_name.required'   => 'Last name is required.',
            'last_name.min'        => 'Last name must be at least 2 characters.',
            'email.unique'         => 'An account with this email already exists.',
            'birthdate.before'     => 'Birthdate must be in the past.',
            'blood_pressure.regex' => 'Blood pressure must be in format 120/80.',
        ])->validate();

        return DB::transaction(function () use ($input): User {

            // 1. Create the auth record
            $user = User::create([
                'email'    => $input['email'],
                'password' => Hash::make($input['password']),
            ]);

            // 2. Create the personal profile
            //    client_number is auto-generated in PatientProfile::booted()
            $profile = $user->profile()->create([
                'first_name'     => $input['first_name'],
                'last_name'      => $input['last_name'],
                'address'        => $input['address']        ?? null,
                'company'        => $input['company']        ?? null,
                'contact_number' => $input['contact_number'] ?? null,
                'gender'         => $input['gender']         ?? null,
                'birthdate'      => $input['birthdate']      ?? null,
                'civil_status'   => $input['civil_status']   ?? null,
                'classification' => $input['classification'] ?? 'new',
            ]);

            // 3. Create the medical record
            //    payment_method and preferred_doctor left null — collected post-registration
            $profile->medical()->create([
                'height'         => $input['height']         ?? null,
                'weight'         => $input['weight']         ?? null,
                'blood_pressure' => $input['blood_pressure'] ?? null,
                'hmo'            => $input['hmo']            ?? null,
            ]);

            return $user;
        });
    }
}