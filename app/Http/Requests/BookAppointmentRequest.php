<?php

namespace App\Http\Requests;

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
            'first_name'       => $this->input('firstName',       $this->input('first_name')),
            'last_name'        => $this->input('lastName',        $this->input('last_name')),
            'contact_number'   => $this->input('contactNumber',   $this->input('contact_number')),
            'appointment_date' => $this->input('appointmentDate', $this->input('appointment_date')),
            'appointment_time' => $this->input('appointmentTime', $this->input('appointment_time')),
            'patient_status'   => $this->input('patientStatus',   $this->input('patient_status')),
            'hmo_id'           => $this->input('hmoId',           $this->input('hmo_id')),
            'doctor_id'        => $this->input('doctorId',        $this->input('doctor_id')),
            'additional_info'  => $this->input('additionalInfo',  $this->input('additional_info')),
        ]);
    }

    public function rules(): array
    {
        return [
            // ── Step 1: Personal ────────────────────────────────────────────
            'first_name'     => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'last_name'      => ['required', 'string', 'max:50', 'regex:/^[\pL\s\'\-]+$/u'],
            'email'          => ['required', 'email:rfc,dns', 'max:255'],
            'contact_number' => ['required', 'string', 'regex:/^(\+639|09)\d{9}$/'],
            'age'            => ['required', 'integer', 'min:1', 'max:120'],
            'gender'         => ['required', Rule::in(['male', 'female', 'other'])],

            // ── Step 2: Appointment ─────────────────────────────────────────
            'service'          => ['required', 'string', 'max:100'],
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after:today',
                'before:' . now()->addMonths(3)->toDateString(),
            ],
            'appointment_time' => ['required', 'string', 'max:20'],
            'patient_status'   => ['required', Rule::in(['new', 'returning'])],

            // ── Step 3: Coverage ────────────────────────────────────────────
            'coverage' => ['required', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            'hmo'      => ['nullable', 'required_if:coverage,hmo', 'string', 'max:100'],
            'hmo_id'   => [
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

    public function messages(): array
    {
        return [
            'contact_number.regex'   => 'Please enter a valid PH number (e.g. +639XXXXXXXXX or 09XXXXXXXXX).',
            'appointment_date.after' => 'The appointment date must be at least tomorrow.',
            'hmo.required_if'        => 'Please select your HMO provider.',
            'hmo_id.required_if'     => 'Please enter your HMO ID number.',
            'hmo_id.regex'           => 'HMO ID may only contain uppercase letters, numbers, and hyphens.',
            'doctor_id.exists'       => 'The selected doctor is not available. Please choose another.',
        ];
    }
}