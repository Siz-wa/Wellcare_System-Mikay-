<?php

namespace App\Services;

use App\Models\Consent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * The one way consent is recorded, read and withdrawn — SC-4.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.1.
 *
 * Everything goes through here rather than through the model directly, for the
 * same reason booking goes through BookingService: the rules are the point.
 * A consent row written by hand somewhere else would be a row with no version
 * stamp, or no request context, or one that silently re-granted something the
 * person had withdrawn — and every one of those is a row that looks like
 * evidence and is not.
 */
class ConsentService
{
    /**
     * Record agreement to one purpose.
     *
     * Idempotent on purpose: ticking a box twice must not produce two rows that
     * disagree about when consent began. An existing ACTIVE consent at the
     * CURRENT version is returned untouched — re-consenting to wording you
     * already accepted is not an event.
     *
     * A stale or withdrawn consent is different: that one is superseded and a
     * new row is written, so the history reads as the sequence of positions the
     * person actually took rather than a single mutable row.
     */
    public function grant(
        string $type,
        ?User $user,
        ?Patient $patient = null,
    ): Consent {
        $existing = $this->query($type, $user, $patient)->active()->latest('granted_at')->first();

        if ($existing && ! $existing->isStale()) {
            return $existing;
        }

        if ($existing) {
            // Superseded by a wording change. Close it explicitly rather than
            // leaving two active rows at different versions.
            $existing->update(['withdrawn_at' => now()]);
        }

        return Consent::create([
            'patient_id' => $patient?->id,
            'granted_by_user_id' => $user?->id,
            'type' => $type,
            'document_version' => Consent::currentVersionFor($type) ?? 'unversioned',
            'granted_at' => now(),
            'ip_address' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 500) ?: null,
        ]);
    }

    /**
     * Withdraw a consent the person is allowed to withdraw.
     *
     * Returns false — rather than throwing — for a purpose marked
     * `withdrawable: false`. That is not a failure to handle; it is the answer,
     * and the settings panel renders it as an explanation rather than an error.
     * See the note in config/consent.php on why data processing is in that
     * category: withdrawal would collide with a retention obligation, and that
     * collision needs a person, not a button.
     */
    public function withdraw(string $type, User $user, ?Patient $patient = null): bool
    {
        if (! $this->isWithdrawable($type)) {
            return false;
        }

        // Without a patient, "withdraw" means everything of this type this
        // account agreed to, including the per-patient consent a booking
        // records (telemedicine is granted for the person being seen).
        $query = $patient
            ? $this->query($type, $user, $patient)
            : Consent::query()->where('type', $type)->where('granted_by_user_id', $user->id);

        $affected = $query->active()->update(['withdrawn_at' => now()]);

        return $affected > 0;
    }

    /**
     * Whether the account explicitly withdrew this purpose and has not agreed
     * again since.
     *
     * Deliberately not "has no consent": accounts created before consent was
     * captured have no rows at all, and treating that as a refusal would lock
     * every one of them out of booking. An explicit withdrawal is a decision
     * the clinic must honour.
     */
    public function isWithdrawn(string $type, User $user): bool
    {
        $rows = Consent::query()->where('type', $type)->where('granted_by_user_id', $user->id);

        return (clone $rows)->exists()
            && ! (clone $rows)->active()->exists();
    }

    /** Is this purpose currently agreed to, at the current wording? */
    public function has(string $type, ?User $user, ?Patient $patient = null): bool
    {
        $consent = $this->query($type, $user, $patient)->active()->latest('granted_at')->first();

        return $consent !== null && ! $consent->isStale();
    }

    /**
     * Purposes this account must be asked about again.
     *
     * Either never given, or given against wording that has since changed.
     * Required purposes only — an optional one that was declined is a decision,
     * not an outstanding question, and re-asking on every visit would be
     * nagging rather than compliance.
     *
     * @return array<int, string>
     */
    public function outstandingFor(User $user): array
    {
        return collect(config('consent.purposes'))
            ->filter(fn (array $purpose) => $purpose['required'] ?? false)
            ->keys()
            ->reject(fn (string $type) => $this->has($type, $user))
            ->values()
            ->all();
    }

    /**
     * The whole picture for the settings panel: every purpose, its wording, and
     * where this account stands on it.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function statusFor(User $user): Collection
    {
        return collect(config('consent.purposes'))->map(function (array $purpose, string $type) use ($user) {
            // Account-level first; otherwise the newest per-patient consent,
            // which is how a booking records agreement to a video visit.
            $latest = $this->query($type, $user)->latest('granted_at')->first()
                ?? Consent::query()
                    ->where('type', $type)
                    ->where('granted_by_user_id', $user->id)
                    ->whereNotNull('patient_id')
                    ->latest('granted_at')
                    ->first();
            $active = $latest !== null && $latest->isActive();

            $forPatients = Consent::query()
                ->where('type', $type)
                ->where('granted_by_user_id', $user->id)
                ->whereNotNull('patient_id')
                ->active()
                ->with('patient:id,first_name,last_name')
                ->get()
                ->map(fn (Consent $c) => trim(($c->patient?->first_name ?? '').' '.($c->patient?->last_name ?? '')))
                ->filter()
                ->unique()
                ->values()
                ->all();

            return [
                'type' => $type,
                'title' => $purpose['title'],
                'summary' => $purpose['summary'],
                'body' => $this->normaliseBody($purpose['body']),
                'required' => (bool) ($purpose['required'] ?? false),
                'withdrawable' => (bool) ($purpose['withdrawable'] ?? false),
                'currentVersion' => $purpose['version'],
                'granted' => $active,
                // The version they actually agreed to, which may not be the one
                // above — that difference is the whole point of storing it.
                'agreedVersion' => $latest?->document_version,
                'agreedAt' => $active ? $latest?->granted_at?->format('d M Y, g:i A') : null,
                'withdrawnAt' => $latest?->withdrawn_at?->format('d M Y, g:i A'),
                'needsReconsent' => $active && $latest->isStale(),
                // Who a per-patient consent covers, e.g. the child a parent
                // booked a video consultation for.
                'forPatients' => $forPatients,
            ];
        })->values();
    }

    /**
     * The purposes shown on the registration form, in display order.
     *
     * Telemedicine is deliberately absent: it is asked at the point of booking
     * a video consultation, not at sign-up. Asking someone to consent to a
     * video call they may never have while they are creating an account is
     * consent to something hypothetical, which is exactly the un-specific
     * agreement C-1 is about.
     *
     * @return array<int, array<string, mixed>>
     */
    public function documentsForRegistration(): array
    {
        return collect([Consent::DATA_PROCESSING, Consent::TREATMENT])
            ->map(fn (string $type) => $this->documentFor($type))
            ->all();
    }

    /**
     * One purpose's wording, in the shape the consent checkbox renders.
     *
     * `required` here means "required to create an account", which is the only
     * question the registration form asks. Telemedicine is false by that
     * measure and yet mandatory to book a video consultation — the booking
     * wizard marks its own box required rather than reading this flag.
     *
     * @return array{type: string, field: string, title: string, summary: string, body: string, required: bool, version: string}
     */
    public function documentFor(string $type): array
    {
        $purpose = config("consent.purposes.{$type}");

        if (! is_array($purpose)) {
            throw new InvalidArgumentException("Unknown consent purpose [{$type}].");
        }

        return [
            'type' => $type,
            'field' => 'consent_'.$type,
            'title' => $purpose['title'],
            'summary' => $purpose['summary'],
            'body' => $this->normaliseBody($purpose['body']),
            'required' => (bool) ($purpose['required'] ?? false),
            'version' => $purpose['version'],
        ];
    }

    public function isWithdrawable(string $type): bool
    {
        return (bool) config("consent.purposes.{$type}.withdrawable", false);
    }

    /**
     * Heredoc bodies in config are indented to match the surrounding PHP, which
     * would render as a code block in markdown and as ragged text in HTML.
     * Stripped here rather than un-indenting the config, so the config file
     * stays readable.
     */
    private function normaliseBody(string $body): string
    {
        return implode("\n", array_map('rtrim', array_map(
            fn (string $line) => preg_replace('/^ {0,12}/', '', $line),
            explode("\n", $body),
        )));
    }

    /**
     * @return Builder<Consent>
     */
    private function query(string $type, ?User $user, ?Patient $patient = null)
    {
        return Consent::query()
            ->where('type', $type)
            ->where('granted_by_user_id', $user?->id)
            ->where('patient_id', $patient?->id);
    }
}
