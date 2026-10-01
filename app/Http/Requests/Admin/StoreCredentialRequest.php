<?php

namespace App\Http\Requests\Admin;

use App\Enums\BoardStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The credentialing file an administrator records against a clinical account.
 *
 * Every field is `nullable` on purpose. Credentialing is a process, not a
 * single form submission: an administrator types in the PRC number the day the
 * doctor is hired and the PTR weeks later when it is produced. The rules that
 * actually gate practice are enforced at *verification* time in
 * CredentialingService::verify(), not here — validating them here would block
 * an administrator from saving a partial file, which is the normal case.
 *
 * The React form sends camelCase; prepareForValidation() maps it to snake_case,
 * the same convention StoreUserRequest and BookAppointmentRequest use.
 */
class StoreCredentialRequest extends FormRequest
{
    /** The route is already behind `role:admin`. */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'prc_license_no' => $this->input('prcLicenseNo', $this->input('prc_license_no')),
            'prc_expires_on' => $this->input('prcExpiresOn', $this->input('prc_expires_on')),
            'ptr_no' => $this->input('ptrNo', $this->input('ptr_no')),
            'ptr_issued_at_lgu' => $this->input('ptrIssuedAtLgu', $this->input('ptr_issued_at_lgu')),
            'ptr_expires_on' => $this->input('ptrExpiresOn', $this->input('ptr_expires_on')),
            'philhealth_accreditation_no' => $this->input(
                'philhealthAccreditationNo',
                $this->input('philhealth_accreditation_no')
            ),
            's2_license_no' => $this->input('s2LicenseNo', $this->input('s2_license_no')),
            'specialty_board' => $this->input('specialtyBoard', $this->input('specialty_board')),
            'board_status' => $this->input('boardStatus', $this->input('board_status')),
            'medical_certificate_on' => $this->input(
                'medicalCertificateOn',
                $this->input('medical_certificate_on')
            ),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // A PRC registration number is seven digits. `string|max:40`
            // accepted a name, and this number is what the clinic files
            // claims against — a wrong one is found at the claim, not here.
            'prc_license_no' => ['nullable', 'string', 'digits:7'],
            'prc_expires_on' => ['nullable', 'date'],

            'ptr_no' => ['nullable', 'string', 'max:40'],
            'ptr_issued_at_lgu' => ['nullable', 'string', 'max:120'],
            'ptr_expires_on' => ['nullable', 'date'],

            'philhealth_accreditation_no' => ['nullable', 'string', 'max:40'],
            's2_license_no' => ['nullable', 'string', 'max:40'],

            // A rank without a named board is an incomplete record, so the
            // board becomes required as soon as a rank is claimed.
            'board_status' => ['nullable', Rule::in(BoardStatus::values())],
            'specialty_board' => [
                'nullable',
                'string',
                'max:150',
                Rule::requiredIf(fn () => in_array(
                    $this->input('board_status'),
                    [BoardStatus::Diplomate->value, BoardStatus::Fellow->value],
                    true,
                )),
            ],

            'medical_certificate_on' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'prc_license_no.digits' => 'A PRC registration number is seven digits.',
            'specialty_board.required' => 'Name the specialty board that issued the '
                .'Diplomate or Fellow certificate.',
            'prc_expires_on.date' => 'Enter the PRC expiry date as shown on the licence.',
            'ptr_expires_on.date' => 'Enter the PTR expiry date.',
        ];
    }
}
