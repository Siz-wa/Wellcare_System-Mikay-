<?php

namespace App\Http\Requests;

use App\Concerns\NormalizesPhoneNumbers;
use App\Concerns\ValidatesHmoProvider;
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
    use NormalizesPhoneNumbers, ValidatesHmoProvider;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $birthdate = $this->input('birthdate');

        $this->merge([
            'first_name' => self::tidyName($this->input('firstName', $this->input('first_name'))),
            'last_name' => self::tidyName($this->input('lastName', $this->input('last_name'))),
            'contact_number' => $this->normalizePhoneNumber(
                $this->input('contactNumber', $this->input('contact_number'))
            ),
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

    /**
     * Trim and collapse spaces, and fix a name typed entirely in one case
     * ("junior TESTER" → "Junior Tester"). Mixed case is left exactly as typed,
     * so "de la Cruz" and "McArthur" survive.
     */
    private static function tidyName(mixed $name): mixed
    {
        if (! is_string($name)) {
            return $name;
        }

        $name = trim((string) preg_replace('/\s+/u', ' ', $name));

        if ($name === mb_strtolower($name) || $name === mb_strtoupper($name)) {
            $name = mb_convert_case(mb_strtolower($name), MB_CASE_TITLE);
        }

        return $name;
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
            'contact_number' => $this->phoneRules(required: true),
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
            'civil_status' => ['nullable', Rule::in(Patient::CIVIL_STATUSES)],
            'company' => ['nullable', 'string', 'max:255'],

            'default_coverage' => ['nullable', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            'hmo_provider' => $this->hmoProviderRules('default_coverage'),
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
                $this->assertOnlyOneSelf($validator);
                $this->assertNotAlreadyListed($validator);
            },
        ];
    }

    /**
     * The same person twice is two medical charts for one body: allergies
     * recorded on one are invisible from the other. Matched on name (any case)
     * and birthdate within this guarantor's list, the same identity the
     * booking dedupe (Patient::findOrCreateFromBooking) relies on.
     */
    private function assertNotAlreadyListed(Validator $validator): void
    {
        $first = $this->input('first_name');
        $last = $this->input('last_name');
        $birthdate = $this->input('birthdate');

        if (! is_string($first) || ! is_string($last) || ! $birthdate) {
            return;
        }

        $current = $this->route('patient');

        $match = Patient::query()
            ->where('guarantor_id', Auth::id())
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower($first)])
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($last)])
            ->whereDate('birthdate', $birthdate)
            ->when($current instanceof Patient, fn ($q) => $q->whereKeyNot($current->getKey()))
            ->first();

        if ($match) {
            $validator->errors()->add(
                'first_name',
                "{$match->first_name} {$match->last_name}, born on this date, is already on your list. Edit that record instead of adding a second one."
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
            ...$this->phoneMessages(),
            'relationship_to_guarantor.required' => 'Please tell us how this patient is related to you.',
            'relationship_note.required_if' => 'Please say what the relationship is.',
            'birthdate.required' => 'Birthdate is required — the age is worked out from it.',
            'birthdate.before' => 'Birthdate must be in the past.',
            'birthdate.after' => 'Please check the birth year.',
            'age.required' => 'Birthdate is required — the age is worked out from it.',
            'hmo_provider.required_if' => 'Please select the HMO provider.',
            ...$this->hmoProviderMessages('hmo_provider'),
            'hmo_id.required_if' => 'Please enter the HMO ID number.',
            'hmo_id.regex' => 'HMO ID may only contain uppercase letters, numbers, and hyphens.',
        ];
    }
}
