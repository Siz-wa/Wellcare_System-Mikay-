// resources/js/layouts/app/AppTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared topbar for ALL dashboard roles (doctor, patient, HR).
// Reads live user data from Inertia shared props — never hardcoded.

import { usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { NotificationBell } from '@/design-system//components/notification-bell';
import type { PageProps } from '@/types';

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconSearch = (): ReactElement => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconChevronDown = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// ── Role display labels ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    doctor: 'Physician',
    nurse: 'Nurse',
    hr: 'HR Officer',
    admin: 'Administrator',
    user: 'Patient',
};

// ── Flash toast ───────────────────────────────────────────────────────────────

// ── Topbar ────────────────────────────────────────────────────────────────────

interface AppTopbarProps {
    searchPlaceholder?: string;
}

export function AppTopbar({
    searchPlaceholder = 'Search…',
}: AppTopbarProps): ReactElement {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    // Build display name from Inertia shared props — never hardcoded
    const firstName = user?.first_name ?? '';
    const lastName = user?.last_name ?? '';
    const displayName =
        firstName && lastName
            ? `${firstName} ${lastName}`
            : (user?.name ?? 'User');

    // Initials from first two name parts
    const initials =
        displayName
            .split(' ')
            .slice(0, 2)
            .map((w: string) => w[0]?.toUpperCase() ?? '')
            .join('') || '?';

    // Role display label
    const roleKey = user?.roles?.[0] ?? '';
    const roleLabel =
        ROLE_LABELS[roleKey] ??
        (roleKey ? roleKey.charAt(0).toUpperCase() + roleKey.slice(1) : '');

    return (
        <>
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: '0 var(--space-8)',
                    height: '72px',
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    flexShrink: 0,
                }}
            >
                {/* Search */}
                <div style={{ flex: 1, position: 'relative', maxWidth: 420 }}>
                    <span
                        style={{
                            position: 'absolute',
                            left: 'var(--space-3)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--wc-gray-400)',
                            display: 'flex',
                            pointerEvents: 'none',
                        }}
                    >
                        <IconSearch />
                    </span>
                    <input
                        type="search"
                        className="wc-input"
                        placeholder={searchPlaceholder}
                        style={{
                            paddingLeft: 'calc(var(--space-3) + 24px)',
                            fontSize: 'var(--text-sm)',
                            background: 'rgba(0,0,0,0.025)',
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    />
                </div>

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

                    {/* User chip — live from auth */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-xl)',
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            (
                                e.currentTarget as HTMLDivElement
                            ).style.background = 'var(--wc-gray-100)';
                        }}
                        onMouseLeave={(e) => {
                            (
                                e.currentTarget as HTMLDivElement
                            ).style.background = 'transparent';
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--wc-blue-600)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 800,
                                flexShrink: 0,
                                letterSpacing: '0.04em',
                                boxShadow: '0 2px 8px -2px rgba(0,86,179,0.4)',
                            }}
                        >
                            {initials}
                        </div>

                        <div
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <span
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 700,
                                    color: 'var(--wc-dark)',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {displayName}
                            </span>
                            {roleLabel && (
                                <span
                                    style={{
                                        fontSize: '10px',
                                        color: 'var(--wc-gray-400)',
                                        lineHeight: 1.3,
                                        fontWeight: 500,
                                    }}
                                >
                                    {roleLabel}
                                </span>
                            )}
                        </div>

                        <span
                            style={{
                                color: 'var(--wc-gray-400)',
                                flexShrink: 0,
                            }}
                        >
                            <IconChevronDown />
                        </span>
                    </div>
                </div>
            </header>
        </>
    );
}
