<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * BookAppointmentRequest
 * ──────────────────────────────────────────────────────────────────────────────
 * The React form sends camelCase keys (firstName, appointmentDate, etc.).
 * prepareForValidation() maps them to snake_case before the rules run,
 * so validation and the controller both work with consistent snake_case keys.
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
            'first_name' => $this->input('firstName', $this->input('first_name')),
            'last_name' => $this->input('lastName', $this->input('last_name')),
            'contact_number' => $this->input('contactNumber', $this->input('contact_number')),
            'appointment_date' => $this->input('appointmentDate', $this->input('appointment_date')),
            'appointment_time' => $this->input('appointmentTime', $this->input('appointment_time')),
            'patient_status' => $this->input('patientStatus', $this->input('patient_status')),
            'consultation_type' => $this->input('consultationType', $this->input('consultation_type')),
            'hmo_id' => $this->input('hmoId', $this->input('hmo_id')),
            'doctor_id' => $this->input('doctorId', $this->input('doctor_id')),
            'additional_info' => $this->input('additionalInfo', $this->input('additional_info')),
        ]);
    }

    public function rules(): array
    {
        return [
            // ── Step 1: Personal ────────────────────────────────────────────
            'first_name' => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'last_name' => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'email' => ['required', 'email:rfc,dns', 'max:255'],
            'contact_number' => ['required', 'string', 'regex:/^(\+639|09)\d{9}$/'],
            'age' => ['required', 'integer', 'min:1', 'max:120'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],

            // ── Step 2: Appointment ─────────────────────────────────────────
            'service' => ['required', Rule::in(self::SERVICES)],
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after:today',
                'before:'.now()->addMonths(3)->toDateString(),
            ],
            // Must match the format BookingService generates and parses
            // ("8:00 AM"). Without this, to24h() throws an uncaught
            // InvalidFormatException on anything unparseable.
            'appointment_time' => ['required', 'string', 'date_format:g:i A'],
            'patient_status' => ['required', Rule::in(['new', 'returning'])],
            // Nullable, not required: the column defaults to in_person, and
            // making it required would reject every request from a client that
            // predates this field for no clinical reason.
            'consultation_type' => ['nullable', Rule::in(['in_person', 'virtual'])],

            // ── Step 3: Coverage ────────────────────────────────────────────
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
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $service = $this->input('service');

                if ($service === 'ob-gyne' && $this->input('gender') === 'male') {
                    $validator->errors()->add(
                        'service',
                        'OB-Gyne consultations are not available for male patients.'
                    );
                }

                if ($service === 'pediatrics' && (int) $this->input('age') > self::PEDIATRICS_MAX_AGE) {
                    $validator->errors()->add(
                        'service',
                        'Pediatrics is only available for patients aged '.self::PEDIATRICS_MAX_AGE.' and below.'
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

    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Please enter a valid PH number (e.g. +639XXXXXXXXX or 09XXXXXXXXX).',
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
