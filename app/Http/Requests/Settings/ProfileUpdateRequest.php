<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Normalise every optional field to null before the rules run.
     *
     * A cleared <input type="date"> posts '', and '' is not null — so
     * `nullable|date` would run `date` against the empty string and reject a
     * save whose only crime was leaving a field blank. Collapsing '' and
     * "absent" to null here means the controller can write
     * `$validated['birthdate']` straight to a nullable column and get the
     * correct "no value" for both.
     */
    protected function prepareForValidation(): void
    {
        foreach (['contact_number', 'address', 'company', 'gender', 'birthdate', 'civil_status'] as $optional) {
            $this->merge([$optional => $this->input($optional) ?: null]);
        }

        // Reshape whatever the user typed or pasted into the one stored form
        // before the rule sees it, so `+63 917 123 4567` saves instead of
        // erroring. Null stays null — the field is optional here.
        $this->merge([
            'contact_number' => $this->normalizePhoneNumber($this->input('contact_number')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->extendedProfileRules($this->user()->id);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->phoneMessages(),
            'birthdate.before' => 'Birthdate must be in the past.',
            'birthdate.after' => 'Please check the birth year.',
        ];
    }
}
