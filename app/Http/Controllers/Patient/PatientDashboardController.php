<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Services\AppointmentCancellationService;
use App\Services\BookingService;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * PatientDashboardController
 * ──────────────────────────────────────────────────────────────────────────────
 * One booking account can guarantee several people (see Patient), so every
 * appointment payload carries *who* it is for as first-class data — name,
 * initials, relationship, and a stable `patientKey` the UI groups and filters
 * on. Without it the dashboard is a flat list of services with no way to tell
 * a child's check-up from their parent's lab work.
 *
 * It also carries *when* in a pre-bucketed form (`bucket`, `dayLabel`,
 * `sortKey`) so the client never has to parse "9:00 AM" strings to order or
 * separate a day's appointments.
 */
class PatientDashboardController extends Controller
{
    /** Statuses that are done with — read from the history panel, not the board. */
    private const CLOSED_STATUSES = ['completed', 'cancelled', 'no_show'];

    /** Pre-completion states a patient may still withdraw from. */
    private const CANCELLABLE_STATUSES = ['requested', 'confirmed', 'pending_hmo_approval'];

    /**
     * Whether check-in is restricted to the day of the appointment.
     *
     * Read in two places that must agree — the `canCheckIn` flag the card
     * renders from, and the endpoint that accepts the post. Splitting them is
     * what previously left a button that looked live and an endpoint that
     * refused it, so both go through here.
     */
    private static function enforcesCheckInDay(): bool
    {
        return (bool) config('booking.enforce_checkin_day');
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function dashboard(): Response
    {
        $userId = Auth::id();

        // Upcoming appointments (not cancelled/completed).
        //
        // Ordered in SQL on `appointment_at`, the real datetime column. This
        // used to sort in PHP: `appointment_time` is a varchar holding
        // "9:00 AM", so ORDER BY over it sorts lexically and files 1:00 PM
        // before 9:00 AM. That workaround lived here and in no other
        // controller, which is how five other screens shipped the bug.
        //
        // `sortKey` is still emitted — the client's typed props declare it and
        // groupUpcoming() below sorts on it — but the list arrives ordered.
        $appointments = Appointment::where('user_id', $userId)
            ->whereNotIn('status', self::CLOSED_STATUSES)
            ->with(['doctor.doctorProfile', 'patientRecord', 'paymentVerification'])
            ->orderBy('appointment_at')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a))
            ->values();

        // Past appointments — grouped by the person seen, newest visit first.
        $pastByPatient = Appointment::where('user_id', $userId)
            ->whereIn('status', self::CLOSED_STATUSES)
            ->with(['doctor.doctorProfile', 'consultationSession', 'patientRecord'])
            ->orderByDesc('appointment_date')
            ->get()
            ->map(fn (Appointment $a) => [
                'key' => $this->patientKeyFor($a),
                'name' => $this->patientNameFor($a),
                'relation' => $a->patientRecord?->relationship_label,
                'record' => $this->mapPastAppointment($a),
            ])
            ->groupBy('key')
            ->map(fn (Collection $group) => [
                'key' => $group->first()['key'],
                'patient' => $group->first()['name'],
                'relation' => $group->first()['relation'],
                'initials' => $this->initialsFor($group->first()['name']),
                'records' => $group->pluck('record')->values(),
            ])
            ->sortBy('patient')
            ->values();

        // Notifications — include `title` (alias for `subject`) so the
        // NotificationBell component always has a heading to display.
        $user = Auth::user();

