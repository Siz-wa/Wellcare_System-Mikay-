<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\ConsultationPrescription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DoctorConsultationController extends Controller
{
    private const CONSULTATION_STATUSES = ['checked_in', 'in_progress', 'completed'];

    public function index(Request $request): Response
    {
        $doctorId = Auth::id();
        $query    = Appointment::where('doctor_id', $doctorId)
            ->whereIn('status', self::CONSULTATION_STATUSES)
            ->with('consultationSession.prescriptions')
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
            'filters'       => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
            ],
        ]);
    }

    /**
     * GET /dashboard/consultations/patient-history?email=&exclude_id=
     *
     * Returns the last 20 completed consultations for a patient (by email).
     * Called via fetch() from the frontend — no page navigation.
     * No new table needed; queries existing appointments + consultation_sessions.
     */
    public function patientHistory(Request $request): JsonResponse
    {
        $request->validate([
            'email'      => ['required', 'email'],
            'exclude_id' => ['nullable', 'integer'],
        ]);

        $history = Appointment::where('email', $request->string('email')->toString())
            ->where('status', 'completed')
            ->when(
                $request->integer('exclude_id'),
                fn ($q, $id) => $q->where('id', '!=', $id)
            )
            ->with('consultationSession.prescriptions')
            ->orderByDesc('appointment_date')
            ->limit(20)
            ->get()
            ->map(function (Appointment $a) {
                $session = $a->consultationSession;
                return [
                    'id'      => $a->id,
                    'date'    => $a->appointment_date->format('d M Y'),
                    'time'    => $a->appointment_time,
                    'service' => $this->labelForService($a->service),
                    'coverage'=> $a->coverage,
                    'soap'    => $session ? [
                        'subjective' => $session->subjective ?? '',
                        'objective'  => $session->objective  ?? '',
                        'assessment' => $session->assessment ?? '',
                        'plan'       => $session->plan       ?? '',
                    ] : null,
                    'vitals'  => $session ? [
                        'bloodPressure'    => $session->blood_pressure    ?? '',
                        'heartRate'        => $session->heart_rate        ?? '',
                        'temperature'      => $session->temperature       ?? '',
                        'oxygenSaturation' => $session->oxygen_saturation ?? '',
                        'weight'           => $session->weight            ?? '',
                        'height'           => $session->height            ?? '',
                    ] : null,
                    'prescriptions' => $session
                        ? $session->prescriptions->map(fn ($p) => [
                            'name'         => $p->name,
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
            'soap[subjective]'         => ['nullable', 'string', 'max:5000'],
            'soap[objective]'          => ['nullable', 'string', 'max:5000'],
            'soap[assessment]'         => ['nullable', 'string', 'max:5000'],
            'soap[plan]'               => ['nullable', 'string', 'max:5000'],
            'vitals[bloodPressure]'    => ['nullable', 'string', 'max:20'],
            'vitals[heartRate]'        => ['nullable', 'string', 'max:10'],
            'vitals[temperature]'      => ['nullable', 'string', 'max:10'],
            'vitals[oxygenSaturation]' => ['nullable', 'string', 'max:10'],
            'vitals[weight]'           => ['nullable', 'string', 'max:10'],
            'vitals[height]'           => ['nullable', 'string', 'max:10'],
            'medications'              => ['nullable', 'string'],
            'finalize'                 => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($request, $appointment) {
            $finalize    = $request->input('finalize') === '1';
            $medications = json_decode($request->input('medications', '[]'), true) ?? [];

            $session = ConsultationSession::updateOrCreate(
                ['appointment_id' => $appointment->id],
                [
                    'doctor_id'         => Auth::id(),
                    'subjective'        => $request->input('soap[subjective]'),
                    'objective'         => $request->input('soap[objective]'),
                    'assessment'        => $request->input('soap[assessment]'),
                    'plan'              => $request->input('soap[plan]'),
                    'blood_pressure'    => $request->input('vitals[bloodPressure]'),
                    'heart_rate'        => $request->input('vitals[heartRate]'),
                    'temperature'       => $request->input('vitals[temperature]'),
                    'oxygen_saturation' => $request->input('vitals[oxygenSaturation]'),
                    'weight'            => $request->input('vitals[weight]'),
                    'height'            => $request->input('vitals[height]'),
                    'status'            => $finalize ? 'finalized' : 'draft',
                ]
            );

            $session->prescriptions()->delete();
            foreach ($medications as $med) {
                ConsultationPrescription::create([
                    'session_id'   => $session->id,
                    'name'         => $med['name']         ?? '',
                    'instructions' => $med['instructions'] ?? '',
                ]);
            }

            if ($finalize) {
                $appointment->update(['status' => 'completed']);
                if ($finalize) {
                    app(\App\Services\NotificationService::class)->consultationFinalized($appointment);
                }
            } elseif ($appointment->status === 'checked_in') {
                $appointment->update(['status' => 'in_progress']);
            }
        });

        return back()->with('success', $request->input('finalize') === '1' ? 'Consultation finalized.' : 'Session saved.');
    }

    public function start(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);
        abort_if($appointment->status !== 'checked_in', 422);
        $appointment->update(['status' => 'in_progress']);
        return back()->with('success', 'Consultation started.');
    }

    public function complete(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);
        abort_if($appointment->status !== 'in_progress', 422);
        $appointment->update(['status' => 'completed']);
        return back()->with('success', 'Consultation completed.');
    }

    private function mapAppointment(Appointment $a): array
    {
        $session = $a->consultationSession;
        return [
            'id'             => $a->id,
            'patientId'      => 'C-' . str_pad($a->id, 3, '0', STR_PAD_LEFT),
            'patient'        => trim($a->first_name . ' ' . $a->last_name),
            'initials'       => strtoupper(substr($a->first_name, 0, 1) . substr($a->last_name, 0, 1)),
            'color'          => $this->colorForService($a->service),
            'date'           => $a->appointment_date->format('d M Y'),
            'time'           => $a->appointment_time,
            'diagnosis'      => $this->labelForService($a->service),
            'status'         => $this->mapStatus($a->status),
            'rawStatus'      => $a->status,
            'coverage'       => $a->coverage,
            'patientStatus'  => $a->patient_status,
            'additionalInfo' => $a->additional_info,
            'email'          => $a->email,
            'contactNumber'  => $a->contact_number,
            'age'            => $a->age,
            'gender'         => $a->gender,
            'sessionId'      => $session?->id,
            'soap'           => $session ? [
                'subjective' => $session->subjective ?? '',
                'objective'  => $session->objective  ?? '',
                'assessment' => $session->assessment ?? '',
                'plan'       => $session->plan       ?? '',
            ] : null,
            'vitals'         => $session ? [
                'bloodPressure'    => $session->blood_pressure    ?? '',
                'heartRate'        => $session->heart_rate        ?? '',
                'temperature'      => $session->temperature       ?? '',
                'oxygenSaturation' => $session->oxygen_saturation ?? '',
                'weight'           => $session->weight            ?? '',
                'height'           => $session->height            ?? '',
            ] : null,
            'prescriptions'  => $session
                ? $session->prescriptions->map(fn ($p) => [
                    'medication' => $p->name,
                    'dosage'     => '',
                    'duration'   => $p->instructions,
                ])->toArray()
                : [],
        ];
    }

    private function authorizeDoctor(Appointment $appointment): void
    {
        abort_if($appointment->doctor_id !== Auth::id(), 403);
    }

    private function mapStatus(string $status): string
    {
        return match ($status) {
            'checked_in'  => 'in-progress',
            'in_progress' => 'in-progress',
            'completed'   => 'finalized',
            default       => 'draft',
        };
    }

    private function colorForService(string $service): string
    {
        return match ($service) {
            'dermatology'      => '#0056b3', 'psychiatry'  => '#7c3aed',
            'pediatrics'       => '#0891b2', 'cardiology'  => '#16a34a',
            'ob-gyne'          => '#db2777', 'general'     => '#475569',
            'laboratory'       => '#ca8a04', 'imaging'     => '#00a8e8',
            'physical-therapy' => '#dc2626',
            default            => '#0056b3',
        };
    }

    private function labelForService(string $service): string
    {
        return match ($service) {
            'general'          => 'General Consultation',
            'cardiology'       => 'Cardiology',
            'dermatology'      => 'Dermatology',
            'pediatrics'       => 'Pediatrics',
            'ob-gyne'          => 'OB-Gyne',
            'laboratory'       => 'Laboratory Services',
            'imaging'          => 'Imaging / Radiology',
            'physical-therapy' => 'Physical Therapy',
            default            => ucfirst($service),
        };
    }
}