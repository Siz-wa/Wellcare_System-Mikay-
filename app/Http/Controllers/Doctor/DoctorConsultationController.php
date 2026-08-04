<?php

namespace App\Http\Controllers\Doctor;

use App\Exceptions\InvalidConsultationTransitionException;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Services\ConsultationSessionService;
use App\Services\LabResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DoctorConsultationController extends Controller
{
    private const CONSULTATION_STATUSES = ['checked_in', 'in_progress', 'completed'];

    public function __construct(private ConsultationSessionService $sessions) {}

    public function index(Request $request): Response
    {
        $doctorId = Auth::id();
        $query = Appointment::where('doctor_id', $doctorId)
            ->whereIn('status', self::CONSULTATION_STATUSES)
            // labResults is eager-loaded because mapAppointment() reads it for
            // every row — without this the list is an N+1 across dozens of visits.
            ->with(['consultationSession', 'labResults'])
            ->orderByDesc('appointment_date')
            ->orderByDesc('appointment_time');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                    ->orWhere('service', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            if (in_array($status, self::CONSULTATION_STATUSES, true)) {
                $query->where('status', $status);
            }
        }

        return Inertia::render('doctor/consultations/consultations', [
            'consultations' => $query->get()->map(fn (Appointment $a) => $this->mapAppointment($a)),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
            ],
        ]);
    }

    /**
     * GET /doctor/consultations/patient-history?email=&exclude_id=
     *
     * Returns the last 20 completed consultations for a patient (by email).
     * Called via fetch() from the frontend — no page navigation.
     * No new table needed; queries existing appointments + consultation_sessions.
     *
     * Scoped to the signed-in doctor's own completed appointments. Without the
     * `doctor_id` clause the only inputs are an email address and the
     * `role:doctor` middleware, so any doctor could read any patient's last 20
     * SOAP notes, vitals and prescriptions by guessing or copying an address —
     * `role:doctor` says a user is *a* doctor, never that they are *this
     * patient's* doctor. Same distinction the consultation room's channel
     * authorization rests on.
     *
     * The narrowing is deliberate and has a cost: a patient seen by a colleague
     * last month now shows no history here. That is the correct default for a
     * record this endpoint exposes in full; widening it needs a referral or
     * care-team concept the schema does not have.
     */
    public function patientHistory(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'exclude_id' => ['nullable', 'integer'],
        ]);

        $history = Appointment::where('email', $request->string('email')->toString())
            ->where('doctor_id', Auth::id())
            ->where('status', 'completed')
            ->when(
                $request->integer('exclude_id'),
                fn ($q, $id) => $q->where('id', '!=', $id)
            )
            ->with('consultationSession')
            ->orderByDesc('appointment_date')
            ->limit(20)
            ->get()
            ->map(function (Appointment $a) {
                $session = $a->consultationSession;

                return [
                    'id' => $a->id,
                    'date' => $a->appointment_date->format('d M Y'),
                    'time' => $a->appointment_time,
                    'service' => $this->labelForService($a->service),
                    'coverage' => $a->coverage,
                    'soap' => $session ? [
                        'subjective' => $session->subjective ?? '',
                        'objective' => $session->objective ?? '',
                        'assessment' => $session->assessment ?? '',
                        'plan' => $session->plan ?? '',
                    ] : null,
                    'vitals' => $session ? [
                        'bloodPressure' => $session->blood_pressure ?? '',
                        'heartRate' => $session->heart_rate ?? '',
                        'temperature' => $session->temperature ?? '',
                        'oxygenSaturation' => $session->oxygen_saturation ?? '',
                        'weight' => $session->weight ?? '',
                        'height' => $session->height ?? '',
                    ] : null,
                    'prescriptions' => $session
                        ? $session->prescriptions->map(fn ($p) => [
                            'name' => $p->name,
                            'instructions' => $p->instructions,
                        ])->toArray()
                        : [],
                ];
            });

        return response()->json(['history' => $history]);
    }

    public function saveSession(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);
        $request->validate([
            'soap[subjective]' => ['nullable', 'string', 'max:5000'],
            'soap[objective]' => ['nullable', 'string', 'max:5000'],
            'soap[assessment]' => ['nullable', 'string', 'max:5000'],
            'soap[plan]' => ['nullable', 'string', 'max:5000'],
            'vitals[bloodPressure]' => ['nullable', 'string', 'max:20'],
            'vitals[heartRate]' => ['nullable', 'string', 'max:10'],
            'vitals[temperature]' => ['nullable', 'string', 'max:10'],
            'vitals[oxygenSaturation]' => ['nullable', 'string', 'max:10'],
            'vitals[weight]' => ['nullable', 'string', 'max:10'],
            'vitals[height]' => ['nullable', 'string', 'max:10'],
            'finalize' => ['nullable', 'string'],
        ]);

        $finalize = $request->input('finalize') === '1';

        // Bracket-literal keys are how the React session editor posts these —
        // `soap[subjective]` is a flat field name, not a nested array — so they
        // are read the same way and reshaped here for the service.
        $soap = [
            'subjective' => $request->input('soap[subjective]'),
            'objective' => $request->input('soap[objective]'),
            'assessment' => $request->input('soap[assessment]'),
            'plan' => $request->input('soap[plan]'),
        ];

        $vitals = [
            'bloodPressure' => $request->input('vitals[bloodPressure]'),
            'heartRate' => $request->input('vitals[heartRate]'),
            'temperature' => $request->input('vitals[temperature]'),
            'oxygenSaturation' => $request->input('vitals[oxygenSaturation]'),
            'weight' => $request->input('vitals[weight]'),
            'height' => $request->input('vitals[height]'),
        ];

        // The transitions and their guards live in the service — a finalized
        // note can no longer be reopened by a later draft save, and only a
        // checked-in or in-progress appointment can be completed. Both were
        // unguarded when this lived inline here.
        try {
            $finalize
                ? $this->sessions->finalize($appointment, Auth::user(), $soap, $vitals)
                : $this->sessions->saveNotes($appointment, Auth::user(), $soap, $vitals);
        } catch (InvalidConsultationTransitionException $e) {
            return back()->withErrors(['consultation' => $e->getMessage()]);
        }

        return back()->with('success', $finalize ? 'Consultation finalized.' : 'Session saved.');
    }

    public function start(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);
        abort_if($appointment->status !== 'checked_in', 422);
        $appointment->update(['status' => 'in_progress']);

        return back()->with('success', 'Consultation started.');
    }

    /**
     * Open the video room and send the doctor into it.
     *
     * A POST, not a GET on the room page, because this MINTS a room_id and
     * writes clinical state. A GET that writes means a refresh, a link
     * prefetch or a browser preconnect creates rows. `start()` above stays as
     * the in-person equivalent — overloading it would have coupled the two
     * paths and broken the one test that covers it.
     */
    public function startVirtual(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);

        try {
            $this->sessions->openVirtualRoom($appointment, Auth::user());
        } catch (InvalidConsultationTransitionException $e) {
            return back()->withErrors(['consultation' => $e->getMessage()]);
        }

        return redirect()->route('doctor.consultations.room', $appointment->id);
    }

    /**
     * The full-page video console — video on one side, SOAP and vitals on the
     * other.
     *
     * A dedicated page rather than a tab inside the existing session-editor
     * modal: that modal unmounts on Escape, which would tear down the
     * RTCPeerConnection and drop the call every time the doctor hit the key.
     */
    public function room(Appointment $appointment): Response|RedirectResponse
    {
        $this->authorizeDoctor($appointment);

        $session = $appointment->consultationSession;

        // No room yet, or the last call was closed. Back to the list with a
        // reason, not a 404 — the doctor reaches this by refreshing after their
        // own End Call or by pressing back, and a bare error page gave them no
        // route onward and no idea whether they had broken something. The list
        // is one click from reopening the room, which is what they want next.
        if ($session === null || ! $session->isLive()) {
            return redirect()
                ->route('doctor.consultations')
                ->with('error', 'That video room is closed. Start the video consultation again to reopen it.');
        }

        $appointment->loadMissing('patientRecord');

        return Inertia::render('doctor/consultations/room/room', [
            'appointment' => [
                'id' => $appointment->id,
                'patient' => trim($appointment->first_name.' '.$appointment->last_name),
                'service' => $this->labelForService($appointment->service),
                'date' => $appointment->appointment_date->format('d M Y'),
                'time' => $appointment->appointment_time,
                'age' => $appointment->age,
                'gender' => $appointment->gender,
            ],
            'room' => [
                'id' => $session->room_id,
                'status' => $session->consultation_status,
                'startedAt' => $session->started_at?->toISOString(),
            ],
            'soap' => [
                'subjective' => $session->subjective ?? '',
                'objective' => $session->objective ?? '',
                'assessment' => $session->assessment ?? '',
                'plan' => $session->plan ?? '',
            ],
            'vitals' => [
                'bloodPressure' => $session->blood_pressure ?? '',
                'heartRate' => $session->heart_rate ?? '',
                'temperature' => $session->temperature ?? '',
                'oxygenSaturation' => $session->oxygen_saturation ?? '',
                'weight' => $session->weight ?? '',
                'height' => $session->height ?? '',
            ],
            // The doctor always creates the offer. A fixed initiator is what
            // lets the hook skip full perfect-negotiation: true glare cannot
            // occur when only one side ever offers.
            'isInitiator' => true,
            'selfUserId' => Auth::id(),
            'iceServers' => $this->sessions->iceServers(),
            'reverb' => $this->reverbConfig(),
            /*
             * The CSRF token as a prop, because the room is the only place in
             * this app that cannot read it from the DOM.
             *
             * `resources/views/app.blade.php` renders <meta name="csrf-token">
             * once per full document load. Inertia swaps the page component and
             * never re-renders <head>, and logging in regenerates the session
             * token — so from the first client-side navigation onward that meta
             * tag holds a token the session no longer accepts. Every other POST
             * in the app survives this because Inertia posts through axios,
             * which reads the XSRF-TOKEN *cookie* that Laravel refreshes on
             * every response.
             *
             * The room is reached by `router.post(.../start-virtual)` followed
             * by a redirect — a client-side navigation — and its signalling is
             * raw fetch() plus laravel-echo, both of which read that meta tag.
             * Both therefore 419'd on every call: the HTTP relay dropped the
             * offer and every ICE candidate, and /broadcasting/auth refused the
             * subscribe, so the two peers never exchanged anything and each sat
             * on "Waiting for the other person".
             *
             * A prop is re-rendered on every visit, so it cannot go stale.
             */
            'csrfToken' => csrf_token(),
        ]);
    }

    /**
     * Reverb connection details for Echo.
     *
     * Passed as a page prop rather than read from `import.meta.env` in the
     * bundle: the values stay server-authoritative, and the SSR entry never
     * touches browser-only config. Only the two room pages need it, so it is
     * not shared globally on every request.
     *
     * @return array<string, mixed>
     */
    private function reverbConfig(): array
    {
        return [
            'key' => config('reverb.apps.apps.0.key'),
            'host' => config('reverb.apps.apps.0.options.host'),
            'port' => (int) config('reverb.apps.apps.0.options.port'),
            'scheme' => config('reverb.apps.apps.0.options.scheme'),
        ];
    }

    /**
     * Mark an in-progress visit complete from the consultations list.
     *
     * Must close any live video room on the way out. Completing the appointment
     * makes mayJoinRoom() fail its "visit still open" gate, but the session row
     * stays `waiting`/`active` — so `isLive()` remained true, the room page went
     * on rendering, the patient's list went on offering a "Join Call" button,
     * and the console it opened could never connect. `finalize()` has always got
     * this right; this is the same transition through a different door.
     */
    public function complete(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);
        abort_if($appointment->status !== 'in_progress', 422);

        $session = $appointment->consultationSession;

        if ($session !== null) {
            $this->sessions->endCall($session);
        }

        $appointment->update(['status' => 'completed']);

        return back()->with('success', 'Consultation completed.');
    }

    /**
     * DFD process 5's "lab test request" arrow — the doctor orders a test during
     * consultation and it lands in the nurse's queue.
     */
    public function requestLab(
        Request $request,
        Appointment $appointment,
        LabResultService $labResults,
    ): RedirectResponse {
        $this->authorizeDoctor($appointment);

        $validated = $request->validate([
            'test_name' => ['required', 'string', 'max:150'],
        ], [
            'test_name.required' => 'Please name the test you are requesting.',
        ]);

        // patientRecord() is the Patient (the person seen); patient() is the
        // booking account. Lab results belong to the person, not the account.
        $patient = $appointment->patientRecord;

        abort_if(
            $patient === null,
            422,
            'This appointment has no patient record attached, so a lab test cannot be ordered.'
        );

        $labResults->request(
            $patient,
            Auth::user(),
            $validated['test_name'],
            $appointment,
        );

        return back()->with('success', "{$validated['test_name']} requested. The lab team has been notified.");
    }

    private function mapAppointment(Appointment $a): array
    {
        $session = $a->consultationSession;

        return [
            'id' => $a->id,
            'patientId' => 'C-'.str_pad($a->id, 3, '0', STR_PAD_LEFT),
            'patient' => trim($a->first_name.' '.$a->last_name),
            'initials' => strtoupper(substr($a->first_name, 0, 1).substr($a->last_name, 0, 1)),
            'color' => $this->colorForService($a->service),
            'date' => $a->appointment_date->format('d M Y'),
            'time' => $a->appointment_time,
            'diagnosis' => $this->labelForService($a->service),
            'status' => $this->mapStatus($a->status),
            'rawStatus' => $a->status,
            'consultationType' => $a->consultation_type,
            // Drives the "Start Video" / "Rejoin" button in the table. Mirrors
            // the same window openVirtualRoom() enforces, so the button is not
            // offered for a state the service would reject.
            'canStartVideo' => $a->isVirtual() && $a->isInConsultation(),
            'roomIsLive' => (bool) $a->consultationSession?->isLive(),
            'coverage' => $a->coverage,
            'patientStatus' => $a->patient_status,
            'additionalInfo' => $a->additional_info,
            'email' => $a->email,
            'contactNumber' => $a->contact_number,
            'age' => $a->age,
            'gender' => $a->gender,
            'sessionId' => $session?->id,
            'soap' => $session ? [
                'subjective' => $session->subjective ?? '',
                'objective' => $session->objective ?? '',
                'assessment' => $session->assessment ?? '',
                'plan' => $session->plan ?? '',
            ] : null,
            'vitals' => $session ? [
                'bloodPressure' => $session->blood_pressure ?? '',
                'heartRate' => $session->heart_rate ?? '',
                'temperature' => $session->temperature ?? '',
                'oxygenSaturation' => $session->oxygen_saturation ?? '',
                'weight' => $session->weight ?? '',
                'height' => $session->height ?? '',
            ] : null,
            'prescriptions' => [],
            'labs' => $a->labResults->map(fn (LabTestResult $lab) => [
                'id' => (string) $lab->id,
                'testName' => $lab->test_name,
                'status' => $lab->status,
                'severity' => $lab->severity,
                'requestedAt' => $lab->requested_at?->format('d M Y, g:i A'),
            ])->values(),
        ];
    }

    private function authorizeDoctor(Appointment $appointment): void
    {
        abort_if($appointment->doctor_id !== Auth::id(), 403);
    }

    private function mapStatus(string $status): string
    {
        return match ($status) {
            'checked_in' => 'in-progress',
            'in_progress' => 'in-progress',
            'completed' => 'finalized',
            default => 'draft',
        };
    }

    private function colorForService(string $service): string
    {
        return match ($service) {
            'dermatology' => '#0056b3', 'psychiatry' => '#7c3aed',
            'pediatrics' => '#0891b2', 'cardiology' => '#16a34a',
            'ob-gyne' => '#db2777', 'general' => '#475569',
            'laboratory' => '#ca8a04', 'imaging' => '#00a8e8',
            'physical-therapy' => '#dc2626',
            default => '#0056b3',
        };
    }

    private function labelForService(string $service): string
    {
        return match ($service) {
            'general' => 'General Consultation',
            'cardiology' => 'Cardiology',
            'dermatology' => 'Dermatology',
            'pediatrics' => 'Pediatrics',
            'ob-gyne' => 'OB-Gyne',
            'laboratory' => 'Laboratory Services',
            'imaging' => 'Imaging / Radiology',
            'physical-therapy' => 'Physical Therapy',
            default => ucfirst($service),
        };
    }
}
