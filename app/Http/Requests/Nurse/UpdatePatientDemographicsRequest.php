<?php

namespace App\Http\Requests\Nurse;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Figure 10's "encode patient data", scoped to demographics.
 *
 * The allow-list is the security boundary, not a convenience: `Patient`'s
 * `$fillable` includes `default_coverage`, `hmo_provider` and `hmo_id`, so a
 * bare `$patient->update($request->all())` would let a nurse rewrite a
 * patient's insurance identity from this form. `hmo_id` in particular is the
 * data `LoaAccessTest` already treats as never crossing between families.
 *
 * Coverage fields stay with HR, who own the LOA decision (Fig. 8).
 */
class UpdatePatientDemographicsRequest extends FormRequest
{
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
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'contact_number' => ['required', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            // `patients.gender` is enum('male','female','other') — NOT the
            // 'M'/'F' pair used on the user profile tables. Getting this wrong
            // does not fail loudly: validation passes and MySQL truncates the
            // value to '' on write.
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed'])],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'Please enter the patient\'s first name.',
            'last_name.required' => 'Please enter the patient\'s last name.',
            'contact_number.required' => 'A contact number is required — it is part of how patient records are matched.',
            'birthdate.before' => 'Birthdate must be in the past.',
        ];
    }
}
