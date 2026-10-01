<?php

namespace App\Http\Requests\Admin;

use App\Enums\Specialty;
use App\Models\Appointment;
use App\Models\Service;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creating or editing one bookable service.
 *
 * ## The slug rule is the interesting one
 *
 * `appointments.service` stores this slug as a varchar on every historical row
 * and there is no foreign key, so renaming a slug does not rewrite those rows —
 * it strands them. Every past appointment for `cardiology` would keep saying
 * `cardiology` while the catalogue no longer contains it, and each one would
 * render as its raw slug on the doctor's list and drop out of every report that
 * groups by service.
 *
 * So the slug is immutable once ANY appointment references it. Before that it
 * is free to change, which is what makes a typo at creation time fixable. The
 * check is in after() rather than a rule because it needs the current row.
 *
 * Renaming the patient-facing NAME is always allowed and is the thing an
 * administrator actually wants: the slug is an internal key nobody reads.
 */
class SaveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('services.manage') ?? false;
    }

    /** The service being edited, or null when creating. */
    private function service(): ?Service
    {
        $service = $this->route('service');

        return $service instanceof Service ? $service : null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:100'],

            // Lowercase, hyphen-separated, no leading or trailing hyphen. The
            // shape of every slug already in `appointments.service`, and the
            // shape the public services page builds `?service=` links from.
            'slug' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/',
                Rule::unique('services', 'slug')->ignore($this->service()),
            ],

            'description' => ['required', 'string', 'min:10', 'max:500'],

            // Null (the key absent, or an empty array) means "any rostered
            // doctor". The controller collapses [] to null so the two cannot
            // drift apart in storage.
            'specialties' => ['nullable', 'array'],
            'specialties.*' => [Rule::in(array_column(Specialty::cases(), 'value'))],

            'requires_in_person' => ['required', 'boolean'],

            /*
             * What the clinic charges for this service over video.
             *
             * Nullable, and null is not zero. Null means "not priced for
             * video", which is the right state for anything
             * `requires_in_person` and the state PaymentVerificationService
             * reads as "fall back to payments.default_fee". A literal 0 would
             * mean the clinic has decided this consultation is free, and would
             * settle the record the moment it was raised.
             *
             * Floor of 1 rather than 0 for exactly that reason: making a
             * service free is a waiver decision per patient, recorded with a
             * reason, not a price list entry.
             */
            'virtual_fee' => ['nullable', 'numeric', 'min:1', 'max:999999.99'],

            // Only 'female' today. Kept as a nullable string rather than a
            // boolean so the other value is expressible without a migration.
            'restricted_to_sex' => ['nullable', Rule::in(['female', 'male'])],

            // 0 is meaningful — a service for newborns only — so the floor is 0
            // and "no limit" is null, not 0.
            'max_age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'min_age' => [
                'nullable', 'integer', 'min:0', 'max:120',
                // Only compared when both limits are set.
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $max = $this->input('max_age');

                    if ($value !== null && $value !== '' && $max !== null && $max !== '' && (int) $value > (int) $max) {
                        $fail('The minimum age cannot be above the maximum age.');
                    }
                },
            ],

            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'The slug may only contain lowercase letters, numbers and single hyphens (for example: physical-therapy).',
            'slug.unique' => 'Another service already uses that slug.',
            'description.min' => 'Write at least a short sentence — this is what the patient reads under the option.',
            'specialties.*.in' => 'That is not one of the clinic’s specialties.',
            'virtual_fee.min' => 'Leave the video fee blank if this service is not offered over video. A free consultation is waived per patient, not priced at zero.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $service = $this->service();

                if (! $service || $this->input('slug') === $service->slug) {
                    return;
                }

                // See the class note: renaming a slug strands the appointments
                // that carry it.
                $booked = Appointment::where('service', $service->slug)->count();

                if ($booked > 0) {
                    $validator->errors()->add('slug', sprintf(
                        'This slug cannot be changed: %d appointment%s already recorded against it, and renaming it would '
                        .'detach %s from the catalogue. Edit the name instead — that is what patients see.',
                        $booked,
                        $booked === 1 ? ' is' : 's are',
                        $booked === 1 ? 'it' : 'them',
                    ));
                }
            },
        ];
    }
}
