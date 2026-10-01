<?php

namespace App\Http\Controllers\Doctor;

use App\Exceptions\AllergyContraindicationException;
use App\Exceptions\InvalidConsultationTransitionException;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\LabTestResult;
use App\Models\Service;
use App\Services\ConsultationSessionService;
use App\Services\LabResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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
            // consultationSession.prescriptions and patientRecord.allergies are
            // both read by mapAppointment() for every row — without them here
            // the list is two more N+1s across dozens of visits.
            ->with([
                'consultationSession.prescriptions',
                'labResults',
                'patientRecord.allergies',
            ])
            ->orderByDesc('appointment_at');

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
            'vitalsSources' => ConsultationSession::VITALS_SOURCE_LABELS,
        ]);
    }

    /**
     * GET /doctor/consultations/patient-history?email=&exclude_id=
     *
     * Returns the last 20 completed consultations for a patient record.
     *
     * Keyed on `patient_id`, never the appointment email. A guarantor books
     * their children under their own address, so matching on email merged a
     * parent's and a child's SOAP notes, vitals and prescriptions into one
     * history.
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
            'patient_id' => ['required', 'integer'],
            'exclude_id' => ['nullable', 'integer'],
        ]);

        $history = Appointment::where('patient_id', $request->integer('patient_id'))
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
                        'source' => $session->vitals_source,
                        'sourceLabel' => $session->vitalsSourceLabel(),
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
            /*
              Vitals are measurements, and these rules are what make them so.
              All six were `string|max:10`, which accepted `abcdefghij` as a
              heart rate — in the clinical record, with nothing downstream to
              catch it. The columns stay strings (they hold `120/80`, and
              existing rows are not being rewritten); the rules are what
              decide what may be written to them from now on.

              The bounds are survivable-extreme rather than normal: a fever of
              41.5 and a newborn's 2.4 kg both have to be recordable, so these
              reject typos, not findings. The narrower ranges the doctor sees
              in the form are hints for the same reason.
            */
            'vitals[bloodPressure]' => ['nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            'vitals[heartRate]' => ['nullable', 'integer', 'between:20,300'],
            'vitals[temperature]' => ['nullable', 'numeric', 'between:20,45'],
            'vitals[oxygenSaturation]' => ['nullable', 'integer', 'between:1,100'],
            'vitals[weight]' => ['nullable', 'numeric', 'between:0.3,400'],
            'vitals[height]' => ['nullable', 'numeric', 'between:20,250'],
            // Where the numbers came from. Nullable because the in-person
            // session editor may omit it; the service then keeps whatever the
            // row already carries rather than relabelling it.
            'vitals[source]' => ['nullable', Rule::in(ConsultationSession::VITALS_SOURCES)],
            'finalize' => ['nullable', 'string'],

            // Prescriptions. `name` is required *per row* rather than overall,
            // because the editor can hold an empty draft row the doctor has not
            // filled in yet; blank rows are dropped in the service. Lengths
            // match the columns, which are TEXT since the encryption migration.
            'medications' => ['nullable', 'array', 'max:50'],
            'medications.*.name' => ['nullable', 'string', 'max:255'],
            'medications.*.instructions' => ['nullable', 'string', 'max:500'],

            // The acknowledgement that lets a prescription through despite a
            // recorded allergy. A minimum length because "ok" is not a clinical
            // justification, and this text is what an incident review reads.
            'allergyOverrideReason' => ['nullable', 'string', 'min:10', 'max:500'],
        ], [
            'vitals[bloodPressure].regex' => 'Blood pressure must look like 120/80.',
        ], [
            // Custom attribute names, not custom messages: otherwise every
            // failure here reads "The vitals[heartRate] field must be an
            // integer" — the payload's key, not the box the doctor typed in.
            // Laravel then builds the rest of each sentence itself, so the
            // bounds in the message can never drift from the bounds above.
            'vitals[heartRate]' => 'heart rate',
            'vitals[temperature]' => 'temperature',
            'vitals[oxygenSaturation]' => 'oxygen saturation',
            'vitals[weight]' => 'weight',
            'vitals[height]' => 'height',
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
            'source' => $request->input('vitals[source]'),
        ];

        // The transitions and their guards live in the service — a finalized
        // note can no longer be reopened by a later draft save, and only a
        // checked-in or in-progress appointment can be completed. Both were
        // unguarded when this lived inline here.
        $medications = collect($request->input('medications', []))
            ->map(fn ($m) => [
                'name' => is_array($m) ? (string) ($m['name'] ?? '') : '',
                'instructions' => is_array($m) ? (string) ($m['instructions'] ?? '') : '',
            ])
            ->all();

        $overrideReason = $request->filled('allergyOverrideReason')
            ? trim((string) $request->input('allergyOverrideReason'))
            : null;

        try {
            $finalize
                ? $this->sessions->finalize($appointment, Auth::user(), $soap, $vitals, $medications, $overrideReason)
                : $this->sessions->saveNotes($appointment, Auth::user(), $soap, $vitals, $medications, $overrideReason);
        } catch (InvalidConsultationTransitionException $e) {
            return back()->withErrors(['consultation' => $e->getMessage()]);
        } catch (AllergyContraindicationException $e) {
            // Flashed rather than thrown as a validation error because the UI
            // has to render the detail — which allergen, how severe, what the
            // reaction was — and then offer an explicit acknowledgement. A bare
            // "this failed" message would leave the doctor unable to see what
            // matched or to proceed when they judge it safe.
            //
            // Both are sent on purpose. `withErrors` keeps a plain message for
            // any caller that is not the session editor, and it also makes
            // Inertia route the response to the visit's onError handler — so
            // the editor must NOT read these conflicts in onSuccess alone, or
            // the refusal is silent. It reads them from the shared flash prop
            // instead, which arrives either way.
            return back()
                ->withErrors(['consultation' => $e->getMessage()])
                ->with('allergyConflicts', $e->conflicts);
        }

        return back()->with('success', $finalize ? 'Consultation finalized.' : 'Session saved.');
    }

    /**
     * The doctor's half of the check-in handshake: `checked_in -> in_progress`.
     *
     * The patient starts a consultation, not the doctor — they check in from
     * their own dashboard on the day, which is the only thing that produces
     * `checked_in`. This endpoint is what the doctor's "Start" button posts
     * when they open the visit, and the guard below is the rule: there is no
     * transition into a consultation from any other state, so a visit cannot be
     * conjured into existence from this side.
     *
     * Idempotent from `in_progress` on purpose. The consultations list fires
     * this as the session editor opens, and a double-click — or a second click
     * landing before the refreshed props arrive — would otherwise throw a 422
     * error page over the top of a chart the doctor is already writing in.
     * `openVirtualRoom()` and `markActive()` carry the same property for the
     * same reason.
     */
    public function start(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);

        if ($appointment->status === 'in_progress') {
            return back();
        }

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
                'patientRecordId' => $appointment->patient_id,
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
                // Never blank on this page: the room is only reachable for a
                // virtual session, whose honest default is patient-reported.
                'source' => $session->vitals_source ?? $session->defaultVitalsSource(),
            ],
            // The vocabulary, server-owned, so the select and the validator can
            // never drift apart.
            'vitalsSources' => ConsultationSession::VITALS_SOURCE_LABELS,
            // Prescribing and lab orders from inside the call.
            ...$this->prescribingContext(
                $appointment->loadMissing(['patientRecord.allergies', 'labResults']),
                $session->loadMissing('prescriptions'),
            ),
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
            // The service booked. The column used to be headed "Diagnosis"
            // while showing this, which read as a clinical finding.
            'diagnosis' => $this->labelForService($a->service),
            // The doctor's own assessment once written, shown under it.
            'assessment' => $session?->assessment ? Str::limit($session->assessment, 80) : null,
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
            'patientRecordId' => $a->patient_id,
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
                'source' => $session->vitals_source ?? $session->defaultVitalsSource(),
                'sourceLabel' => $session->vitalsSourceLabel(),
            ] : null,

            /*
             * What the patient told us at sign-up, shown beside the vitals form
             * as a reference line — NOT loaded into the inputs.
             *
             * These figures were captured once, by the patient, possibly years
             * ago. Vitals are measured, so pre-filling the boxes would let a
             * self-reported number be saved as today's measurement. Until now
             * the opposite problem applied: the registration figures existed but
             * were never shown to the clinician anywhere, so a weight recorded
             * at sign-up was invisible at the only moment it is useful — as a
             * baseline to compare today's reading against.
             */
            'baseline' => $this->baselineFor($a),
            ...$this->prescribingContext($a, $session),
        ];
    }

    /**
     * Prescriptions, the allergy list and lab orders — what a doctor needs to
     * prescribe and order tests. Shared by the in-person editor and the video
     * room, which previously had no way to do either.
     *
     * @return array{prescriptions: mixed, allergies: mixed, labs: mixed}
     */
    private function prescribingContext(Appointment $a, ?ConsultationSession $session): array
    {
        return [
            // Was hardcoded `[]`, so the editor never received the medications
            // already on a session — which went unnoticed because nothing could
            // write one either.
            'prescriptions' => $session
                ? $session->prescriptions->map(fn ($p) => [
                    'id' => (string) $p->id,
                    'name' => $p->name,
                    'instructions' => $p->instructions ?? '',
                ])->values()
                : [],
            // The chart's allergy list, sent so the prescriber sees it while
            // prescribing rather than after the server refuses the save. The
            // server-side check in ConsultationSessionService is the guarantee;
            // this is what stops the doctor writing a script they cannot save.
            'allergies' => $a->patientRecord
                ? $a->patientRecord->allergies->map(fn ($allergy) => [
                    'allergen' => $allergy->allergen,
                    'severity' => $allergy->severity,
                    'reaction' => $allergy->reaction,
                ])->values()
                : [],
            'labs' => $a->labResults->map(fn (LabTestResult $lab) => [
                'id' => (string) $lab->id,
                'testName' => $lab->test_name,
                'status' => $lab->status,
                'severity' => $lab->severity,
                'requestedAt' => $lab->requested_at?->format('d M Y, g:i A'),
            ])->values(),
        ];
    }

    /**
     * The patient's self-reported height and weight from registration.
     *
     * Null when nothing was captured, so the UI can leave the line out rather
     * than print an empty label.
     *
     * @return array{height: string|null, weight: string|null, source: string}|null
     */
    private function baselineFor(Appointment $a): ?array
    {
        $medical = $a->patient?->medical;

        if ($medical === null) {
            return null;
        }

        // Trim the stored decimal scale: these are read as "160 cm · 55 kg" on
        // one line, and "160.00 cm · 55.00 kg" is noise at that size.
        $trim = fn (?string $value) => $value === null
            ? null
            : rtrim(rtrim($value, '0'), '.');

        $height = $medical->height !== null ? $trim((string) $medical->height) : null;
        $weight = $medical->weight !== null ? $trim((string) $medical->weight) : null;

        if ($height === null && $weight === null) {
            return null;
        }

        return [
            'height' => $height,
            'weight' => $weight,
            'source' => 'Self-reported at registration',
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
        // Keyed by the seeded slugs. A service an administrator adds later
        // falls through to the house blue rather than going uncoloured — a
        // colour is decoration, and it is not worth a column on `services`.
        return match ($service) {
            'general' => '#475569', 'internal-medicine' => '#7c3aed',
            'pediatrics' => '#0891b2', 'ob-gyne' => '#db2777',
            'cardiology' => '#16a34a', 'dermatology' => '#0056b3',
            'orthopedics' => '#059669', 'preventive-care' => '#0284c7',
            'laboratory' => '#ca8a04', 'imaging' => '#00a8e8',
            'physical-therapy' => '#dc2626',
            default => '#0056b3',
        };
    }

    /**
     * The patient-facing name of a service, from the one place it is declared.
     *
     * This was a fifth hand-written copy of the service labels. It was missing
     * internal medicine, orthopedics and preventive care, so each of those fell
     * through to `ucfirst()` and appeared on the doctor's list as
     * "Internal-medicine" — and it still called the general clinic "General
     * Consultation" after the rest of the app had settled on
     * "General / Family Medicine".
     *
     * The fallback stays for rows written before the catalogue existed: seeded
     * appointments once stored prose ("Wound Care", "ECG") in this column.
     *
     * `Service::labelFor()` searches the whole table rather than the bookable
     * subset on purpose — a consultation finished last month must keep its
     * service name on screen after the clinic retires that service.
     */
    private function labelForService(string $service): string
    {
        return Service::labelFor($service)
            ?? ucfirst(str_replace('-', ' ', $service));
    }
}
