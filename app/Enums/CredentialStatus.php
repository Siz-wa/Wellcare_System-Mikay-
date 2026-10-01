<?php

namespace App\Enums;

/**
 * Where a staff member sits in the clinic's credentialing process.
 *
 *   pending ──(admin verifies)──> verified ──(licence lapses)──> expired
 *      │                              │
 *      └──(admin rejects)──> rejected └──(admin suspends)──> suspended
 *
 * Only `verified` is a practising state. Everything else means the account
 * exists and can sign in, but the holder is not published to patients — see
 * CredentialingService, which is the only writer.
 */
enum CredentialStatus: string
{
    /** Documents on file, nobody has checked them yet. */
    case Pending = 'pending';

    /** Checked by an administrator. The only state that may see patients. */
    case Verified = 'verified';

    /** Checked and refused — wrong, missing or unverifiable documents. */
    case Rejected = 'rejected';

    /** Was verified; the PRC or PTR has since lapsed. Set by credentials:sweep. */
    case Expired = 'expired';

    /** Withdrawn by an administrator for cause, independent of any expiry date. */
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending verification',
            self::Verified => 'Verified',
            self::Rejected => 'Rejected',
            self::Expired => 'Lapsed',
            self::Suspended => 'Suspended',
        };
    }

    /**
     * Badge variant for the admin staff table.
     *
     * These are the design system's own Badge variants (see
     * design-system/components/badge.tsx), so the value crosses to React as-is
     * rather than being re-mapped in a second place that could drift.
     */
    public function tone(): string
    {
        return match ($this) {
            self::Verified => 'success',
            self::Pending => 'warning',
            self::Expired, self::Suspended => 'error',
            self::Rejected => 'neutral',
        };
    }

    /**
     * Whether this state lets the holder be published to patients.
     *
     * The single source of truth for the booking gate. `doctor_profiles.is_active`
     * is derived from this and never set independently.
     */
    public function permitsPractice(): bool
    {
        return $this === self::Verified;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
