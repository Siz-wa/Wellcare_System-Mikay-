<?php

namespace App\Http\Controllers\Nurse;

use App\Exceptions\InvalidLabTransitionException;
use App\Http\Controllers\Controller;
use App\Models\LabTestResult;
use App\Services\LabResultService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The nurse half of the lab workflow — DFD process 6 (RECORD LAB RESULTS),
 * step 2 ("Nurse Validation") of the flow in doctor/dashboard-data.ts.
 */
class LabQueueController extends Controller
{
    public function __construct(private LabResultService $labResults) {}

    public function index(Request $request): Response
    {
        $pending = LabTestResult::with(['patient', 'requestedBy.profile'])
            ->awaitingResults()
            ->oldest('requested_at')
            ->get()
            ->map(fn (LabTestResult $r) => $this->mapResult($r));

        $recent = LabTestResult::with(['patient'])
            ->whereIn('status', ['recorded', 'reviewed'])
            ->latest('recorded_at')
            ->limit(10)
            ->get()
            ->map(fn (LabTestResult $r) => $this->mapResult($r));

        return Inertia::render('nurse/lab-queue/lab-queue', [
            'pending' => $pending->values(),
            'recent' => $recent->values(),
            'stats' => [
                'pending' => $pending->count(),
                'recordedToday' => LabTestResult::whereDate('recorded_at', today())->count(),
                'criticalToday' => LabTestResult::whereDate('recorded_at', today())
                    ->where('severity', 'critical')
                    ->count(),
            ],
        ]);
    }

    public function record(Request $request, LabTestResult $labTestResult): RedirectResponse
    {
        $validated = $request->validate([
            'severity' => ['required', Rule::in(['normal', 'abnormal', 'critical'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'parameters' => ['required', 'array', 'min:1'],
            'parameters.*.name' => ['required', 'string', 'max:150'],
            'parameters.*.result' => ['required', 'string', 'max:100'],
            'parameters.*.unit' => ['nullable', 'string', 'max:50'],
            'parameters.*.ref_range' => ['nullable', 'string', 'max:100'],
            'parameters.*.status' => ['required', Rule::in(['normal', 'abnormal'])],
        ], [
            'parameters.required' => 'Add at least one test parameter before submitting.',
            'parameters.*.name.required' => 'Every parameter needs a name.',
        ]);

        try {
            $this->labResults->record(
                $labTestResult,
                Auth::user(),
                $validated['parameters'],
                $validated['severity'],
                $validated['notes'] ?? null,
            );
        } catch (InvalidLabTransitionException $e) {
            return back()->withErrors(['severity' => $e->getMessage()]);
        }

        return back()->with('success', "{$labTestResult->test_name} recorded and sent to the doctor for review.");
    }

    /**
     * @return array<string, mixed>
     */
    private function mapResult(LabTestResult $result): array
    {
        $patient = $result->patient;

        return [
            'id' => (string) $result->id,
            'name' => $patient?->full_name ?? 'Unknown patient',
            'initials' => $patient?->initials ?? '??',
            'patientId' => $patient?->clinic_id ?? "P-{$result->patient_id}",
            'test' => $result->test_name,
            'status' => $result->status,
            'severity' => $result->severity,
            'requestedBy' => $result->requestedBy?->name,
            'requestedAt' => $result->requested_at?->format('d M Y, g:i A'),
            'timeAgo' => $result->requested_at?->diffForHumans(short: true) ?? '—',
        ];
    }
}
