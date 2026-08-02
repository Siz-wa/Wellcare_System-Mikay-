<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Figure 4's "Manage User Acc" flow.
 *
 * Differs from StoreUserRequest in two ways: the unique-email rule ignores the
 * row being edited, and the password is optional — blank means "leave the
 * existing one alone", which StaffAccountService::update() honours.
 */
class UpdateUserRequest extends FormRequest
{
    use PasswordValidationRules;

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
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')?->id),
            ],
            // The shared rules minus 'required': an untouched password field
            // must not fail validation, but a filled one still has to satisfy
            // the same strength and confirmation rules as registration.
            'password' => array_merge(
                ['nullable'],
                array_values(array_filter(
                    $this->passwordRules(),
                    fn ($rule) => $rule !== 'required',
                )),
            ),

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
            'birthdate.before' => 'Birthdate must be in the past.',
        ];
    }
}
