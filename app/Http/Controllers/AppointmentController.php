<?php

namespace App\Http\Controllers;

use App\Exceptions\SlotUnavailableException;
use App\Http\Controllers\Patient\GuarantorPatientController;
use App\Http\Requests\BookAppointmentRequest;
use App\Http\Resources\DoctorResource;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AppointmentController extends Controller
{
    public function __construct(private readonly BookingService $booking) {}

    public function bookingPage(Request $request): Response
    {
        $user = Auth::user();

        $doctors = DoctorProfile::active()
            ->with('user')
            ->orderBy('specialty')
            ->orderBy('display_name')
            ->get();

        // Idempotent, and the reason a brand-new account rarely meets an empty
        // gate: promotes the account holder's own profile into a Patient row.
        Patient::ensureSelfPatient($user);

        $patients = Patient::where('guarantor_id', $user->id)
            ->orderByRaw("relationship_to_guarantor = 'self' DESC")
            ->orderBy('first_name')
            ->get();

        return Inertia::render('user/book-appointment/book-appointment', [
            'doctors' => DoctorResource::collection($doctors)->resolve(),
            'patients' => $patients
                ->map(fn (Patient $p) => GuarantorPatientController::mapPatient($p))
                ->values(),
            // `?patient=` is a URL the user can edit. Resolve it against their
            // own roster and fall back to "not chosen yet" rather than trusting
            // it — otherwise the gate would open on a stranger's details.
            'selectedPatientId' => $this->resolveSelectedPatient($request, $patients),
            'bookingWindow' => self::bookingWindow(),
        ]);
    }

    /**
     * The bookable date range, computed server-side in the app timezone.
     *
     * The picker used to derive this in the browser with
     * `new Date().setHours(0,0,0,0)` then `.toISOString()` — local midnight
     * rendered as UTC, which in Asia/Manila shifts the string back a day and
     * quietly let patients select today. Sending real dates removes both that
     * skew and the second copy of the 3-month rule.
     *
     * `max` is inclusive for the date input; the request rule is `before:`,
     * which is exclusive — hence subDay().
     *
     * @return array{min: string, max: string}
     */
    private static function bookingWindow(): array
    {
        return [
            'min' => now()->addDay()->toDateString(),
            'max' => now()->addMonths(BookingService::MAX_LEAD_MONTHS)->subDay()->toDateString(),
        ];
    }

    /**
     * @param  Collection<int, Patient>  $patients
     */
    private function resolveSelectedPatient(Request $request, Collection $patients): ?int
    {
        $requested = $request->integer('patient');

        return $patients->contains('id', $requested) ? $requested : null;
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
        try {
            // Identity fields are deliberately absent: BookingService reads name,
            // email, contact, age and sex off the chosen Patient record, and
            // derives patient_status from that record's own visit history.
            $payload = [
                'user_id' => Auth::id(),
                'patient_id' => $request->input('patientId', $request->input('patient_id')),
                'service' => $request->input('service'),
                'branch' => $request->input('branch'),
                'appointment_date' => $request->input('appointmentDate', $request->input('appointment_date')),
                'appointment_time' => $request->input('appointmentTime', $request->input('appointment_time')),
                'consultation_type' => $request->input('consultationType', $request->input('consultation_type')),
                'coverage' => $request->input('coverage'),
                'hmo' => $request->input('hmo'),
                'hmo_id' => $request->input('hmoId', $request->input('hmo_id')),
                'doctor_id' => $request->input('doctorId', $request->input('doctor_id')),
                'additional_info' => $request->input('additionalInfo', $request->input('additional_info')),
            ];

            $appointment = $this->booking->bookSlot($payload);

            // ── Notify assigned doctor about new appointment ───────────────
            if ($appointment->doctor_id) {
                $name = trim($appointment->first_name.' '.$appointment->last_name);
                AppointmentNotification::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $appointment->doctor_id,
                    'type' => 'confirmed',
                    'subject' => 'New Appointment Request',
                    'body' => "{$name} has requested an appointment on {$appointment->appointment_date->format('M j, Y')} at {$appointment->appointment_time}.",
                    'read' => false,
                ]);
            }

            // ── Notify HR users if HMO appointment ───────────────────────
            if ($appointment->coverage === 'hmo') {
                $hrUsers = User::role(['hr', 'admin'])->get();
                $name = trim($appointment->first_name.' '.$appointment->last_name);
                foreach ($hrUsers as $hrUser) {
                    AppointmentNotification::create([
                        'appointment_id' => $appointment->id,
                        'user_id' => $hrUser->id,
                        'type' => 'hmo_submitted',
                        'subject' => 'New HMO Appointment — Needs Verification',
                        'body' => "{$name} submitted an HMO appointment for {$appointment->appointment_date->format('M j, Y')} at {$appointment->appointment_time}. HMO: {$appointment->hmo} ({$appointment->hmo_id}).",
                        'read' => false,
                    ]);
                }
            }

            return redirect()
                ->route('book')
                ->with('success', 'Your appointment request has been received.');

        } catch (SlotUnavailableException $e) {
            // Expected outcome (slot taken, bad time, no doctor free) — not an
            // error worth logging on every occurrence.
            return back()
                ->withErrors(['appointmentTime' => $e->getMessage()])
                ->withInput();

        } catch (Throwable $e) {
            // Message + location only. Never log the request body or payload:
            // they carry the patient's name, email, contact number and HMO ID.
            \Log::error('Booking failed: '.$e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return back()
                ->withErrors(['appointmentTime' => 'Something went wrong while booking. Please try again.'])
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
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $doctorId = (int) $request->integer('doctor_id', 0);
        $date = $request->string('date')->toString();

        $hasSchedule = $doctorId > 0 && $this->booking->hasSchedule($doctorId, $date);
        $slots = $hasSchedule ? $this->booking->getAvailableSlots($doctorId, $date) : [];

        return response()->json([
            'slots' => $slots,
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

        $date = $request->string('date')->toString();
        $doctors = DoctorProfile::where('is_active', true)
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
                    'fully_booked' => false,
                    'no_schedule' => true,
                    'daily_cap' => null,
                    'slots_remaining' => null,
                ]];
            }

            $slots = $this->booking->getAvailableSlots($doctorId, $date);

            // The clinic caps patients per day, so the number that matters to a
            // patient is how many the doctor can still SEE — not how many hours
            // are left unbooked. Showing "3 of 5 left" is what makes the time
            // picker legible.
            $cap = $this->booking->dailyCapFor($doctorId);
            $remaining = $this->booking->remainingDailyCapacity($doctorId, $date);

            return [$doctorId => [
                'available_slots' => count($slots),
                'fully_booked' => count($slots) === 0,
                'no_schedule' => false,
                'daily_cap' => $cap,
                'slots_remaining' => $remaining,
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
