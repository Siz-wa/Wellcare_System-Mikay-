<?php

namespace App\Http\Requests\Admin;

use App\Concerns\NormalizesPhoneNumbers;
use App\Models\Patient;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Figure 4's "Manage User Acc" flow.
 *
 * Differs from StoreUserRequest in two ways: the unique-email rule ignores the
 * row being edited, and **there is no password field at all**.
 *
 * ## Why no password (GV-1 in WELLCARE-GOVERNANCE-PLAN.md)
 *
 * Until 2026-09-10 this request accepted an optional `password` for any target
 * user, with no restriction on that user's role. An administrator could reset a
 * doctor's password, sign in as them and read every chart in the clinic — and
 * because `User::activityLogAttributes()` audits only `email` and `is_active`,
 * the credential change left no record and the reads that followed were
 * attributed to the doctor.
 *
 * Restoring access to somebody else's account is now
 * `POST /admin/users/{user}/reset-password`, which mails a signed expiring link
 * to the address on the account. The administrator triggers recovery; only the
 * account holder ever holds the credential.
 *
 * **Do not add a password rule back to this request.** If a future flow needs
 * one, it needs a separate route with its own authorization, not a field on the
 * profile-editing form.
 */
class UpdateUserRequest extends FormRequest
{
    use NormalizesPhoneNumbers;

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
            'contact_number' => $this->phoneRules(),
            'address' => ['nullable', 'string', 'max:500'],
            'company' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'civil_status' => ['nullable', Rule::in(Patient::CIVIL_STATUSES)],
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
            ...$this->phoneMessages(),
        ];
    }
}
