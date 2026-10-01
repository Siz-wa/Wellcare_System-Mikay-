// resources/js/design-system/components/user-menu.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The account dropdown in AppTopbar.
//
// The topbar carried a user "chip" with `cursor: pointer`, a hover
// highlight and a chevron-down glyph — and no click handler of any kind. It
// looked like a menu on every dashboard in the app and did nothing when
// clicked. This is that menu.

import { Link, router } from '@inertiajs/react';
import { Accessibility, Bell, LogOut, Shield, User } from 'lucide-react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { DoctorAvatar } from '@/components/doctor-avatar';

interface MenuLink {
    label: string;
    href: string;
    icon: ReactNode;
}

const MENU_LINKS: MenuLink[] = [
    {
        label: 'Profile',
        href: '/settings/profile',
        icon: <User size={15} strokeWidth={1.8} />,
    },
    {
        label: 'Security',
        href: '/settings/security',
        icon: <Shield size={15} strokeWidth={1.8} />,
    },
    {
        label: 'Notifications',
        href: '/settings/notifications',
        icon: <Bell size={15} strokeWidth={1.8} />,
    },
    {
        label: 'Accessibility',
        href: '/settings/accessibility',
        icon: <Accessibility size={15} strokeWidth={1.8} />,
    },
];

const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md, 8px)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--wc-text-secondary)',
    textDecoration: 'none',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-sans)',
};

interface UserMenuProps {
    displayName: string;
    roleLabel: string;
    email?: string;
    initials: string;
    /**
     * The signed-in doctor's headshot, from `auth.user.photo_url`. Null for
     * every other role and for a doctor who has not uploaded one, which is the
     * ordinary case — the chip then shows initials, as it always has.
     */
    photoUrl?: string | null;
}

export function UserMenu({
    displayName,
    roleLabel,
    email,
    initials,
    photoUrl = null,
}: UserMenuProps): ReactElement {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click and on Escape. Both are needed: the dropdown is
    // absolutely positioned over page content, so leaving it open while the
    // person clicks elsewhere obscures whatever they were reaching for.
    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // Close after any navigation, or the menu hangs over the page it opened.
    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                onClick={() => setOpen((isOpen) => !isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-xl)',
                    border: 'none',
                    cursor: 'pointer',
                    background: open ? 'var(--wc-gray-100)' : 'transparent',
                    transition: 'background 0.15s',
                    fontFamily: 'var(--font-sans)',
                }}
            >
                {/*
                  The same avatar the public directory, the profile page and the
                  booking picker render, so a doctor's photograph cannot appear
                  on those three surfaces and still show initials here. It sizes
                  its own initials from the shared type scale; the font family
                  is overridden to the topbar's sans so a doctor with no photo
                  sees exactly the chip they saw before.
                */}
                <DoctorAvatar
                    photoUrl={photoUrl}
                    initials={initials || '?'}
                    color="var(--wc-blue-600)"
                    name={displayName}
                    size={36}
                    style={{
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 8px -2px rgba(0,86,179,0.4)',
                    }}
                />

                <span
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}
                >
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {displayName}
                    </span>
                    {roleLabel && (
                        <span
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                                lineHeight: 1.3,
                                fontWeight: 500,
                            }}
                        >
                            {roleLabel}
                        </span>
                    )}
                </span>

                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{
                        color: 'var(--wc-text-muted)',
                        flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 150ms ease',
                    }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        minWidth: 240,
                        // Literal white: --wc-white is #f5f5f5, which would read as a
                        // grey card floating over the page rather than a panel.
                        background: '#fff',
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-xl, 14px)',
                        boxShadow:
                            'var(--shadow-lg, 0 12px 32px -8px rgba(15,23,42,0.25))',
                        padding: 6,
                        // Above the sticky topbar's own z-index of 100.
                        zIndex: 300,
                    }}
                >
                    <div
                        style={{
                            padding: '10px 12px 12px',
                            borderBottom: '1px solid var(--wc-gray-100)',
                            marginBottom: 6,
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                fontWeight: 700,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {displayName}
                        </p>
                        {email && (
                            <p
                                style={{
                                    margin: '2px 0 0',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                {email}
                            </p>
                        )}
                    </div>

                    {MENU_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            role="menuitem"
                            style={itemStyle}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.background =
                                    'var(--wc-gray-100)';
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.background =
                                    'transparent';
                            }}
                        >
                            <span style={{ display: 'flex', opacity: 0.7 }}>
                                {link.icon}
                            </span>
                            {link.label}
                        </Link>
                    ))}

                    <div
                        style={{
                            height: 1,
                            background: 'var(--wc-gray-100)',
                            margin: '6px 0',
                        }}
                    />

                    {/*
                      POST, not a link. Fortify's logout route is POST-only, and
                      a GET logout is CSRF-triggerable from any page that can
                      make the browser fetch a URL.
                    */}
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        role="menuitem"
                        style={{ ...itemStyle, color: '#ef4444' }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.background =
                                'transparent';
                        }}
                    >
                        <span style={{ display: 'flex', opacity: 0.8 }}>
                            <LogOut size={15} strokeWidth={1.8} />
                        </span>
                        Sign out
                    </Link>
                </div>
            )}
        </div>
    );
}
