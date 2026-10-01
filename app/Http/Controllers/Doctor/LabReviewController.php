<?php

namespace App\Http\Controllers\Doctor;

use App\Exceptions\InvalidLabTransitionException;
use App\Http\Controllers\Controller;
use App\Models\LabTestResult;
use App\Services\LabResultService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The doctor half of the lab workflow — step 4 ("Doctor Review") of the flow
 * described in resources/js/pages/doctor/dashboard-data.ts.
 *
 * Feeds the existing doctor/lab-reviews page, which was built against a fixed
 * data contract; mapResult() below is what satisfies it.
 */
class LabReviewController extends Controller
{
    public function __construct(private LabResultService $labResults) {}

    public function index(Request $request): Response
    {
        $query = LabTestResult::with(['patient', 'parameters'])
            ->whereIn('status', ['recorded', 'reviewed'])
            ->orderByRaw("FIELD(status, 'recorded', 'reviewed')")
            ->orderByRaw("FIELD(severity, 'critical', 'abnormal', 'normal')")
            ->latest('recorded_at');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('test_name', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($p) use ($search) {
                        $p->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        return Inertia::render('doctor/lab-reviews/lab-reviews', [
            'results' => $query->get()->map(fn (LabTestResult $r) => $this->mapResult($r))->values(),
            'filters' => ['search' => $search ?: ''],
        ]);
    }

    public function validateResult(Request $request, LabTestResult $labTestResult): RedirectResponse
    {
        $validated = $request->validate([
            'interpretation' => ['required', 'string', 'max:5000'],
        ], [
            'interpretation.required' => 'Please write your interpretation before validating.',
        ]);

        try {
            $this->labResults->review(
                $labTestResult,
                Auth::user(),
                $validated['interpretation'],
            );
        } catch (InvalidLabTransitionException $e) {
            return back()->withErrors(['interpretation' => $e->getMessage()]);
        }

        return back()->with('success', "{$labTestResult->test_name} validated and added to the patient's record.");
    }

    /**
     * One row shaped for both the list card and the detail modal — the page
     * looks the full record up from the same array it renders the list from.
     *
     * @return array<string, mixed>
     */
    private function mapResult(LabTestResult $result): array
    {
        $patient = $result->patient;

        return [
            'id' => (string) $result->id,
            'name' => $patient?->full_name ?? 'Unknown patient',
            'initials' => $patient?->initials ?? '??',
            'test' => $result->test_name,
            'timeAgo' => $result->recorded_at?->diffForHumans(short: true) ?? '—',
            'status' => $result->display_status,
            'iconColor' => $this->colorForSeverity($result->severity),
            'patientId' => $patient?->clinic_id ?? "P-{$result->patient_id}",

            'testParameters' => $result->parameters->map(fn ($p) => [
                'name' => $p->name,
                'result' => $p->result,
                'unit' => $p->unit ?? '',
                'refRange' => $p->ref_range ?? '',
                'status' => $p->status,
            ])->values(),

            // The doctor's OWN reading, and nothing else. This used to fall back
            // to `$result->notes` — the nurse's "notes for the doctor" — which
            // pre-filled the interpretation box with somebody else's words. A
            // doctor who read the result and pressed Validate without editing
            // then signed the nurse's remarks as their own clinical
            // interpretation, and that text is what the patient is shown under
            // "Doctor's Interpretation" with the doctor's name against it.
            // An empty box is the correct starting point: an interpretation
            // nobody wrote should look like one.
            'interpretation' => $result->interpretation ?? '',

            // The nurse's remarks travel separately and are rendered read-only
            // beside the field, so the doctor still reads them while writing.
            'nurseNotes' => $result->notes,
            'isReviewed' => $result->status === 'reviewed',
        ];
    }

    private function colorForSeverity(?string $severity): string
    {
        return match ($severity) {
            'critical' => '#dc2626',
            'abnormal' => '#ca8a04',
            'normal' => '#16a34a',
            default => 'var(--wc-blue-600)',
        };
    }
}
