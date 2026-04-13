<?php

namespace App\Http\Controllers;

use App\Exceptions\SlotUnavailableException;
use App\Http\Requests\BookAppointmentRequest;
use App\Http\Resources\DoctorResource;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\NotificationService;
use Throwable;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly BookingService $booking,
        private readonly NotificationService $notifications, 
        ) {}

    public function bookingPage(): Response
    {
        $doctors = DoctorProfile::active()
            ->with('user')
            ->orderBy('specialty')
            ->orderBy('display_name')
            ->get();

        return Inertia::render('user/book-appointment/book-appointment', [
            'doctors' => DoctorResource::collection($doctors)->resolve(),
        ]);
    }

    public function index(): Response
    {
        $appointments = Appointment::where('user_id', Auth::id())
            ->with('doctor.doctorProfile')
            ->orderByDesc('appointment_date')
            ->get();

        return Inertia::render('user/appointments/index', compact('appointments'));
    }

    public function show(Appointment $appointment): Response
    {
        abort_if($appointment->user_id !== Auth::id(), 403);
        $appointment->load('doctor.doctorProfile');
        return Inertia::render('user/appointments/show', compact('appointment'));
    }

    public function confirmation(Appointment $appointment): Response
    {
        abort_if($appointment->user_id !== Auth::id(), 403);
        $appointment->load('doctor.doctorProfile');
        return Inertia::render('user/appointments/confirmation', compact('appointment'));
    }

    public function store(BookAppointmentRequest $request): RedirectResponse
    {
        // Log everything so we can see exactly what's happening
     

        try {
            $payload = [
                'user_id'          => Auth::id(),
                'first_name'       => $request->input('firstName',       $request->input('first_name')),
                'last_name'        => $request->input('lastName',        $request->input('last_name')),
                'email'            => $request->input('email'),
                'contact_number'   => $request->input('contactNumber',   $request->input('contact_number')),
                'age'              => $request->input('age'),
                'gender'           => $request->input('gender'),
                'service'          => $request->input('service'),
                'branch'           => 'Wellcare Dasmarinas',
                'appointment_date' => $request->input('appointmentDate', $request->input('appointment_date')),
                'appointment_time' => $request->input('appointmentTime', $request->input('appointment_time')),
                'patient_status'   => $request->input('patientStatus',   $request->input('patient_status')),
                'coverage'         => $request->input('coverage'),
                'hmo'              => $request->input('hmo'),
                'hmo_id'           => $request->input('hmoId',           $request->input('hmo_id')),
                'doctor_id'        => $request->input('doctorId',        $request->input('doctor_id')),
                'additional_info'  => $request->input('additionalInfo',  $request->input('additional_info')),
            ];


            $appointment = $this->booking->bookSlot($payload);
            $this->notifications->appointmentRequested($appointment);
            return redirect()
                ->route('book')
                ->with('success', 'Your appointment request has been received.');

        } catch (SlotUnavailableException $e) {
            return back()
                ->withErrors(['appointmentTime' => $e->getMessage()])
                ->withInput();

        } catch (Throwable $e) {
            // Log the FULL error so we can see exactly what went wrong
            return back()
                ->withErrors(['appointmentTime' => 'Error: ' . $e->getMessage()])
                ->withInput();
        }
    }

    public function cancel(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        if ($appointment->user_id !== Auth::id() && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        try {
            $this->booking->cancelAppointment(
                $appointment,
                $request->string('reason', 'Cancelled by patient')->toString()
            );
            return back()->with('success', 'Your appointment has been cancelled.');
        } catch (\LogicException $e) {
            return back()->withErrors(['cancel' => $e->getMessage()]);
        }
    }

    public function availableSlots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => ['nullable', 'integer', 'exists:users,id'],
            'date'      => ['required', 'date_format:Y-m-d'],
        ]);

        $slots = $this->booking->getAvailableSlots(
            doctorId: (int) $request->integer('doctor_id', 0),
            date:     $request->string('date')->toString(),
        );

        return response()->json(['slots' => $slots]);
    }

    public function markOutOfOffice(Request $request, int $doctorId): RedirectResponse
    {
        $request->validate(['date' => ['required', 'date_format:Y-m-d']]);

        $this->booking->invalidateOutOfOffice(
            $doctorId,
            $request->string('date')->toString()
        );

        return back()->with('success', 'Out of Office block applied.');
    }
}