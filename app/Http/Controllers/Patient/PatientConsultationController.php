<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\ConsultationSessionService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The patient's side of a video consultation — Figure 11's "Consultation
 * Interface / Session Access" and Figure 4's "Online Consultation".
 *
 * Scoped on `appointments.user_id`, NOT `patients.guarantor_id`, and this is a
 * deliberate departure from the rule the rest of the patient portal follows.
 *
 * The portal's *list* pages (records, lab results, LOA status) answer "which
 * people's longitudinal records may this account read?" and must scope on
 * `guarantor_id`, because `user_id` is shared between siblings and would leak
 * one family member's data to another.
 *
 * A consultation room is a different question: "may this account act on THIS
 * ONE visit?" Patient::findOrCreateFromBooking() sets `guarantor_id` only when
 * the patient row is first created and never updates it, so when a second
 * account books for the same person the appointment carries `user_id = B`
 * while `guarantor_id` is still A. Scoping here on `guarantor_id` would admit
 * A — who has no connection to that appointment — into B's live consultation,
 * and lock B, who booked it and checked in through it, out. Every other
 * appointment-level action in this app (checkIn, cancel, show, confirmation)
 * already uses `user_id` for the same reason.
 */
class PatientConsultationController extends Controller
{
    public function __construct(private ConsultationSessionService $sessions) {}

    /**
     * List the appointments this account may join right now.
     *
     * Only live rooms appear. A patient with nothing waiting sees an empty
     * state rather than a list of past calls — this page is a door, not a
     * history, and the visit history already lives on the dashboard.
     */
    public function index(): Response
    {
        $appointments = Appointment::query()
            ->where('user_id', Auth::id())
            ->where('consultation_type', 'virtual')
            ->whereHas('consultationSession', fn ($q) => $q
                ->where('mode', 'virtual')
                ->whereIn('consultation_status', ['waiting', 'active'])
                ->where('status', '!=', 'finalized')
            )
            ->with(['consultationSession', 'doctor.doctorProfile'])
            ->orderBy('appointment_date')
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'service' => ucwords(str_replace('-', ' ', $a->service)),
                'date' => $a->appointment_date->format('d M Y'),
                'time' => $a->appointment_time,
                'doctor' => $a->doctor?->doctorProfile?->display_name,
                'status' => $a->consultationSession->consultation_status,
                'startedAt' => $a->consultationSession->started_at?->toISOString(),
            ]);

        return Inertia::render('user/consultations/consultations', [
            'consultations' => $appointments->values(),
        ]);
    }

    /**
     * The join page — the patient's half of the video room.
     *
     * The patient always ANSWERS; the doctor always offers. A fixed initiator
     * means true glare cannot happen, which is what lets the hook skip full
     * perfect-negotiation rather than half-implementing it.
     */
    public function room(Appointment $appointment): Response
    {
        abort_if($appointment->user_id !== Auth::id(), 403);

        $session = $appointment->consultationSession;

        // A closed room is a destination, not an error.
        //
        // This used to abort(404), and the 404 was reached by the most ordinary
        // sequence there is: the call ends, the patient presses back or reloads,
        // and the visit has simultaneously disappeared from their consultations
        // list — which only shows live rooms. A patient whose connection dropped
        // mid-consultation therefore had no route back in and nothing on screen
        // to tell them whether the visit was over or their phone had broken.
        //
        // Still never renders the video console for a dead room: a page that
        // connects to nothing is the hardest failure to diagnose from a phone.
        $closedBecause = match (true) {
            $session === null => 'not_open',
            $session->isFinalized() => 'finalized',
            ! $session->isLive() => 'ended',
            default => null,
        };

        if ($closedBecause !== null) {
            return Inertia::render('user/consultations/closed', [
                'appointment' => $this->appointmentProps($appointment),
                'reason' => $closedBecause,
            ]);
        }

        return Inertia::render('user/consultations/room', [
            'appointment' => $this->appointmentProps($appointment),
            'room' => [
                'id' => $session->room_id,
                'status' => $session->consultation_status,
            ],
            'isInitiator' => false,
            'selfUserId' => Auth::id(),
            'iceServers' => $this->sessions->iceServers(),
            // See the docblock on DoctorConsultationController::room().
            'csrfToken' => csrf_token(),
            'reverb' => [
                'key' => config('reverb.apps.apps.0.key'),
                'host' => config('reverb.apps.apps.0.options.host'),
                'port' => (int) config('reverb.apps.apps.0.options.port'),
                'scheme' => config('reverb.apps.apps.0.options.scheme'),
            ],
        ]);
    }

    /**
     * The visit header, shared by the live room and the closed-room page.
     *
     * @return array<string, mixed>
     */
    private function appointmentProps(Appointment $appointment): array
    {
        return [
            'id' => $appointment->id,
            'service' => ucwords(str_replace('-', ' ', $appointment->service)),
            'date' => $appointment->appointment_date->format('d M Y'),
            'time' => $appointment->appointment_time,
            'doctor' => $appointment->doctor?->doctorProfile?->display_name,
        ];
    }
}
