<?php

namespace App\Http\Requests;

use App\Concerns\ValidatesHmoProvider;
use App\Models\Consent;
use App\Models\Patient;
use App\Models\Service;
use App\Services\BookingService;
use App\Services\ConsentService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * BookAppointmentRequest
 * ──────────────────────────────────────────────────────────────────────────────
 * The React form sends camelCase keys (patientId, appointmentDate, etc.).
 * prepareForValidation() maps them to snake_case before the rules run,
 * so validation and the controller both work with consistent snake_case keys.
 *
 * The form no longer sends the patient's name, email, contact, age or sex. The
 * guarantor picks *who the appointment is for* before the wizard starts, and
 * BookingService copies those fields off the Patient record. Anything the client
 * sends under those names is ignored — which is also why the eligibility checks
 * in after() read the record instead of the request.
 */
class BookAppointmentRequest extends FormRequest
{
    use ValidatesHmoProvider;

    /**
     * Retained only because App\Models\Patient's own minor threshold cites it
     * as the matching number. The Pediatrics age limit itself is no longer read
     * from here — it is `services.max_age`, which an administrator sets, and
     * the check below applies whatever the row says rather than this constant.
     */
    public const PEDIATRICS_MAX_AGE = 18;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Map camelCase keys from the React form to snake_case before validation.
     * This runs automatically before rules() is called.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'patient_id' => $this->input('patientId', $this->input('patient_id')),
            'appointment_date' => $this->input('appointmentDate', $this->input('appointment_date')),
            'appointment_time' => $this->input('appointmentTime', $this->input('appointment_time')),
            'consultation_type' => $this->input('consultationType', $this->input('consultation_type')),
            'hmo_id' => $this->input('hmoId', $this->input('hmo_id')),
            'doctor_id' => $this->input('doctorId', $this->input('doctor_id')),
            'additional_info' => $this->input('additionalInfo', $this->input('additional_info')),
            // The wizard's tick-box. Without this line the camelCase key the
            // form sends never reached the `consent_telemedicine` rule, so
            // every virtual booking made through the UI was rejected for a
            // consent the patient had actually given.
            'consent_telemedicine' => $this->input('consentTelemedicine', $this->input('consent_telemedicine')),
        ]);

        /*
         * An HMO card belongs to an HMO booking and to nothing else.
         *
         * The wizard pre-fills the coverage step from the patient's last visit,
         * so someone who booked on Maxicare in September and then books a
         * self-paid video consultation still has `hmo` and `hmo_id` sitting in
         * the form state. Switching the coverage tile to Self-Pay does not clear
         * them, the rules only say `required_if:coverage,hmo`, and the pair was
         * written to the appointment as-is. The result was a row that said
         * `coverage = cash` and `hmo = maxicare` at the same time — which the
         * review screen then showed the patient as "MODE OF COVERAGE Self-Pay"
         * directly above "HMO PROVIDER Maxicare", and which every report that
         * groups by provider counted as Maxicare business.
         *
         * Cleared here rather than in the component, because the wrong pairing
         * must be impossible for any client, including a direct POST.
         */
        if ($this->input('coverage') !== 'hmo') {
            // Both spellings. AppointmentController::store() reads
            // `$request->input('hmoId', $request->input('hmo_id'))`, so clearing
            // only the snake_case key leaves the camelCase one the wizard
            // actually sends still holding the card number.
            $this->merge([
                'hmo' => null,
                'hmo_id' => null,
                'hmoId' => null,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            // ── Who the appointment is for ──────────────────────────────────
            // Scoped to the signed-in guarantor, so a forged id cannot book
            // against — or read the details of — someone else's record.
            'patient_id' => [
                'required',
                'integer',
                Rule::exists('patients', 'id')
                    ->where('guarantor_id', Auth::id())
                    ->whereNull('deleted_at'),
            ],

            // ── Step 1: Appointment ─────────────────────────────────────────
            // Against the live catalogue, not a hardcoded list: a service the
            // clinic retired must stop being bookable the moment it is
            // switched off, including by a direct POST that never saw the form.
            'service' => ['required', Rule::in(Service::bookableSlugs())],
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after:today',
                'before:'.now()->addMonths(BookingService::MAX_LEAD_MONTHS)->toDateString(),
            ],
            // Must match the format BookingService generates and parses
            // ("8:00 AM"). Without this, to24h() throws an uncaught
            // InvalidFormatException on anything unparseable.
            'appointment_time' => ['required', 'string', 'date_format:g:i A'],
            // Nullable, not required: the column defaults to in_person, and
            // making it required would reject every request from a client that
            // predates this field for no clinical reason.
            'consultation_type' => ['nullable', Rule::in(['in_person', 'virtual'])],
            // SC-4 / C-5. DOH AO 2020-0030 expects a video consultation to be
            // consented to specifically, and it is a materially different
            // thing from an in-person visit — no physical examination, and a
            // dependence on the patient's own device and connection. Only
            // required when the booking is actually virtual; see after().
            'consent_telemedicine' => ['nullable', 'boolean'],

            // ── Step 2: Coverage ────────────────────────────────────────────
            'coverage' => ['required', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            'hmo' => $this->hmoProviderRules('coverage'),
            'hmo_id' => [
                'nullable',
                'required_if:coverage,hmo',
                'string',
                'min:6',
                'max:20',
                'regex:/^[A-Z0-9\-]+$/',
            ],

            // ── doctor_id — nullable = next available ────────────────────────
            'doctor_id' => [
                'nullable',
                'integer',
                Rule::exists('doctor_profiles', 'user_id')->where('is_active', true),
            ],

            // ── Optional ────────────────────────────────────────────────────
            'additional_info' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Server-side mirror of the client-side service filter. The React form
     * already hides these options, but the filter is bypassable via a direct
     * POST — so enforce it here too.
     *
     * Age and sex are read off the Patient record, not the request: they are no
     * longer client input, and reading them from the payload would let a caller
     * claim a 40-year-old is 8 to reach Pediatrics.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $service = $this->input('service');
                $patient = $this->resolvePatient();

                // A patient that failed its own rule already has an error; the
                // eligibility checks below have nothing trustworthy to read.
                if (! $patient) {
                    return;
                }

                // `patients.age` and `.gender` are nullable — staff-created and
                // pre-migration records often have neither — but the columns
                // they are copied into are NOT NULL, so booking one would fail
                // at the insert with a generic "something went wrong". Worse,
                // the eligibility checks below would read null and quietly pass:
                // `(int) null > 18` is false, so Pediatrics would accept an
                // adult. Refuse early, and say what to fix.
                //
                // Anything added or edited through SavePatientRequest already
                // has both, so this only catches legacy records.
                if ($patient->current_age === null || $patient->gender === null) {
                    $validator->errors()->add(
                        'patient_id',
                        'This patient’s record is missing their birthdate or biological sex. Please update their details before booking.'
                    );

                    return;
                }

                // Eligibility is read off the service row rather than named
                // service by service. It used to be two hardcoded `if`s — one
                // for OB-Gyne, one for Pediatrics — which meant a service an
                // administrator creates with an age or sex restriction would be
                // advertised with that restriction and then accept anybody.
                //
                // current_age, not the stored column: a patient recorded at 17
                // five years ago would otherwise still qualify for Pediatrics.
                $definition = Service::query()->where('slug', $service)->first();

                $reason = $definition?->ineligibilityReason($patient->gender, $patient->current_age);

                if ($reason !== null) {
                    $validator->errors()->add('service', $reason);
                }

                // Minors may be booked under HMO or PhilHealth: in the
                // Philippines children are routinely covered as dependents on a
                // parent's plan, with their own dependent member number. The
                // LOA workflow verifies that coverage like any other.

                // A lab draw, a scan and hands-on therapy all need the patient
                // in the building. Booking one "virtually" would produce an
                // appointment the clinic cannot deliver, and the doctor would
                // discover it at the appointment time.
                if ($this->input('consultation_type') === 'virtual'
                    && $definition?->requires_in_person) {
                    $validator->errors()->add(
                        'consultation_type',
                        'This service requires an in-person visit and cannot be booked as a video consultation.'
                    );
                }

                // Consent to a video consultation is required at the point of
                // booking one — not at the point of joining the call. By then
                // the patient is in a waiting room with a clinician expecting
                // them, which is the worst possible moment to be asked a
                // question they are free to answer "no" to.
                if ($this->input('consultation_type') === 'virtual'
                    && ! $this->boolean('consent_telemedicine')) {
                    $validator->errors()->add(
                        'consent_telemedicine',
                        'Please confirm you understand how a video consultation works before booking one.'
                    );
                }

                // A withdrawn consent to examination and treatment has to mean
                // something: the clinic cannot book a visit to examine someone
                // who has told it not to.
                if ($this->user()
                    && app(ConsentService::class)->isWithdrawn(Consent::TREATMENT, $this->user())) {
                    $validator->errors()->add(
                        'consent_treatment',
                        'You withdrew consent to examination and treatment. To book, agree to it again under Settings → Privacy & data.'
                    );
                }
            },
        ];
    }

    /**
     * The chosen patient, or null when `patient_id` did not survive its rules.
     *
     * Re-queried rather than trusted from the request, and scoped to the
     * guarantor for the same reason the `exists` rule is.
     */
    private function resolvePatient(): ?Patient
    {
        $id = $this->input('patient_id');

        if (! $id || ! Auth::id()) {
            return null;
        }

        return Patient::where('id', $id)
            ->where('guarantor_id', Auth::id())
            ->first();
    }

    public function messages(): array
    {
        return [
            'patient_id.required' => 'Please choose who this appointment is for.',
            'patient_id.exists' => 'That patient is not on your account. Please choose another.',
            'appointment_date.after' => 'The appointment date must be at least tomorrow.',
            'service.in' => 'Please select a valid service.',
            'appointment_time.date_format' => 'Please select a time slot from the available list.',
            'hmo.required_if' => 'Please select your HMO provider.',
            ...$this->hmoProviderMessages('hmo'),
            'hmo_id.required_if' => 'Please enter your HMO ID number.',
            'hmo_id.regex' => 'HMO ID may only contain uppercase letters, numbers, and hyphens.',
            'doctor_id.exists' => 'The selected doctor is not available. Please choose another.',
        ];
    }
}
