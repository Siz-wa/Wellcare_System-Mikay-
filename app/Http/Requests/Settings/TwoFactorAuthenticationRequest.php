<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;

/**
 * The security settings page's own request.
 *
 * ## Why this no longer uses Fortify's InteractsWithTwoFactorState
 *
 * Fortify ships `ensureStateIsValid()`, which discards a generated-but-
 * unconfirmed two-factor secret as soon as the security page is loaded a second
 * time without a code having been submitted. Its `two_factor_confirming_at`
 * marker is compared against `time()` for the *current* request, so exactly one
 * page load may sit between "Enable" and "Confirm". That assumption holds for a
 * page where the QR code and the code field are on screen together and the
 * person never navigates.
 *
 * It does not hold here, for two reasons that compound:
 *
 *  1. Enrolment happens in a modal, and the person leaves the browser entirely
 *     to scan the QR code with their phone.
 *  2. EnsureTwoFactorEnrolled bounces every un-enrolled staff member back to
 *     this page on *every* link they click. Each bounce is another load of
 *     `security.edit`.
 *
 * So the secret behind the QR code a doctor had just scanned was being wiped
 * before they could type the first code, and every code they then entered was
 * rejected as invalid — the "I scanned it and nothing happens" report this
 * replaces.
 *
 * A pending secret is inert until it is confirmed (`hasEnabledTwoFactor-
 * Authentication()` requires `two_factor_confirmed_at`), so the security value
 * of discarding it is only that an abandoned setup should not stay resumable
 * forever. That is a time bound, not a page-load count — which is what this
 * class implements instead.
 */
class TwoFactorAuthenticationRequest extends FormRequest
{
    /**
     * How long a generated-but-unconfirmed secret stays usable.
     *
     * Long enough to unlock a phone, open an authenticator, scan, and come
     * back — with the interruptions a clinic workstation actually gets.
     *
     * ## This MUST stay below the shortest idle window in config/security.php
     *
     * Reduced from 30 to 10 on 2026-09-10, when GV-8 introduced per-role idle
     * timeouts (owner and DPO 15 minutes, admin and HR 20, clinical 30).
     *
     * The two interact, and the interaction is not obvious. `PENDING_SINCE_KEY`
     * lives in the **session**, and `expireStalePendingSetup()` deliberately
     * gives a secret seen in a fresh session a FULL new window rather than
     * expiring it on sight (see the comment there — it is the right call in
     * isolation). So if this TTL is longer than the idle window, the session
     * always ends first, the marker goes with it, and the next sign-in restarts
     * the clock. A stale unconfirmed secret would then live indefinitely,
     * renewed by every login, and this expiry would never fire for any staff
     * account.
     *
     * That is not a hole on its own — an unconfirmed secret grants nothing, and
     * `EnsureTwoFactorEnrolled` gates on `two_factor_confirmed_at` — but it
     * makes this whole mechanism decorative, which is worse than not having it.
     *
     * Ten minutes is comfortably enough to scan a QR code and type six digits,
     * and it fits inside every window in the table. `GovernanceRoleTest` asserts
     * the relationship so the two constants cannot drift apart silently.
     */
    public const PENDING_SETUP_TTL_MINUTES = 10;

    /** When the pending setup on screen was first observed. */
    private const PENDING_SINCE_KEY = 'two_factor.pending_since';

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * Is there a secret generated but not yet confirmed?
     */
    public function hasPendingTwoFactorSetup(): bool
    {
        $user = $this->user();

        return $user->two_factor_secret !== null
            && $user->two_factor_confirmed_at === null;
    }

    /**
     * Discard a setup that was started and then left unfinished for too long.
     *
     * @return bool True when a pending setup was discarded on this request, so
     *              the page can say so rather than silently showing a QR code
     *              for a secret that no longer exists.
     */
    public function expireStalePendingSetup(): bool
    {
        if (! $this->hasPendingTwoFactorSetup()) {
            // Either fully enrolled or never started. Either way the clock is
            // meaningless — drop it so the next setup starts a fresh one.
            $this->session()->forget(self::PENDING_SINCE_KEY);

            return false;
        }

        $startedAt = $this->session()->get(self::PENDING_SINCE_KEY);

        if ($startedAt === null) {
            // First sighting. A secret created in a session that has since
            // ended lands here too, which is deliberate: it gets a full window
            // rather than being expired the instant it is seen.
            $this->session()->put(self::PENDING_SINCE_KEY, now()->timestamp);

            return false;
        }

        if (now()->timestamp - (int) $startedAt < self::PENDING_SETUP_TTL_MINUTES * 60) {
            return false;
        }

        app(DisableTwoFactorAuthentication::class)($this->user());
        $this->session()->forget(self::PENDING_SINCE_KEY);

        return true;
    }
}
