// resources/js/design-system/components/notification-bell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The notification bell. Reads from the Inertia props HandleInertiaRequests
// shares on every request, so it drops into any layout — navbar, dashboard
// topbar, patient header — with no wiring.
//
// Presentation lives in components.css under .wc-bell / .wc-notif. It used to
// be inline style objects with hover implemented by assigning to
// `el.style.background` in onMouseEnter and un-hiding the dismiss button via
// querySelector. That is why the panel had no keyboard affordance, no narrow
// screen layout, and a palette of hardcoded hexes beside the design tokens:
// an inline style cannot express :hover, :focus-visible, a pseudo-element or
// a media query, so none of those existed.
//
// The backend sends `subject` for appointment notifications and `title` on
// some channels; both are read.

import { router, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import type { ReverbConfig } from '@/lib/echo';
import type { PageProps } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationItem {
    id: string;
    type: string;
    // Backend sends `subject` for appointment notifications; some channels use `title`.
    // We support both — whichever is present wins.
    title?: string;
    subject?: string;
    body: string;
    icon?: string;
    action_url?: string | null;
    role_hint?: string | null;
    read: boolean;
    /**
     * Task 1.3 — a critical lab result is not finished when it is read.
     * Reading is passive; acknowledging is the clinician accepting the value,
     * and only that stops the escalation sweep re-raising it to nurses and
     * admins. The two are recorded separately, so they are shown separately.
     */
    requires_acknowledgement?: boolean;
    acknowledged?: boolean;
    time: string;
    created_at?: string;
}

interface SharedProps extends PageProps {
    notifications: NotificationItem[];
    unreadCount: number;
    realtime?: ReverbConfig | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolves the display heading regardless of whether the backend sent `title` or `subject`. */
function getTitle(n: NotificationItem): string {
    return n.title ?? n.subject ?? 'Notification';
}

/** A critical result nobody has accepted yet — outstanding clinical work. */
function isAwaitingAcknowledgement(n: NotificationItem): boolean {
    return Boolean(n.requires_acknowledgement) && !n.acknowledged;
}

/**
 * The row's modifier classes.
 *
 * Unacknowledged critical results outrank read/unread: marking one read would
 * otherwise return it to the same plain white as a cancelled appointment,
 * which is the state the escalation sweep exists to catch.
 */
function rowClass(n: NotificationItem): string {
    const classes = ['wc-notif-row'];

    if (isAwaitingAcknowledgement(n)) {
        classes.push('wc-notif-row--critical');
    } else if (!n.read) {
        classes.push('wc-notif-row--unread');
    }

    return classes.join(' ');
}

// ── Icon resolver ─────────────────────────────────────────────────────────────

const ICONS: Record<string, ReactElement> = {
    calendar: (
        <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </>
    ),
    'check-circle': (
        <>
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </>
    ),
    'x-circle': (
        <>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </>
    ),
    'user-check': (
        <>
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
        </>
    ),
    'clipboard-check': (
        <>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <polyline points="9 12 11 14 15 10" />
        </>
    ),
    alert: (
        <>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
    ),
};

/** Type keyword → tint. Everything unmatched takes the brand blue. */
const TONES: Record<string, string> = {
    confirmed: 'var(--wc-success)',
    done: 'var(--wc-success)',
    finalized: 'var(--wc-success)',
    cancelled: 'var(--wc-error-dark)',
    no_show: 'var(--wc-error-dark)',
    checked_in: 'var(--wc-info-dark)',
    consultation: '#7c3aed',
    requested: 'var(--wc-warning)',
    pending: 'var(--wc-warning)',
    result: 'var(--wc-error-dark)',
    critical: 'var(--wc-error-dark)',
};

function toneFor(type: string, critical: boolean): string {
    if (critical) {
        return 'var(--wc-error-dark)';
    }

    const hit = Object.keys(TONES).find((k) => type.includes(k));

    return hit ? TONES[hit] : 'var(--wc-blue-600)';
}

function iconKeyFor(type: string, critical: boolean): string {
    if (critical || type.includes('critical') || type.includes('result')) {
        return 'alert';
    }

    if (
        type.includes('confirmed') ||
        type.includes('done') ||
        type.includes('finalized')
    ) {
        return 'check-circle';
    }

    if (type.includes('cancelled') || type.includes('no_show')) {
        return 'x-circle';
    }

    if (type.includes('checked_in')) {
        return 'user-check';
    }

    if (type.includes('consultation')) {
        return 'clipboard-check';
    }

    return 'calendar';
}

function NotifChip({
    type,
    critical,
}: {
    type: string;
    critical: boolean;
}): ReactElement {
    return (
        <span
            className="wc-notif-chip"
            style={{ '--chip': toneFor(type, critical) } as React.CSSProperties}
            aria-hidden="true"
        >
            <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
            >
                {ICONS[iconKeyFor(type, critical)]}
            </svg>
        </span>
    );
}

// ── One row ───────────────────────────────────────────────────────────────────

function NotificationRow({
    n,
    onOpen,
    onAcknowledge,
    onDismiss,
}: {
    n: NotificationItem;
    onOpen: (n: NotificationItem) => void;
    onAcknowledge: (id: string) => void;
    onDismiss: (id: string) => void;
}): ReactElement {
    const critical = isAwaitingAcknowledgement(n);

    return (
        <div className={rowClass(n)}>
            <NotifChip type={n.type} critical={critical} />

            <div className="wc-notif-row__body">
                {/*
                 * The whole row used to be a <div> with an onClick, which is
                 * unreachable by keyboard and announces nothing. A real button
                 * spanning the row gives it a name, a role and Enter/Space —
                 * and it must not wrap the Acknowledge and Dismiss controls,
                 * because a button inside a button is invalid and collapses
                 * them into the parent's hit area.
                 */}
                <button
                    type="button"
                    className="wc-notif-row__hit"
                    onClick={() => onOpen(n)}
                >
                    <p className="wc-notif-row__title">{getTitle(n)}</p>
                    <p className="wc-notif-row__text">{n.body}</p>
                    <span className="wc-notif-row__time">{n.time}</span>
                </button>

                {critical && (
                    <button
                        type="button"
                        className="wc-notif-row__ack"
                        onClick={() => onAcknowledge(n.id)}
                    >
                        Acknowledge result
                    </button>
                )}

                {n.requires_acknowledgement && n.acknowledged && (
                    <p className="wc-notif-row__acked">
                        <svg
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Acknowledged
                    </p>
                )}
            </div>

            <button
                type="button"
                className="wc-notif-row__dismiss"
                onClick={() => onDismiss(n.id)}
                aria-label={`Dismiss “${getTitle(n)}”`}
            >
                <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}

// ── Dropdown panel ────────────────────────────────────────────────────────────

function NotificationDropdown({
    notifications,
    unreadCount,
    onClose,
}: {
    notifications: NotificationItem[];
    unreadCount: number;
    onClose: () => void;
}): ReactElement {
    function markRead(id: string): void {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    }

    function markAllRead(): void {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    }

    /**
     * Accept a critical result.
     *
     * Deliberately its own control rather than a side effect of opening the
     * notification: `read_at` and `acknowledged_at` are separate columns
     * because they are separate acts, and the audit trail must not claim a
     * doctor accepted a panic value merely because the bell was opened.
     */
    function acknowledge(id: string): void {
        router.post(
            `/notifications/${id}/acknowledge`,
            {},
            { preserveScroll: true },
        );
    }

    /**
     * Navigate FIRST, mark read afterwards.
     *
     * These used to run in the opposite order, and `markRead` posts to an
     * endpoint that answers `back()` — a redirect to the page you are already
     * on. Two Inertia visits then raced, and the cheap `back()` routinely
     * resolved last, landing you exactly where you started. The notification
     * looked like a dead link.
     *
     * It was invisible for as long as every notification pointed at the page
     * its owner was already likely to be on. The first one with a genuinely
     * different destination — `consultation_started` → the consultations list —
     * is what exposed it.
     */
    function handleClick(n: NotificationItem): void {
        if (n.action_url) {
            onClose();
            router.visit(n.action_url, {
                onFinish: () => {
                    if (!n.read) {
                        markRead(n.id);
                    }
                },
            });

            return;
        }

        if (!n.read) {
            markRead(n.id);
        }
    }

    function dismiss(id: string): void {
        router.delete(`/notifications/${id}`, { preserveScroll: true } as any);
    }

    // Unread first, under their own heading. A bell whose whole purpose is
    // "what is new" was previously a single undifferentiated list, so the one
    // notification the user opened it for sat between two they had already
    // read and dealt with.
    const unread = notifications.filter((n) => !n.read);
    const earlier = notifications.filter((n) => n.read);
    const grouped = unread.length > 0 && earlier.length > 0;

    return (
        <div
            className="wc-notif"
            role="dialog"
            aria-label="Notifications"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="wc-notif__head">
                <p className="wc-notif__title">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="wc-notif__count">{unreadCount}</span>
                    )}
                </p>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        className="wc-notif__link"
                        onClick={markAllRead}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="wc-notif__list">
                {notifications.length === 0 ? (
                    <div className="wc-notif__empty">
                        <span className="wc-notif__empty-icon">
                            <svg
                                width="22"
                                height="22"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </span>
                        <p className="wc-notif__empty-title">
                            You&rsquo;re all caught up
                        </p>
                        <p className="wc-notif__empty-text">
                            Appointment updates and results will appear here.
                        </p>
                    </div>
                ) : (
                    <>
                        {grouped && <p className="wc-notif__group">New</p>}
                        {unread.map((n) => (
                            <NotificationRow
                                key={n.id}
                                n={n}
                                onOpen={handleClick}
                                onAcknowledge={acknowledge}
                                onDismiss={dismiss}
                            />
                        ))}
                        {grouped && <p className="wc-notif__group">Earlier</p>}
                        {earlier.map((n) => (
                            <NotificationRow
                                key={n.id}
                                n={n}
                                onOpen={handleClick}
                                onAcknowledge={acknowledge}
                                onDismiss={dismiss}
                            />
                        ))}
                    </>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="wc-notif__foot">
                    <button
                        type="button"
                        className="wc-notif__link"
                        onClick={() =>
                            router.delete('/notifications', {
                                preserveScroll: true,
                            } as any)
                        }
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Bell button ───────────────────────────────────────────────────────────────

export function NotificationBell(): ReactElement {
    const { props, url } = usePage<SharedProps>();

    useRealtimeNotifications(
        (props.auth as { user?: { id?: number } | null } | undefined)?.user?.id,
        props.realtime,
        url,
    );
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const notifications = props.notifications ?? [];
    const unreadCount = props.unreadCount ?? 0;

    // Close on outside click
    useEffect(() => {
        function handleOutside(e: MouseEvent): void {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);

        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // Escape closes it, which is what a dialog anchored to a button owes a
    // keyboard user — there was previously no way out except a mouse click
    // somewhere else on the page.
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKey(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    /**
     * Close when the user actually navigates — not on every re-render.
     *
     * This used to depend on `props`, which `usePage()` hands back as a fresh
     * object identity on *every* render, so any prop update at all slammed the
     * panel shut. That was survivable while these pages were static.
     *
     * It stopped being survivable the moment the consultations list started
     * polling every 15 seconds: each poll re-rendered, the dropdown closed
     * itself, and a notification the user was in the middle of pressing simply
     * vanished from under their finger. The click landed on nothing, which looks
     * exactly like a dead link.
     *
     * `router.on('navigate')` is also what the mobile drawer uses, and it avoids
     * the setState-in-an-effect-body that the old version tripped.
     */
    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    return (
        <div className="wc-bell" ref={ref}>
            <button
                type="button"
                className={
                    unreadCount > 0
                        ? 'wc-bell__btn wc-bell__btn--unread'
                        : 'wc-bell__btn'
                }
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>

                {unreadCount > 0 && (
                    <span className="wc-bell__badge" aria-hidden="true">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <NotificationDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}
