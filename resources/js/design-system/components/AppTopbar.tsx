// resources/js/design-system/components/AppTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared topbar for ALL dashboard roles (doctor, patient, HR).
// Reads user identity and flash messages from Inertia shared props.
//
// This is the ONE implementation. pages/doctor/layout/AppTopbar.tsx used to be a
// hand-maintained near-copy of it (its header said "keep both files identical",
// and they had already drifted); it now re-exports this file.

import { usePage } from '@inertiajs/react';
import type { ReactElement, ReactNode } from 'react';
import { NotificationBell } from '@/design-system/components/notification-bell';
import { UserMenu } from '@/design-system/components/user-menu';
import type { PageProps } from '@/types';

// ── Icons ─────────────────────────────────────────────────────────────────────

// ── Role → display label ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    doctor: 'Physician',
    nurse: 'Nurse',
    hr: 'HR Officer',
    admin: 'Administrator',
    user: 'Patient',
};

// ── Flash toast ───────────────────────────────────────────────────────────────
// Reads props.flash.success / props.flash.error set by Laravel's ->with(...)
// and renders a fixed bottom-right toast that auto-dismisses after 4 seconds.

// ── Topbar ────────────────────────────────────────────────────────────────────

interface AppTopbarProps {
    /**
     * Phone-width navigation, rendered flush left before the search field.
     *
     * The staff shells pass a <MobileNavDrawer>; the patient shell passes
     * nothing, because its bottom tab bar already covers the same ground. The
     * slot hides itself — it is the caller's job to mark it `md:hidden`.
     */
    navSlot?: ReactNode;
}

export function AppTopbar({ navSlot }: AppTopbarProps): ReactElement {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    const displayName =
        user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : (user?.name ?? 'User');

    const roleKey = user?.roles?.[0] ?? '';
    const roleLabel = ROLE_LABELS[roleKey] ?? roleKey;

    const initials = displayName
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <>
            {/* 32px of side padding either side of a 390px screen leaves 326px
                for a search field, a bell, a divider and an avatar. Half it on
                phones — this bar is shared by every role's shell, so all four
                get the same benefit. */}
            <header
                className="flex h-[72px] shrink-0 items-center gap-3 px-4 sm:gap-4 sm:px-8"
                style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
            >
                {navSlot}

                {/* The search field that used to sit here was never wired: no
                    value, no change handler, no form — `searchPlaceholder` was
                    its only prop. Every page that needs search already has a
                    real one bound to state (the appointment board, the patient
                    and staff rosters, the activity log), so this was a dead
                    duplicate of a working control in all five role shells, and
                    at phone width it collapsed to a 40px magnifier that did
                    nothing. A search box that silently returns nothing is worse
                    than no search box in a records system. Removed rather than
                    hidden; restore it here when there is a global search
                    endpoint behind it. */}

                <div
                    style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                    }}
                >
                    {/* Notification bell */}
                    <NotificationBell />

                    {/* Divider */}
                    <div
                        style={{
                            width: 1,
                            height: 28,
                            background: 'var(--wc-gray-200)',
                        }}
                    />

                    <UserMenu
                        displayName={displayName}
                        roleLabel={roleLabel}
                        email={user?.email}
                        initials={initials}
                        photoUrl={user?.photo_url ?? null}
                    />
                </div>
            </header>

            {/* Flash toast — fixed-positioned, outside header flow */}
        </>
    );
}
