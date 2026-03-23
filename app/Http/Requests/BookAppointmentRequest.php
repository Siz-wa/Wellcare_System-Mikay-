<?php
// app/Http/Requests/BookAppointmentRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Step 1 — Personal Info
            'firstName'       => ['required', 'string', 'max:100'],
            'lastName'        => ['required', 'string', 'max:100'],
            'email'           => ['required', 'email', 'max:255'],
            'contactNumber'   => ['required', 'string', 'min:10', 'max:20'],
            'age'             => ['required', 'integer', 'min:1', 'max:120'],
            'gender'          => ['required', 'in:male,female,other'],

            // Step 2 — Appointment Details (branch removed — single branch system)
            'service'         => ['required', 'string', 'max:100'],
            'appointmentDate' => ['required', 'date', 'after:today'],
            'appointmentTime' => ['required', 'string', 'max:20'],
            'patientStatus'   => ['required', 'in:new,returning'],

            // Step 3 — Coverage
            'coverage'        => ['required', 'in:cash,hmo,philhealth'],
            'hmo'             => ['nullable', 'required_if:coverage,hmo', 'string', 'max:100'],
            'hmoId'           => ['nullable', 'required_if:coverage,hmo', 'string', 'max:100'],
            'preferredDoctor' => ['nullable', 'string', 'max:150'],

            // Step 4 — Additional
            'additionalInfo'  => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstName.required'       => 'Please enter your first name.',
            'lastName.required'        => 'Please enter your last name.',
            'email.required'           => 'Please provide a valid email address.',
            'contactNumber.required'   => 'Please enter your contact number.',
            'age.required'             => 'Please enter your age.',
            'gender.required'          => 'Please select your biological sex.',
            'service.required'         => 'Please select a service.',
            'appointmentDate.required' => 'Please choose a preferred date.',
            'appointmentDate.after'    => 'The appointment date must be a future date.',
            'appointmentTime.required' => 'Please select a time slot.',
            'patientStatus.required'   => 'Please indicate your patient record status.',
            'coverage.required'        => 'Please select your mode of coverage.',
            'hmo.required_if'          => 'Please select your HMO provider.',
            'hmoId.required_if'        => 'Please enter your HMO ID number.',
        ];
    }
}