        $notifications = AppointmentNotification::where('user_id', $userId)
            ->with('appointment')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AppointmentNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->subject,   // ← NotificationBell reads `title`
                'subject' => $n->subject,   // ← kept for backwards compat
                'body' => $n->body,
                'read' => $n->read,
                'time' => $n->created_at->diffForHumans(),
                'date' => $n->created_at->format('d M Y'),
                // Was hardcoded null, which made every notification on this page
                // a dead click — this payload overrides the one
                // HandleInertiaRequests shares, so the middleware's routing
                // never reached the bell here.
                'action_url' => $n->actionUrlFor($user),
                'appointmentId' => $n->appointment_id,
            ]);

        $unreadCount = AppointmentNotification::where('user_id', $userId)
            ->where('read', false)
            ->count();

        return Inertia::render('user/dashboard', [
            'appointments' => $appointments,
            // The same bookable window the wizard uses, for the reschedule picker.
            'bookingWindow' => AppointmentController::bookingWindow(),
            'appointmentPatients' => $this->summarisePatients($appointments),
            'pastByPatient' => $pastByPatient,
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'stats' => [
                'upcoming' => $appointments->count(),
                'today' => $appointments->where('isToday', true)->count(),
                'confirmed' => $appointments->where('status', 'confirmed')->count(),
                'awaiting' => $appointments
                    ->whereIn('status', ['requested', 'pending_hmo_approval'])
                    ->count(),
            ],
        ]);
    }

    // ── Self check-in (confirmed → checked_in) ────────────────────────────────

    public function checkIn(Appointment $appointment): RedirectResponse
    {
        abort_if($appointment->user_id !== Auth::id(), 403);

        if ($appointment->status !== 'confirmed') {
            return back()->withErrors([
                'checkin' => 'You can only check in after your appointment has been confirmed by the doctor.',
            ]);
        }

        // Hiding the button is not the same as closing the door: without this
        // the endpoint accepted a check-in for a visit weeks away, or for one
        // whose date passed a month ago, and pushed a "patient has arrived"
        // notification at the doctor either way.
        //
        // Suspended while `booking.enforce_checkin_day` is false so that a
        // tester can walk an appointment through the rest of the state machine
        // without first moving its date. The ownership and status checks above
        // are NOT part of that relaxation and always apply.
        if (self::enforcesCheckInDay() && ! $appointment->appointment_date->isToday()) {
            return back()->withErrors([
                'checkin' => 'You can only check in on the day of your appointment.',
            ]);
        }

        $appointment->update(['status' => 'checked_in']);

        // Notify the assigned doctor that the patient has arrived
        if ($appointment->doctor_id) {
            $name = trim($appointment->first_name.' '.$appointment->last_name);
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->doctor_id,
                'type' => 'checked_in',
                'subject' => 'Patient Has Checked In',
                'body' => "{$name} has checked in for their {$appointment->appointment_time} appointment and is ready to be seen.",
                'read' => false,
            ]);
        }

        return back()->with('success', 'You are checked in! Please wait — the doctor will call you shortly.');
    }

    // ── Cancel appointment ────────────────────────────────────────────────────

    public function cancel(Appointment $appointment): RedirectResponse
    {
        abort_if($appointment->user_id !== Auth::id(), 403);

        $reason = trim((string) request()->string('reason')) ?: 'Cancelled by patient';

        try {
            app(AppointmentCancellationService::class)->cancel(
                $appointment,
                mb_substr($reason, 0, 500),
                AppointmentCancellationService::BY_PATIENT,
            );
        } catch (\LogicException $e) {
            return back()->withErrors(['cancel' => $e->getMessage()]);
        }

        return back()->with('success', 'Your appointment has been cancelled and your doctor has been told.');
    }

    // ── Mark notification read ────────────────────────────────────────────────

    public function markRead(AppointmentNotification $notification): RedirectResponse
    {
        abort_if($notification->user_id !== Auth::id(), 403);
        $notification->update(['read' => true]);

        return back();
    }

    // ── Mark all notifications read ───────────────────────────────────────────

    public function markAllRead(): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('read', false)
            ->update(['read' => true]);

        return back();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * The people who actually have something booked, for the board's person
     * filter. Built from the mapped appointments rather than the roster so a
     * patient with nothing upcoming does not render a chip that filters to zero.
     *
     * @param  Collection<int, array<string, mixed>>  $appointments
     * @return Collection<int, array<string, mixed>>
     */
    private function summarisePatients(Collection $appointments): Collection
    {
        return $appointments
            ->groupBy('patientKey')
            ->map(fn (Collection $group) => [
                'key' => $group->first()['patientKey'],
                'id' => $group->first()['patientId'],
                'name' => $group->first()['patientName'],
                'initials' => $group->first()['patientInitials'],
                'relation' => $group->first()['patientRelation'],
                'isSelf' => $group->first()['isSelf'],
                'count' => $group->count(),
                'nextDayLabel' => $group->sortBy('sortKey')->first()['dayLabel'],
            ])
            ->sortBy('name')
            ->values();
    }

    /**
     * A stable identity for the person seen. Falls back to the name copied onto
     * the appointment row, because rows booked before `patient_id` was fillable
     * carry no Patient link and must not all collapse into one group.
     */
    private function patientKeyFor(Appointment $a): string
    {
        return $a->patient_id !== null
            ? "patient:{$a->patient_id}"
            : 'name:'.strtolower($this->patientNameFor($a));
    }

    private function patientNameFor(Appointment $a): string
    {
        $name = trim((string) $a->patientRecord?->full_name);

        return $name !== '' ? $name : trim("{$a->first_name} {$a->last_name}");
    }

    private function initialsFor(string $name): string
    {
        $parts = array_values(array_filter(preg_split('/\s+/', trim($name)) ?: []));

        $initials = strtoupper(
            substr($parts[0] ?? '', 0, 1).
            substr($parts[count($parts) - 1] ?? '', 0, 1)
        );

        return $initials !== '' ? $initials : '?';
    }

    /**
     * "9:00 AM" → "09:00", so a day's appointments sort chronologically.
     * An unparseable value sorts last rather than throwing the page.
     */
    private function to24h(?string $time12): string
    {
        if ($time12 === null || trim($time12) === '') {
            return '99:99';
        }

        try {
            return Carbon::parse($time12)->format('H:i');
        } catch (\Throwable) {
            return '99:99';
        }
    }

    /**
     * Which separator the appointment belongs under. `overdue` is a real state,
     * not a rounding error: a request the clinic never actioned keeps its open
     * status while its date slides into the past, and filing that under "Today"
     * is how patients miss it.
     *
     * @return array{bucket: string, dayLabel: string}
     */
    private function whenFor(CarbonInterface $date): array
    {
        $days = (int) Carbon::today()->diffInDays($date->copy()->startOfDay(), false);

        return match (true) {
            $days < 0 => ['bucket' => 'overdue', 'dayLabel' => $date->format('D, d M')],
            $days === 0 => ['bucket' => 'today', 'dayLabel' => 'Today'],
            $days === 1 => ['bucket' => 'tomorrow', 'dayLabel' => 'Tomorrow'],
            $days <= 7 => ['bucket' => 'week', 'dayLabel' => $date->format('l')],
            default => ['bucket' => 'later', 'dayLabel' => $date->format('D, d M Y')],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPastAppointment(Appointment $a): array
    {
        $session = $a->consultationSession;

        return [
            'id' => $a->id,
            'service' => ucwords(str_replace('-', ' ', $a->service)),
            'date' => $a->appointment_date->format('d M Y'),
            'rawDate' => $a->appointment_date->toDateString(),
            'time' => $a->appointment_time,
            'status' => $a->status,
            'coverage' => $a->coverage,
            'patientStatus' => $a->patient_status,
            'cancellationReason' => $a->cancellation_reason,
            'doctor' => $a->doctor_id
                ? ($a->doctor?->doctorProfile?->display_name ?? null)
                : null,
            // Where the patient goes to read who is treating them. Null unless
            // the doctor is currently published — an unpublished profile 404s,
            // and a dead link is worse than no link.
            'doctorProfileUrl' => $a->doctor?->doctorProfile?->is_active
                ? route('doctors.show', ['doctor' => $a->doctor_id])
                : null,
            'soap' => $session ? [
                'subjective' => $session->subjective ?? null,
                'objective' => $session->objective ?? null,
                'assessment' => $session->assessment ?? null,
                'plan' => $session->plan ?? null,
            ] : null,
            'vitals' => $session ? [
                'bloodPressure' => $session->blood_pressure ?? null,
                'heartRate' => $session->heart_rate ?? null,
                'temperature' => $session->temperature ?? null,
                'oxygenSaturation' => $session->oxygen_saturation ?? null,
                'weight' => $session->weight ?? null,
                'height' => $session->height ?? null,
                'source' => $session->vitals_source,
                'sourceLabel' => $session->vitalsSourceLabel(),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAppointment(Appointment $a): array
    {
        $date = $a->appointment_date;
        $record = $a->patientRecord;
        $name = $this->patientNameFor($a);
        $when = $this->whenFor($date);

        return [
            'id' => $a->id,

            // ── Who it is for ────────────────────────────────────────────────
            'patientKey' => $this->patientKeyFor($a),
            'patientId' => $a->patient_id,
            'patientName' => $name,
            'patientInitials' => $this->initialsFor($name),
            'patientRelation' => $record?->relationship_label,
            'isSelf' => $record?->relationship_to_guarantor === 'self',
            'patientAge' => $record?->current_age ?? $a->age,

            // ── When it is ───────────────────────────────────────────────────
            'date' => $date->format('d M Y'),
            'rawDate' => $date->toDateString(),
            'dayLabel' => $when['dayLabel'],
            'bucket' => $when['bucket'],
            'weekday' => strtoupper($date->format('D')),
            'dayNumber' => $date->format('j'),
            'monthShort' => strtoupper($date->format('M')),
            'time' => $a->appointment_time,
            'sortKey' => $date->toDateString().' '.$this->to24h($a->appointment_time),
            'isToday' => $date->isToday(),
            'isTomorrow' => $date->isTomorrow(),
            'isPast' => $when['bucket'] === 'overdue',

            // ── What it is ───────────────────────────────────────────────────
            'service' => ucwords(str_replace('-', ' ', $a->service)),
            'status' => $a->status,
            'coverage' => $a->coverage,
            'hmo' => $a->hmo,
            'patientStatus' => $a->patient_status,
            'consultationType' => $a->consultation_type,

            /*
             * Whether this visit still owes the clinic, and how much.
             *
             * Surfaced HERE, on the page a patient actually opens, and not only
             * on /user/payments. The fee is raised at booking and the booking
             * is released if it lapses — a patient who never thinks to look
             * under "Payments" would discover both at the moment their video
             * room refused to open.
             *
             * Null for every visit that owes nothing, which is every in-person
             * and every covered one. The card renders nothing for null rather
             * than a reassuring "paid" badge on a visit that was never billed.
             */
            'payment' => $a->paymentVerification && ! $a->paymentVerification->isSettled()
                ? [
                    'reference' => $a->paymentVerification->payment_reference,
                    'amountDue' => (float) $a->paymentVerification->amount_due,
                    'status' => $a->paymentVerification->status,
                    'dueAt' => $a->paymentVerification->due_at?->format('d M Y, g:i A'),
                    'isOverdue' => $a->paymentVerification->is_overdue,
                ]
                : null,

            'branch' => $a->branch,
            'additionalInfo' => $a->additional_info,

            // Check-in is a day-of action in production: you cannot arrive at a
            // clinic for a visit three weeks out, and you cannot arrive for one
            // last month. `booking.enforce_checkin_day` relaxes that while the
            // system is being tested against seeded dates — see the config file
            // and checkIn(), which is the half that actually closes the door.
            'canCheckIn' => $a->status === 'confirmed'
                && (! self::enforcesCheckInDay() || $date->isToday()),

            // Cancelling is only meaningful while the visit is still ahead.
            // A date that has passed is the clinic's to close (no_show or
            // completed) — offering the patient "Cancel" there implies they
            // are preventing something that has already failed to happen.
            'canCancel' => in_array($a->status, self::CANCELLABLE_STATUSES, true)
                && $when['bucket'] !== 'overdue',
            // Moving a booking online, same window as cancelling. Needs a
            // doctor, because the new time is picked from their free slots.
            'canReschedule' => in_array($a->status, BookingService::RESCHEDULABLE_STATUSES, true)
                && $when['bucket'] !== 'overdue'
                && $a->doctor_id !== null,
            'doctorId' => $a->doctor_id,
            'doctor' => $a->doctor_id
                ? ($a->doctor?->doctorProfile?->display_name ?? null)
                : null,
            'doctorProfileUrl' => $a->doctor?->doctorProfile?->is_active
                ? route('doctors.show', ['doctor' => $a->doctor_id])
                : null,
        ];
    }
}
