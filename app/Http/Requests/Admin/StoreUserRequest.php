<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
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
    use PasswordValidationRules;

    /** Mirrors RoleAndPermissionSeeder. */
    public const ROLES = ['admin', 'hr', 'doctor', 'nurse', 'user'];

    /**
     * The route is already behind `role:admin`; returning true here avoids
     * duplicating that gate in a second place where the two could drift.
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
            'contact_number' => $this->input('contactNumber', $this->input('contact_number')),
            'civil_status' => $this->input('civilStatus', $this->input('civil_status')),
            'password_confirmation' => $this->input(
                'passwordConfirmation',
                $this->input('password_confirmation')
            ),
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
            'password' => $this->passwordRules(),
            'role' => ['required', Rule::in(self::ROLES)],

            'contact_number' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed'])],
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
            'birthdate.before' => 'Birthdate must be in the past.',
        ];
    }
}
