// resources/js/layouts/app/AppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wellcare Doctor Sidebar — pixel-perfect match of the Google AI Studio target.
//
// Spec:
//   • w-[260px] fixed left sidebar, h-screen, white bg, border-r border-slate-100
//   • Logo: Stethoscope in rounded-xl #0056b3 box · WELLCARE slate-900 · CLINICS #0056b3
//   • Group headers: text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]
//   • Inactive items: text-slate-500, hover → bg-[#eff6ff] text-[#0056b3], rounded-2xl
//   • Active item: bg-[#0056b3] text-white rounded-2xl shadow-[0_4px_14px_-2px_rgba(0,86,179,0.35)]
//   • Hover animation: translateX(4px) 180ms cubic-bezier(0.16,1,0.3,1)
//   • Bottom: "Switch to Patient" + "Logout" (red on hover), border-t border-slate-100
//   • All colors use Guidebook 1.5 tokens: --wc-blue-600 #0056b3 etc.
//
// Dependencies:
//   npm install lucide-react        (icons)
//   import { Link } from "@inertiajs/react"
//   navGroups from dashboard-data.ts (single source of truth)

import { Link } from '@inertiajs/react';
import {
    LayoutDashboard,
    CalendarCheck2,
    Users,
    MessageSquare,
    FlaskConical,
    FolderOpen,
    Settings,
    LogOut,
    UserRound,
    Stethoscope,
    ChevronRight,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { navGroups } from '@/pages/doctor/dashboard-data';
import type { NavItem } from '@/pages/doctor/dashboard-data';
import { SidebarLogo } from '@/pages/user/layout/components/PatientAppSidebar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Guidebook 1.5 brand tokens (used as string literals for Tailwind JIT)
const BRAND = '#0056b3'; // --wc-blue-600
const BRAND_BG = '#eff6ff'; // --wc-blue-50
const BRAND_TXT = '#0056b3'; // --wc-blue-600

const ACTIVE_SHADOW =
    '0 4px 14px -2px rgba(0,86,179,0.35), 0 2px 6px -1px rgba(0,86,179,0.2)';

// ─────────────────────────────────────────────────────────────────────────────
// Icon map — Lucide icons keyed to NavItem.iconKey
// ─────────────────────────────────────────────────────────────────────────────

type IconKey = NavItem['iconKey'];

const ICON_MAP: Record<IconKey, ReactElement> = {
    dashboard: <LayoutDashboard size={17} strokeWidth={1.8} />,
    schedule: <CalendarCheck2 size={17} strokeWidth={1.8} />,
    patients: <Users size={17} strokeWidth={1.8} />,
    consultations: <MessageSquare size={17} strokeWidth={1.8} />,
    labreviews: <FlaskConical size={17} strokeWidth={1.8} />,
    records: <FolderOpen size={17} strokeWidth={1.8} />,
    settings: <Settings size={17} strokeWidth={1.8} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WellcareLogo
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — single sidebar link
// ─────────────────────────────────────────────────────────────────────────────

interface NavLinkProps {
    item: NavItem;
    active: boolean;
}

function NavLink({ item, active }: NavLinkProps): ReactElement {
    const [hovered, setHovered] = useState(false);

    // whileHover x:4 — pure CSS translateX, 180ms ease-out
    const transform = hovered && !active ? 'translateX(4px)' : 'translateX(0)';
    const transition =
        'transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease, box-shadow 150ms ease';

    return (
        <Link
            href={item.href}
            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium no-underline select-none"
            style={{
                transform,
                transition,
                background: active ? BRAND : hovered ? BRAND_BG : 'transparent',
                color: active ? '#ffffff' : hovered ? BRAND_TXT : '#64748b', // slate-500
                boxShadow: active ? ACTIVE_SHADOW : 'none',
                fontFamily: "var(--font-sans,'DM Sans')",
                fontWeight: active ? 600 : 500,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Icon */}
            <span
                className="flex-shrink-0"
                style={{
                    opacity: active ? 1 : hovered ? 1 : 0.65,
                    display: 'flex',
                }}
            >
                {ICON_MAP[item.iconKey]}
            </span>

            {/* Label */}
            <span className="flex-1">{item.label}</span>

            {/* Active chevron */}
            {active && (
                <span className="flex" style={{ opacity: 0.7 }}>
                    <ChevronRight size={14} strokeWidth={2.5} />
                </span>
            )}
        </Link>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom action buttons
// ─────────────────────────────────────────────────────────────────────────────

function LogoutButton(): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href="/logout"
            method="post"
            as="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium no-underline"
            style={{
                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
                transition:
                    'transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease',
                background: hovered ? '#fef2f2' : 'transparent',
                color: hovered ? '#ef4444' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "var(--font-sans,'DM Sans')",
                fontWeight: 500,
                textAlign: 'left',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span
                className="flex flex-shrink-0"
                style={{ opacity: hovered ? 1 : 0.55 }}
            >
                <LogOut size={17} strokeWidth={1.8} />
            </span>
            Logout
        </Link>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Group header
// ─────────────────────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }): ReactElement {
    return (
        <p
            className="mt-1 mb-1 px-4"
            style={{
                margin: '0 0 6px 0',
                fontSize: '10px',
                fontWeight: 700,
                color: '#94a3b8', // slate-400 ≈ --wc-gray-400
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontFamily: "var(--font-sans,'DM Sans')",
            }}
        >
            {label}
        </p>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar — main export
// ─────────────────────────────────────────────────────────────────────────────

interface AppSidebarProps {
    /** Must match a NavItem.id in dashboard-data.ts navGroups */
    activeId: string;
}

export function AppSidebar({ activeId }: AppSidebarProps): ReactElement {
    return (
        <aside
            style={{
                width: 260,
                minHeight: '100vh',
                height: '100vh',
                position: 'sticky',
                top: 0,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff',
                borderRight: '1px solid #f1f5f9', // slate-100 ≈ --wc-gray-100
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
        >
            {/* ── Logo ──────────────────────────────────────────────────────── */}
            <SidebarLogo />

            {/* Divider under logo */}
            <div
                style={{
                    height: 1,
                    background: '#f1f5f9',
                    marginBottom: '8px',
                }}
            />

            {/* ── Grouped nav ───────────────────────────────────────────────── */}
            <nav
                style={{
                    flex: 1,
                    padding: '8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    overflowY: 'auto',
                }}
            >
                {navGroups.map((group, gi) => (
                    <div
                        key={group.groupLabel}
                        style={{
                            marginBottom: gi < navGroups.length - 1 ? 16 : 0,
                        }}
                    >
                        <GroupHeader label={group.groupLabel} />

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.id}
                                    item={item}
                                    active={item.id === activeId}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Bottom actions ─────────────────────────────────────────────── */}
            <div
                style={{
                    borderTop: '1px solid #f1f5f9',
                    padding: '12px 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <LogoutButton />
            </div>
        </aside>
    );
}
