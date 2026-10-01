<?php

namespace App\Http\Controllers;

use App\Exceptions\SlotUnavailableException;
use App\Http\Controllers\Patient\GuarantorPatientController;
use App\Http\Requests\BookAppointmentRequest;
use App\Http\Resources\DoctorResource;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\Consent;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentCancellationService;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\ConsentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
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
    public function __construct(
        private readonly BookingService $booking,
        private readonly ConsentService $consents,
    ) {}

    public function bookingPage(Request $request): Response
    {
        $user = Auth::user();

        $doctors = DoctorProfile::active()
            // `credential` is read per row by DoctorResource, which decides
            // which credentials the picker may show. Eager-loaded for the same
            // reason `user` is: without it this is an N+1 across the roster.
            //
            // `availabilityBlocks` is new here. The picker used to offer every
            // active doctor and let the patient discover, one date at a time,
            // that a doctor keeps no clinic — and the only thing it said then
            // was "no availability configured for this doctor", which is a
            // sentence about the database. Carrying the roster means the card
            // can name the days the doctor actually works.
            ->with(['user', 'credential', 'availabilityBlocks' => self::publishedWeeklyRoster(...)])
            // A doctor with no approved weekly roster at all cannot be booked
            // on ANY date, so they are not offered. This is the state the
            // clinic is in between hiring someone and an administrator
            // publishing their hours; listing them is a dead end on every one
            // of the ninety dates the window allows.
            ->whereHas('availabilityBlocks', self::publishedWeeklyRoster(...))
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
            'prefill' => self::resolvePrefill($request),
            'bookingWindow' => self::bookingWindow(),
            // SC-4 / C-5. The wording the telemedicine tick-box has to render.
            // Served from config rather than hardcoded in the component for the
            // same reason the registration consents are: the version stamped on
            // the consent row and the text the patient read must be the same
            // thing, and a second copy in TSX guarantees they drift.
            'telemedicineConsent' => $this->consents->documentFor(Consent::TELEMEDICINE),
            // The bookable catalogue. Served rather than bundled: it used to be
            // a hand-maintained TypeScript mirror of a PHP enum, so retiring a
            // service meant a code change and a build. An administrator now
            // edits it at /admin/services and the next page load has it.
            'services' => Service::catalogue(),
        ]);
    }

    /**
     * The weekly hours a patient may actually be booked into.
     *
     * Published only — a draft or a roster awaiting approval generates no
     * slot, so it is neither a reason to list a doctor nor something to show
     * as their clinic days. Recurring only: a specific-date row is a one-off
     * override (an Out of Office, a covered clinic), not a weekly pattern.
     */
    private static function publishedWeeklyRoster(Builder|Relation $query): Builder|Relation
    {
        return $query->published()
            ->where('is_available', true)
            ->whereNotNull('day_of_week');
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
    public static function bookingWindow(): array
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

    /**
     * What the wizard should open with, from `?service=` and `?type=`.
     *
     * The public services page and the doctors page both deep-link into
     * booking — "Book this service" on Laboratory Services means the patient
     * has already chosen. Until now nothing read those parameters, so every
     * one of those links dropped the patient on an empty dropdown and made
     * them choose again; four of the links also named services that did not
     * exist at all.
     *
     * Validated against the catalogue rather than trusted: the query string is
     * user-editable, and a value the Service enum does not know is dropped
     * rather than written into the form, where it would fail validation on
     * submit with no visible cause.
     *
     * @return array{doctorId: int|null, service: string|null, consultationType: string|null}
     */
    private static function resolvePrefill(Request $request): array
    {
        $service = $request->string('service')->toString();
        $type = $request->string('type')->toString();

        // From "Book an appointment" on a doctor's public profile. Only a
        // published doctor is honoured; the service defaults to the first
        // bookable one that doctor can take, so the picker is not empty.
        $doctor = DoctorProfile::active()->where('user_id', $request->integer('doctor'))->first();

        if ($doctor && $service === '') {
            $service = (string) Service::query()->bookable()->orderBy('sort_order')->get()
                ->first(fn (Service $s) => empty($s->specialties) ? false : in_array($doctor->specialty, (array) $s->specialties, true))
                ?->slug;
        }

        return [
            'doctorId' => $doctor?->user_id,
            // Checked against the catalogue rather than trusted: a stale link
            // naming a retired service must open the wizard blank, not prefill
            // a value the validator will then refuse.
            'service' => Service::query()->bookable()->where('slug', $service)->value('slug'),
            // Only `virtual` is worth deep-linking; `in_person` is already the
            // default the form opens with.
            'consultationType' => $type === 'virtual' ? 'virtual' : null,
        ];
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

            // SC-4 / C-5, C-6. Recorded against the PATIENT, not just the
            // account: a guarantor booking a video consultation for their child
            // is consenting on that child's behalf, and a consent row with no
            // patient_id could not say which of several people it covered.
            if ($appointment->consultation_type === 'virtual' && $appointment->patientRecord) {
                $this->consents->grant(
                    Consent::TELEMEDICINE,
                    $request->user(),
                    $appointment->patientRecord,
                );
            }

            // ── Notify assigned doctor about new appointment ───────────────
            if ($appointment->doctor_id) {
                $name = trim($appointment->first_name.' '.$appointment->last_name);
                AppointmentNotification::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $appointment->doctor_id,
                    // `requested`, not `confirmed`: the doctor has not
                    // confirmed anything yet, and the bell styles by type.
                    'type' => 'requested',
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
            app(AppointmentCancellationService::class)->cancel(
                $appointment,
                $request->string('reason', 'Cancelled by patient')->toString() ?: 'Cancelled by patient',
                $appointment->user_id === Auth::id()
                    ? AppointmentCancellationService::BY_PATIENT
                    : AppointmentCancellationService::BY_CLINIC,
            );

            return back()->with('success', 'Your appointment has been cancelled.');
        } catch (\LogicException $e) {
            return back()->withErrors(['cancel' => $e->getMessage()]);
        }
    }

    /**
     * Tell the doctor (and the previous doctor, if it changed) that a booking
     * moved. Without this a doctor found out only by noticing a gap.
     */
    private function notifyDoctorsOfMove(?int $previousDoctorId, Appointment $moved): void
    {
        $who = trim("{$moved->first_name} {$moved->last_name}") ?: 'A patient';
        $when = $moved->appointment_date->format('M j, Y').' at '.$moved->appointment_time;

        foreach (array_unique(array_filter([$moved->doctor_id, $previousDoctorId])) as $doctorId) {
            AppointmentNotification::create([
                'appointment_id' => $moved->id,
                'user_id' => $doctorId,
                'type' => 'rescheduled',
                'subject' => 'Appointment Rescheduled',
                'body' => $doctorId === $moved->doctor_id
                    ? "{$who} moved their appointment to {$when}. Please confirm the new time."
                    : "{$who} moved their appointment to another doctor. The slot is open again.",
                'read' => false,
            ]);
        }
    }

    /**
     * POST /appointments/{appointment}/reschedule
     *
     * Task 2.2. Before this the only way to move an appointment was to cancel it
     * and book again, which releases the old slot before the new one is secured
     * — so a patient moving a booking could end up with none. The service does
     * the whole move inside one transaction; this only authorises and validates.
     */
    public function reschedule(Request $request, Appointment $appointment): RedirectResponse
    {
        $validated = $request->validate([
            'appointment_date' => ['required', 'date'],
            'appointment_time' => ['required', 'string', 'max:20'],
            // Optional: moving to a different doctor is a legitimate reschedule,
            // and omitting it keeps the one already assigned.
            'doctor_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        // Same rule as cancel(): the booking account, or an admin.
        if ($appointment->user_id !== Auth::id() && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $previousDoctorId = $appointment->doctor_id;

        try {
            $moved = $this->booking->rescheduleAppointment(
                $appointment,
                $validated['appointment_date'],
                $validated['appointment_time'],
                $validated['doctor_id'] ?? null,
            );

            $this->notifyDoctorsOfMove($previousDoctorId, $moved);

            $message = $moved->status === 'pending_hmo_approval'
                ? 'Appointment moved. Because the date changed, your HMO approval has to be re-issued — the clinic will confirm it.'
                : 'Your appointment has been moved. Your doctor will confirm the new time.';

            return back()->with('success', $message);
        } catch (SlotUnavailableException $e) {
            return back()->withErrors(['reschedule' => $e->getMessage()]);
        }
    }

    /**
     * GET /appointments/slots?doctor_id=&date=&patient_id=
     *
     * `patient_id` is optional and narrowing: with it, times the patient is
     * already occupied at are removed from the list. A patient may hold several
     * appointments a day, so "the doctor is free at 10" and "you can be there
     * at 10" are now two different questions, and the form has to ask both —
     * offering a slot bookSlot() will refuse is a dead end the patient only
     * discovers after filling in the rest of the wizard.
     *
     * The id is resolved against the caller's own roster, never trusted: it
     * decides what is shown, and an unscoped id would let anyone probe when a
     * stranger's appointments are.
     */
    public function availableSlots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => ['nullable', 'integer', 'exists:users,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'patient_id' => ['nullable', 'integer'],
        ]);

        $doctorId = (int) $request->integer('doctor_id', 0);
        $date = $request->string('date')->toString();
        $patientId = $this->resolveOwnPatientId($request);

        $hasSchedule = $doctorId > 0 && $this->booking->hasSchedule($doctorId, $date);
        $slots = $hasSchedule
            ? $this->booking->getAvailableSlotsForPatient($doctorId, $date, $patientId)
            : [];

        // How many more bookings the patient's own daily cap allows. Null when
        // no patient was named — the caller cannot render a limit it did not ask
        // about, and 0 would read as "you are out of appointments".
        $patientRemaining = $patientId !== null
            ? $this->booking->remainingPatientCapacity($patientId, $date)
            : null;

        return response()->json([
            'slots' => $slots,
            // fully_booked = true ONLY when a schedule EXISTS but all slots are taken.
            // No schedule at all = NOT fully_booked (different condition entirely).
            // Note this is now the count AFTER the patient filter, so a day the
            // doctor still has room on can read as full for this patient —
            // which is exactly what the patient needs to be told.
            'fully_booked' => $hasSchedule && count($slots) === 0,
            'has_schedule' => $hasSchedule,
            'patient_slots_remaining' => $patientRemaining,
            'patient_daily_limit' => BookingService::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY,
            // Distinguishes "the doctor has nothing left" from "you have booked
            // all you may today". Both empty the list; only one is about the doctor.
            'patient_limit_reached' => $patientRemaining === 0,
        ]);
    }

    /**
     * The patient id from the request, but only if it is on the caller's own
     * roster. Anything else — absent, malformed, someone else's — is null,
     * which every caller treats as "no patient named".
     */
    private function resolveOwnPatientId(Request $request): ?int
    {
        $id = $request->integer('patient_id', 0);

        if ($id <= 0 || ! Auth::id()) {
            return null;
        }

        return Patient::where('id', $id)
            ->where('guarantor_id', Auth::id())
            ->value('id');
    }

    /**
     * GET /appointments/doctor-availability?date=YYYY-MM-DD&patient_id=
     *
     * Returns all doctors with their slot availability for a given date.
     * Used by the booking page to show "Fully Booked" badges on doctor cards
     * when the patient selects a date.
     *
     * `patient_id` is optional and narrows the counts the same way it narrows
     * /appointments/slots. Without it the badges would advertise times the
     * patient is already occupied at, and a doctor card reading "3 slots left"
     * would open onto an empty time picker — the two endpoints have to be
     * counting the same thing.
     */
    public function doctorAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'patient_id' => ['nullable', 'integer'],
        ]);

        $date = $request->string('date')->toString();
        $patientId = $this->resolveOwnPatientId($request);
        $doctors = DoctorProfile::where('is_active', true)
            ->pluck('user_id');

        $availability = $doctors->mapWithKeys(function ($doctorId) use ($date, $patientId) {
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

            $slots = $this->booking->getAvailableSlotsForPatient($doctorId, $date, $patientId);

            // The clinic caps patients per day, so the number that matters to a
            // patient is how many the doctor can still SEE — not how many hours
            // are left unbooked. "3 of 5 places left" reads against the
            // doctor's own cap.
            //
            // The patient's own daily allowance is reported separately. Folding
            // it in (min of the two) produced "3 of 5 left" for a doctor with
            // nothing booked at all, which reads as the doctor being busy. The
            // time picker already stops at the patient's limit.
            $cap = $this->booking->dailyCapFor($doctorId);
            $remaining = $this->booking->remainingDailyCapacity($doctorId, $date);
            $patientRemaining = $patientId !== null
                ? $this->booking->remainingPatientCapacity($patientId, $date)
                : null;

            return [$doctorId => [
                'available_slots' => count($slots),
                'fully_booked' => count($slots) === 0,
                'no_schedule' => false,
                'daily_cap' => $cap,
                'slots_remaining' => $remaining,
                'patient_slots_remaining' => $patientRemaining,
            ]];
        });

        return response()->json(['availability' => $availability]);
    }

    public function markOutOfOffice(Request $request, int $doctorId): RedirectResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        app(AvailabilityService::class)->addTimeOff(
            $doctorId,
            $request->string('date')->toString(),
            $request->string('reason')->toString() ?: null,
        );

        return back()->with('success', 'Out of office applied. Affected patients have been notified.');
    }
}
