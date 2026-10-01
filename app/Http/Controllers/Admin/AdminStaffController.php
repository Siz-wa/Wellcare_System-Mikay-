<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Exceptions\AccountActionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCredentialRequest;
use App\Models\AvailabilityBlock;
use App\Models\StaffCredential;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\CredentialingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff credentialing and roster governance — the administrator acting as the
 * clinic's medical director.
 *
 * This is the module that answers "who manages the accounts". AdminUserController
 * creates the login; this decides whether its holder may see patients, which
 * specialty they may practise, and which hours the clinic has agreed to.
 *
 * Thin by design: every decision lives in CredentialingService or
 * AvailabilityService, and refusals arrive here as
 * AccountActionNotAllowedException and become a flash error — the same shape
 * AdminUserController uses for its own guards.
 */
class AdminStaffController extends Controller
{
    /**
     * Memoised per request — see pendingScheduleCounts().
     *
     * @var array<int, int>|null
     */
    private ?array $pendingScheduleCounts = null;

    public function __construct(
        private CredentialingService $credentialing,
        private AvailabilityService $availability,
    ) {}

    /** The credentialing roster: every clinical account and its standing. */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $staff = User::query()
            ->role(['doctor', 'nurse'])
            // credential, profile and roles are read for every row by mapStaff();
            // without eager loading this is a 4N query across the whole roster.
            ->with(['profile', 'roles', 'doctorProfile', 'credential.verifier.profile'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhereHas('profile', fn ($p) => $p
                            ->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                        )
                        ->orWhereHas('credential', fn ($c) => $c
                            ->where('prc_license_no', 'like', "%{$search}%")
                        );
                });
            })
            ->when(
                in_array($status, CredentialStatus::values(), true),
                fn ($query) => $query->whereHas('credential', fn ($c) => $c->where('status', $status)),
            )
            // Accounts with no file at all are the ones needing attention, so
            // they sort to the top rather than being buried alphabetically.
            ->when($status === 'unfiled', fn ($query) => $query->doesntHave('credential'))
            ->orderBy('email')
            ->get();

        return Inertia::render('admin/staff/staff', [
            'staff' => $staff->map(fn (User $user) => $this->mapStaff($user))->values(),
            'stats' => $this->stats(),
            'specialties' => Specialty::options(),
            'statuses' => $this->statusOptions(),
            'boardStatuses' => $this->boardStatusOptions(),
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    /** One staff member's full credentialing file and proposed schedule. */
    public function show(User $user): Response
    {
        abort_unless($user->hasRole('doctor') || $user->hasRole('nurse'), 404);

        $user->load(['profile', 'roles', 'doctorProfile', 'credential.verifier.profile']);

        return Inertia::render('admin/staff/staff-detail', [
            'staff' => $this->mapStaff($user),
            'credential' => $this->mapCredential($user->credential),
            'proposedSchedule' => $this->mapSchedule($user->id),
            'specialties' => Specialty::options(),
            'boardStatuses' => $this->boardStatusOptions(),
        ]);
    }

    /**
     * The roster queue — every doctor with hours awaiting a decision.
     *
     * Grouped by doctor rather than listed per block: an administrator approves
     * a week, not seven independent rows.
     */
    public function roster(): Response
    {
        $pending = AvailabilityBlock::awaitingApproval()
            ->with(['doctor.profile', 'doctor.doctorProfile'])
            ->whereNotNull('day_of_week')
            ->orderBy('doctor_id')
            ->orderBy('day_of_week')
            ->get()
            ->groupBy('doctor_id')
            ->map(fn ($blocks, $doctorId) => [
                'doctorId' => (int) $doctorId,
                'name' => $blocks->first()->doctor?->doctorProfile?->display_name
                    ?? $blocks->first()->doctor?->name
                    ?? 'Unknown doctor',
                'specialty' => $blocks->first()->doctor?->doctorProfile?->specialty,
                'submittedAt' => $blocks->max('submitted_at')?->format('d M Y, g:i A'),
                'days' => $blocks->map(fn (AvailabilityBlock $b) => [
                    'id' => $b->id,
                    'label' => $this->weekdayLabel($b->day_of_week),
                    'startTime' => substr((string) $b->start_time, 0, 5),
                    'endTime' => substr((string) $b->end_time, 0, 5),
                    'slotDuration' => $b->slot_duration_minutes,
                ])->values(),
            ])
            ->values();

        return Inertia::render('admin/staff/roster', [
            'pending' => $pending,
            'stats' => $this->stats(),
        ]);
    }

    public function storeCredentials(StoreCredentialRequest $request, User $user): RedirectResponse
    {
        $this->credentialing->submit($user, $request->validated());

        return back()->with(
            'success',
            "{$user->name}'s credentialing file was saved and is awaiting verification."
        );
    }

    public function verify(User $user): RedirectResponse
    {
        try {
            $this->credentialing->verify($user, Auth::user());
        } catch (AccountActionNotAllowedException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "{$user->name} is verified and cleared to see patients."
        );
    }

    public function reject(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(
            ['remarks' => ['required', 'string', 'max:1000']],
            ['remarks.required' => 'Give a reason so the record shows why this was refused.'],
        );

        $this->credentialing->reject($user, Auth::user(), $validated['remarks']);

        return back()->with('success', "{$user->name}'s credentials were rejected.");
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(
            ['remarks' => ['required', 'string', 'max:1000']],
            ['remarks.required' => 'Give a reason for the suspension.'],
        );

        try {
            $this->credentialing->suspend($user, Auth::user(), $validated['remarks']);
        } catch (AccountActionNotAllowedException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "{$user->name}'s clearance was withdrawn and they are no longer bookable."
        );
    }

    public function conferSpecialty(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'specialty' => ['required', Rule::in(Specialty::values())],
        ]);

        try {
            $specialty = Specialty::from($validated['specialty']);
            $this->credentialing->conferSpecialty($user, $specialty, Auth::user());
        } catch (AccountActionNotAllowedException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            $specialty->label()." was conferred on {$user->name}."
        );
    }

    public function publishSchedule(User $user): RedirectResponse
    {
        $published = $this->availability->publishSchedule($user->id, Auth::user());

        if ($published === 0) {
            return back()->with('error', "{$user->name} has no schedule awaiting approval.");
        }

        return back()->with(
            'success',
            "{$user->name}'s schedule is published — those hours are now bookable."
        );
    }

    public function rejectSchedule(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(
            ['remarks' => ['required', 'string', 'max:255']],
            ['remarks.required' => 'Tell the doctor why the schedule was sent back.'],
        );

        $returned = $this->availability->rejectSchedule($user->id, Auth::user(), $validated['remarks']);

        if ($returned === 0) {
            return back()->with('error', "{$user->name} has no schedule awaiting approval.");
        }

        return back()->with('success', "The schedule was sent back to {$user->name}.");
    }

    // ── Presenters ────────────────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function mapStaff(User $user): array
    {
        $credential = $user->credential;
        $profile = $user->doctorProfile;
        $specialty = $profile?->specialty
            ? Specialty::tryFrom($profile->specialty)
            : null;

        return [
            'id' => $user->id,
            'name' => $user->name !== '' ? $user->name : $user->email,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'none',
            'displayName' => $profile?->display_name,
            'specialty' => $specialty?->value,
            'specialtyLabel' => $specialty?->label(),
            // The gate itself: whether patients can currently book this person.
            'isPublished' => (bool) $profile?->is_active,
            'isAccountActive' => (bool) $user->is_active,
            'credentialStatus' => $credential?->status->value ?? 'unfiled',
            'credentialLabel' => $credential?->status->label() ?? 'No file on record',
            'credentialTone' => $credential?->status->tone() ?? 'error',
            'prcLicenseNo' => $credential?->prc_license_no,
            'prcExpiresOn' => $credential?->prc_expires_on?->format('d M Y'),
            'daysUntilExpiry' => $credential?->daysUntilExpiry(),
            'hasLapsed' => (bool) $credential?->hasLapsed(),
            'verifiedBy' => $credential?->verifier?->name,
            'verifiedAt' => $credential?->verified_at?->format('d M Y'),
            'pendingScheduleDays' => $this->pendingScheduleCounts()[$user->id] ?? 0,
        ];
    }

    /**
     * Pending weekly-block counts for every doctor, keyed by doctor id.
     *
     * One grouped query, memoised for the request. Read per row by mapStaff(),
     * so doing it inline would be an extra query for every member of the
     * roster — the same N+1 the eager loads above exist to avoid.
     *
     * @return array<int, int>
     */
    private function pendingScheduleCounts(): array
    {
        return $this->pendingScheduleCounts ??= AvailabilityBlock::awaitingApproval()
            ->whereNotNull('day_of_week')
            ->selectRaw('doctor_id, COUNT(*) as aggregate')
            ->groupBy('doctor_id')
            ->pluck('aggregate', 'doctor_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function mapCredential(?StaffCredential $credential): ?array
    {
        if (! $credential) {
            return null;
        }

        return [
            'prcLicenseNo' => $credential->prc_license_no,
            'prcExpiresOn' => $credential->prc_expires_on?->toDateString(),
            'ptrNo' => $credential->ptr_no,
            'ptrIssuedAtLgu' => $credential->ptr_issued_at_lgu,
            'ptrExpiresOn' => $credential->ptr_expires_on?->toDateString(),
            'philhealthAccreditationNo' => $credential->philhealth_accreditation_no,
            's2LicenseNo' => $credential->s2_license_no,
            'specialtyBoard' => $credential->specialty_board,
            'boardStatus' => $credential->board_status->value,
            'medicalCertificateOn' => $credential->medical_certificate_on?->toDateString(),
            'remarks' => $credential->remarks,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapSchedule(int $doctorId): array
    {
        return AvailabilityBlock::awaitingApproval()
            ->where('doctor_id', $doctorId)
            ->whereNotNull('day_of_week')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn (AvailabilityBlock $b) => [
                'id' => $b->id,
                'label' => $this->weekdayLabel($b->day_of_week),
                'startTime' => substr((string) $b->start_time, 0, 5),
                'endTime' => substr((string) $b->end_time, 0, 5),
                'slotDuration' => $b->slot_duration_minutes,
            ])->values()->all();
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'clinicalStaff' => User::role(['doctor', 'nurse'])->count(),
            'awaitingVerification' => StaffCredential::where('status', CredentialStatus::Pending)->count(),
            'expiringSoon' => StaffCredential::expiringWithin()->count(),
            'lapsed' => StaffCredential::lapsed()->count(),
            'rosterQueue' => AvailabilityBlock::awaitingApproval()
                ->whereNotNull('day_of_week')
                ->distinct('doctor_id')
                ->count('doctor_id'),
        ];
    }

    /**
     * `day_of_week` is MySQL DAYOFWEEK (1 = Sun … 7 = Sat), not ISO. Indexed
     * directly rather than converted, because this is display-only.
     */
    private function weekdayLabel(?int $storedDay): string
    {
        return [
            1 => 'Sunday', 2 => 'Monday', 3 => 'Tuesday', 4 => 'Wednesday',
            5 => 'Thursday', 6 => 'Friday', 7 => 'Saturday',
        ][$storedDay] ?? 'Unknown';
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        $options = array_map(
            fn (CredentialStatus $s) => ['value' => $s->value, 'label' => $s->label()],
            CredentialStatus::cases(),
        );

        $options[] = ['value' => 'unfiled', 'label' => 'No file on record'];

        return $options;
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function boardStatusOptions(): array
    {
        return array_map(
            fn (BoardStatus $s) => ['value' => $s->value, 'label' => $s->label()],
            BoardStatus::cases(),
        );
    }
}
