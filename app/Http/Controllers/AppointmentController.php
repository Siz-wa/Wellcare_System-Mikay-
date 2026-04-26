<?php

namespace App\Http\Controllers;

use App\Exceptions\SlotUnavailableException;
use App\Http\Requests\BookAppointmentRequest;
use App\Http\Resources\DoctorResource;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\User;
use App\Models\DoctorProfile;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AppointmentController extends Controller
{
    public function __construct(private readonly BookingService $booking) {}

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
        \Log::info('=== BOOKING ATTEMPT ===');
        \Log::info('Raw input', $request->all());
        \Log::info('Validated', $request->validated());

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
                'branch'           => $request->input('branch'),
                'appointment_date' => $request->input('appointmentDate', $request->input('appointment_date')),
                'appointment_time' => $request->input('appointmentTime', $request->input('appointment_time')),
                'patient_status'   => $request->input('patientStatus',   $request->input('patient_status')),
                'coverage'         => $request->input('coverage'),
                'hmo'              => $request->input('hmo'),
                'hmo_id'           => $request->input('hmoId',           $request->input('hmo_id')),
                'doctor_id'        => $request->input('doctorId',        $request->input('doctor_id')),
                'additional_info'  => $request->input('additionalInfo',  $request->input('additional_info')),
            ];

            \Log::info('Payload sent to bookSlot', $payload);

            $appointment = $this->booking->bookSlot($payload);

            \Log::info('Booking successful', ['appointment_id' => $appointment->id]);

            // ── Notify assigned doctor about new appointment ───────────────
            if ($appointment->doctor_id) {
                $name = trim($appointment->first_name . ' ' . $appointment->last_name);
                AppointmentNotification::create([
                    'appointment_id' => $appointment->id,
                    'user_id'        => $appointment->doctor_id,
                    'type'           => 'confirmed',
                    'subject'        => 'New Appointment Request',
                    'body'           => "{$name} has requested an appointment on {$appointment->appointment_date->format('M j, Y')} at {$appointment->appointment_time}.",
                    'read'           => false,
                ]);
            }

            // ── Notify HR users if HMO appointment ───────────────────────
            if ($appointment->coverage === 'hmo') {
                $hrUsers = User::role(['hr', 'admin'])->get();
                $name    = trim($appointment->first_name . ' ' . $appointment->last_name);
                foreach ($hrUsers as $hrUser) {
                    AppointmentNotification::create([
                        'appointment_id' => $appointment->id,
                        'user_id'        => $hrUser->id,
                        'type'           => 'hmo_submitted',
                        'subject'        => 'New HMO Appointment — Needs Verification',
                        'body'           => "{$name} submitted an HMO appointment for {$appointment->appointment_date->format('M j, Y')} at {$appointment->appointment_time}. HMO: {$appointment->hmo} ({$appointment->hmo_id}).",
                        'read'           => false,
                    ]);
                }
            }

            return redirect()
                ->route('book')
                ->with('success', 'Your appointment request has been received.');

        } catch (SlotUnavailableException $e) {
            \Log::warning('SlotUnavailableException: ' . $e->getMessage());
            return back()
                ->withErrors(['appointmentTime' => $e->getMessage()])
                ->withInput();

        } catch (Throwable $e) {
            // Log the FULL error so we can see exactly what went wrong
            \Log::error('Booking failed: ' . $e->getMessage(), [
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

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

        $doctorId = (int) $request->integer('doctor_id', 0);
        $date     = $request->string('date')->toString();

        $hasSchedule = $doctorId > 0 && $this->booking->hasSchedule($doctorId, $date);
        $slots       = $hasSchedule ? $this->booking->getAvailableSlots($doctorId, $date) : [];

        return response()->json([
            'slots'        => $slots,
            // fully_booked = true ONLY when a schedule EXISTS but all slots are taken.
            // No schedule at all = NOT fully_booked (different condition entirely).
            'fully_booked' => $hasSchedule && count($slots) === 0,
            'has_schedule' => $hasSchedule,
        ]);
    }

    /**
     * GET /appointments/doctor-availability?date=YYYY-MM-DD
     *
     * Returns all doctors with their slot availability for a given date.
     * Used by the booking page to show "Fully Booked" badges on doctor cards
     * when the patient selects a date.
     */
    public function doctorAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date    = $request->string('date')->toString();
        $doctors = \App\Models\DoctorProfile::where('is_active', true)
            ->pluck('user_id');

        $availability = $doctors->mapWithKeys(function ($doctorId) use ($date) {
            $hasSchedule = $this->booking->hasSchedule($doctorId, $date);

            // If the doctor has no schedule configured for this date, they are
            // NOT "fully booked" — they simply have no availability set up.
            // Only mark fully_booked = true when they HAVE a schedule but all
            // slots are already taken.
            if (! $hasSchedule) {
                return [$doctorId => [
                    'available_slots' => null,   // null = no schedule, not fully booked
                    'fully_booked'    => false,
                    'no_schedule'     => true,
                ]];
            }

            $slots = $this->booking->getAvailableSlots($doctorId, $date);
            return [$doctorId => [
                'available_slots' => count($slots),
                'fully_booked'    => count($slots) === 0,
                'no_schedule'     => false,
            ]];
        });

        return response()->json(['availability' => $availability]);
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