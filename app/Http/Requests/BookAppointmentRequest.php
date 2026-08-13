<?php

namespace App\Http\Requests;

use App\Models\Patient;
use App\Services\BookingService;
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
    /** Mirrors `serviceOptions` in resources/js/.../bookingdata.ts */
    public const SERVICES = [
        'general', 'cardiology', 'dermatology', 'pediatrics', 'ob-gyne',
        'orthopedics', 'laboratory', 'imaging', 'physical-therapy',
    ];

    /** Mirrors SERVICE_ELIGIBILITY in bookingdata.ts */
    public const PEDIATRICS_MAX_AGE = 18;

    /**
     * Services that cannot be delivered over video, because they require the
     * patient physically present — a blood draw, a scan, hands-on therapy.
     *
     * Mirrors `IN_PERSON_ONLY_SERVICES` in bookingdata.ts, which greys the
     * virtual option out. This constant is the enforcement; the frontend copy
     * is only the courtesy.
     */
    public const IN_PERSON_ONLY_SERVICES = ['laboratory', 'imaging', 'physical-therapy'];

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
        ]);
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
            'service' => ['required', Rule::in(self::SERVICES)],
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

            // ── Step 2: Coverage ────────────────────────────────────────────
            'coverage' => ['required', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            'hmo' => ['nullable', 'required_if:coverage,hmo', 'string', 'max:100'],
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

                if ($service === 'ob-gyne' && $patient->gender === 'male') {
                    $validator->errors()->add(
                        'service',
                        'OB-Gyne consultations are not available for male patients.'
                    );
                }

                // current_age, not the stored column: a patient recorded at 17
                // years ago would otherwise still qualify for Pediatrics today.
                if ($service === 'pediatrics' && $patient->current_age > self::PEDIATRICS_MAX_AGE) {
                    $validator->errors()->add(
                        'service',
                        'Pediatrics is only available for patients aged '.self::PEDIATRICS_MAX_AGE.' and below.'
                    );
                }

                // A minor is billed to their guarantor. The Coverage step hides
                // the chooser for them and sends cash; this is what stops a
                // direct POST from filing a child under their own HMO, which
                // the counter would then have to unpick.
                if ($patient->isMinor() && $this->input('coverage') !== 'cash') {
                    $validator->errors()->add(
                        'coverage',
                        'A patient aged '.Patient::MINOR_MAX_AGE.' or under is billed to their guarantor, so this visit must be booked as cash.'
                    );
                }

                // A lab draw, a scan and hands-on therapy all need the patient
                // in the building. Booking one "virtually" would produce an
                // appointment the clinic cannot deliver, and the doctor would
                // discover it at the appointment time.
                if ($this->input('consultation_type') === 'virtual'
                    && in_array($service, self::IN_PERSON_ONLY_SERVICES, true)) {
                    $validator->errors()->add(
                        'consultation_type',
                        'This service requires an in-person visit and cannot be booked as a video consultation.'
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
            'hmo_id.required_if' => 'Please enter your HMO ID number.',
            'hmo_id.regex' => 'HMO ID may only contain uppercase letters, numbers, and hyphens.',
            'doctor_id.exists' => 'The selected doctor is not available. Please choose another.',
        ];
    }
}
