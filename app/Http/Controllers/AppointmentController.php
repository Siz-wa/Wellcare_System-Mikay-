<?php
// app/Http/Controllers/AppointmentController.php

namespace App\Http\Controllers;

use App\Http\Requests\BookAppointmentRequest;
use App\Models\Appointment;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{

    public function index(): Response
    {
        $appointments = Appointment::where('user_id', Auth::id())
            ->orderByDesc('appointment_date')
            ->get();

        return Inertia::render('generals/appointments', compact('appointments'));
    }
    /**
     * Show the booking form.
     * Renders: resources/js/pages/generals/book-appointment.tsx
     */
    public function create(): Response
    {
         

        return Inertia::render('user/book-appointment/book-appointment');
        
    }

    /**
     * List appointments for the authenticated user.
     * Renders: resources/js/pages/generals/appointments.tsx
     */


    /**
     * Store a new appointment.
     * Route: POST /appointments (appointments.store)
     */
    public function store(BookAppointmentRequest $request): \Illuminate\Http\RedirectResponse
    {
        Appointment::create([
            'user_id'          => Auth::id(),
            'first_name'       => $request->validated('firstName'),
            'last_name'        => $request->validated('lastName'),
            'email'            => $request->validated('email'),
            'contact_number'   => $request->validated('contactNumber'),
            'age'              => $request->validated('age'),
            'gender'           => $request->validated('gender'),
            'service'          => $request->validated('service'),
            'appointment_date' => $request->validated('appointmentDate'),
            'appointment_time' => $request->validated('appointmentTime'),
            'patient_status'   => $request->validated('patientStatus'),
            'coverage'         => $request->validated('coverage'),
            'hmo'              => $request->validated('hmo'),
            'hmo_id'           => $request->validated('hmoId'),
            'preferred_doctor' => $request->validated('preferredDoctor'),
            'additional_info'  => $request->validated('additionalInfo'),
            'status'           => 'pending',
        ]);

        // Redirect back to the same page — Inertia's onSuccess callback
        // will fire on the frontend and show the BookingSuccess screen.
        return redirect()->back();
    }
}