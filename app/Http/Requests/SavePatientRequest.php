<?php

namespace App\Http\Requests;

use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * A patient added or edited by their guarantor, from the booking gate or the
 * "My Patients" page.
 *
 * The ruleset deliberately mirrors AdminPatientController::update() so a record
 * a mother creates for her child validates exactly the way the same record would
 * if a clerk had typed it. Two differences, both intentional:
 *
 *  - `relationship_to_guarantor` is required here and absent there. Staff-created
 *    records have no guarantor to relate to.
 *  - `hmo_id` is accepted here, because the guarantor is the person who actually
 *    holds the member number. The admin surface still refuses it — see the note
 *    in AdminPatientController::update().
 *
 * The React sheet sends camelCase, like the booking form does.
 */
class SavePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $birthdate = $this->input('birthdate');

        $this->merge([
            'first_name' => $this->input('firstName', $this->input('first_name')),
            'last_name' => $this->input('lastName', $this->input('last_name')),
            'contact_number' => $this->input('contactNumber', $this->input('contact_number')),
            'civil_status' => $this->input('civilStatus', $this->input('civil_status')),
            'relationship_to_guarantor' => $this->input('relationship', $this->input('relationship_to_guarantor')),
            'relationship_note' => $this->input('relationshipNote', $this->input('relationship_note')),
            'default_coverage' => $this->input('defaultCoverage', $this->input('default_coverage')),
            'hmo_provider' => $this->input('hmoProvider', $this->input('hmo_provider')),
            'hmo_id' => $this->input('hmoId', $this->input('hmo_id')),
            // Age is never accepted from the client. It is birthdate arithmetic,
            // and two fields that can disagree is one field too many — the form
            // shows it read-only for the same reason.
            'age' => self::ageFrom($birthdate),
        ]);
    }

    /** @return int|null null when the date is absent or unparseable */
    private static function ageFrom(mixed $birthdate): ?int
    {
        if (! is_string($birthdate) || trim($birthdate) === '') {
            return null;
        }

        try {
            return Carbon::parse($birthdate)->age;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'last_name' => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'contact_number' => ['required', 'string', 'regex:/^(\+639|09)\d{9}$/'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'relationship_to_guarantor' => [
                'required',
                Rule::in(['self', 'spouse', 'child', 'parent', 'sibling', 'other']),
            ],
            // "Other" on its own tells the clinic nothing, so say what it is.
            'relationship_note' => [
                'nullable',
                'required_if:relationship_to_guarantor,other',
                'string',
                'max:60',
            ],

            // Birthdate is now the required field and age is derived from it —
            // see prepareForValidation(). `after` bounds it at 120 years so a
            // typo in the year cannot produce an absurd age.
            'birthdate' => [
                'required',
                'date',
                'before:today',
                'after:'.now()->subYears(120)->toDateString(),
            ],
            'age' => ['required', 'integer', 'min:0', 'max:120'],

            'address' => ['nullable', 'string', 'max:500'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed'])],
            'company' => ['nullable', 'string', 'max:255'],

            'default_coverage' => ['nullable', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            'hmo_provider' => ['nullable', 'required_if:default_coverage,hmo', 'string', 'max:100'],
            'hmo_id' => [
                'nullable',
                'required_if:default_coverage,hmo',
                'string',
                'min:6',
                'max:20',
                'regex:/^[A-Z0-9\-]+$/',
            ],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->assertCoverageFitsAge($validator);
                $this->assertOnlyOneSelf($validator);
            },
        ];
    }

    /**
     * A minor cannot hold their own HMO or PhilHealth membership, so the form
     * hides the coverage chooser for them entirely. This is the enforcement
     * behind that — a direct POST would otherwise store a coverage default the
     * counter cannot honour, and the booking flow would prefill from it.
     */
    private function assertCoverageFitsAge(Validator $validator): void
    {
        $age = $this->input('age');
        $coverage = $this->input('default_coverage');

        if ($age === null || $age > Patient::MINOR_MAX_AGE) {
            return;
        }

        if ($coverage !== null && $coverage !== '' && $coverage !== 'cash') {
            $validator->errors()->add(
                'default_coverage',
                'A patient aged '.Patient::MINOR_MAX_AGE.' or under is billed to their guarantor, so only cash can be set here.'
            );
        }
    }

    /**
     * One account holder, one "Myself" record.
     *
     * Patient::ensureSelfPatient() already creates or adopts it, so a second
     * would split the account holder's own history across two charts — the
     * exact failure the guarantor model exists to prevent.
     */
    private function assertOnlyOneSelf(Validator $validator): void
    {
        if ($this->input('relationship_to_guarantor') !== 'self') {
            return;
        }

        $editingId = $this->route('patient')?->id;

        $exists = Patient::where('guarantor_id', Auth::id())
            ->where('relationship_to_guarantor', 'self')
            ->when($editingId, fn ($q) => $q->whereKeyNot($editingId))
            ->exists();

        if ($exists) {
            $validator->errors()->add(
                'relationship_to_guarantor',
                'You already have a record for yourself. Edit that one instead of adding a second.'
            );
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Please enter a valid PH number (e.g. +639XXXXXXXXX or 09XXXXXXXXX).',
            'relationship_to_guarantor.required' => 'Please tell us how this patient is related to you.',
            'relationship_note.required_if' => 'Please say what the relationship is.',
            'birthdate.required' => 'Birthdate is required — the age is worked out from it.',
            'birthdate.before' => 'Birthdate must be in the past.',
            'birthdate.after' => 'Please check the birth year.',
            'age.required' => 'Birthdate is required — the age is worked out from it.',
            'hmo_provider.required_if' => 'Please select the HMO provider.',
            'hmo_id.required_if' => 'Please enter the HMO ID number.',
            'hmo_id.regex' => 'HMO ID may only contain uppercase letters, numbers, and hyphens.',
        ];
    }
}
