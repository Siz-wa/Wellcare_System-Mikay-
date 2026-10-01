<?php

namespace App\Http\Requests\Settings;

use App\Models\DoctorProfile;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * What a doctor may change about their own published entry.
 *
 * The list is short, and everything missing from it is missing deliberately.
 * `display_name`, `specialty`, `specialization` and `is_active` are conferred
 * by an administrator through CredentialingService — a specialty is not
 * self-declared, and publication follows a verified credential — so they are
 * absent from these rules and from the controller that consumes them. A doctor
 * who could type their own specialty would defeat the whole credentialing
 * module.
 *
 * The remaining fields are the person rather than the privilege: a practice
 * statement, the languages they consult in, the year they started, and whether
 * their photograph may be shown.
 */
class ProfessionalProfileUpdateRequest extends FormRequest
{
    /**
     * Empty strings become nulls before the rules run, for the same reason
     * ProfileUpdateRequest does it: a cleared field posts '', and `nullable`
     * does not treat '' as absent, so clearing a box would fail `integer` or
     * store an empty string in a column that means "not set" by being null.
     */
    protected function prepareForValidation(): void
    {
        foreach (['bio', 'languages', 'practising_since'] as $optional) {
            $this->merge([$optional => $this->input($optional) ?: null]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Capped short on purpose. The PRC Board of Medicine / PMA Code of
            // Ethics does not permit a physician to publish claims of personal
            // superiority, certificates, diplomas or postgraduate training, so
            // this box is a factual statement of practice — not the open-ended
            // marketing biography a longer limit would invite.
            'bio' => ['nullable', 'string', 'max:'.DoctorProfile::BIO_MAX_LENGTH],
            'languages' => ['nullable', 'string', 'max:120'],
            // A year, bounded at both ends: nobody practising today qualified
            // before 1950, and a year in the future is a typo.
            'practising_since' => ['nullable', 'integer', 'min:1950', 'max:'.date('Y')],
            // RA 10173. Publishing a likeness is the doctor's decision, and
            // this box is where they make or withdraw it.
            'publish_photo' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bio.max' => 'Keep your practice statement to '.DoctorProfile::BIO_MAX_LENGTH.' characters or fewer.',
            'practising_since.min' => 'Please check the year you began practising.',
            'practising_since.max' => 'The year you began practising cannot be in the future.',
        ];
    }
}
