// resources/js/pages/admin/layout/components/AdminAppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// System Administrator sidebar — same visual spec as HRAppSidebar.

import { Link, usePage } from '@inertiajs/react';
import {
    CalendarCheck2,
    ChevronRight,
    Eye,
    FlaskConical,
    FolderOpen,
    LayoutDashboard,
    LogOut,
    MessageSquare,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type {
    NavGroup,
    NavItem,
} from '@/pages/admin/layout/admin-dashboard-data';
import { navGroups } from '@/pages/admin/layout/admin-dashboard-data';
import { SidebarLogo } from '@/pages/user/layout/components/PatientAppSidebar';
import type { PageProps } from '@/types';

/**
 * Drop links the signed-in account cannot open, and any group left empty.
 *
 * This sidebar is shared by three tiers — administrator, System Owner and, via
 * SettingsShell, anyone whose settings page renders inside it. The routes
 * behind it are gated per capability (`permission:`) or per role (`role:`), and
 * an owner holds neither the patient, archive nor credentialing permissions.
 * Until 2026-09-11 that meant an owner browsing /admin/users was offered seven
 * links that all 403 — the governance walkthrough logged it as OB-02.
 *
 * A courtesy, not a control: every route stays enforced server-side. The point
 * is that navigation should not advertise doors the account is designed never
 * to open.
 */
function visibleGroups(
    groups: NavGroup[],
    roles: string[],
    permissions: string[],
): NavGroup[] {
    return groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (item.permission && !permissions.includes(item.permission)) {
                    return false;
                }

                if (
                    item.roles &&
                    !item.roles.some((role) => roles.includes(role))
                ) {
                    return false;
                }

                return true;
            }),
        }))
        .filter((group) => group.items.length > 0);
}

const BRAND = '#0056b3';
const BRAND_BG = '#eff6ff';
const ACTIVE_SHADOW =
    '0 4px 14px -2px rgba(0,86,179,0.35), 0 2px 6px -1px rgba(0,86,179,0.2)';

type IconKey = NavItem['iconKey'];
const ICON_MAP: Record<IconKey, ReactElement> = {
    dashboard: <LayoutDashboard size={17} strokeWidth={1.8} />,
    schedule: <CalendarCheck2 size={17} strokeWidth={1.8} />,
    patients: <Users size={17} strokeWidth={1.8} />,
    consultations: <MessageSquare size={17} strokeWidth={1.8} />,
    labreviews: <FlaskConical size={17} strokeWidth={1.8} />,
    records: <FolderOpen size={17} strokeWidth={1.8} />,
    settings: <Settings size={17} strokeWidth={1.8} />,
    // Governance roles — GV-5 and GV-6. `governance` is the control plane
    // (appointing administrators); `oversight` is watching it.
    governance: <ShieldCheck size={17} strokeWidth={1.8} />,
    oversight: <Eye size={17} strokeWidth={1.8} />,
};

function NavLink({
    item,
    active,
}: {
    item: NavItem;
    active: boolean;
}): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href={item.href}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: 16,
                fontSize: 'var(--text-sm)',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                fontFamily: 'var(--font-sans)',
                transform:
                    hovered && !active ? 'translateX(4px)' : 'translateX(0)',
                transition:
                    'transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease, box-shadow 150ms ease',
                background: active ? BRAND : hovered ? BRAND_BG : 'transparent',
                color: active ? '#fff' : hovered ? BRAND : '#64748b',
                boxShadow: active ? ACTIVE_SHADOW : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    opacity: active ? 1 : hovered ? 1 : 0.65,
                }}
            >
                {ICON_MAP[item.iconKey]}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {active && (
                <span style={{ display: 'flex', opacity: 0.7 }}>
                    <ChevronRight size={14} strokeWidth={2.5} />
                </span>
            )}
        </Link>
    );
}

function LogoutButton(): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href="/logout"
            method="post"
            as="button"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                borderRadius: 16,
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
                transition:
                    'transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease',
                background: hovered ? '#fef2f2' : 'transparent',
                color: hovered ? '#ef4444' : '#64748b',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    opacity: hovered ? 1 : 0.55,
                }}
            >
                <LogOut size={17} strokeWidth={1.8} />
            </span>
            Logout
        </Link>
    );
}

interface AdminAppSidebarProps {
    activeId: string;
    /**
     * The nav to render. Defaults to the administrator's.
     *
     * Parameterised rather than copied for the two governance roles added in
     * the GV pass. The project convention is a sidebar per role, and it is the
     * right convention where the roles differ — the doctor, nurse and patient
     * sidebars carry genuinely different chrome. The owner and the DPO differ
     * from the administrator in exactly one respect: which four links they get.
     * Duplicating 200 lines of identical styling twice to express that would
     * mean three places to fix the next spacing change.
     */
    groups?: NavGroup[];
}

export function AdminAppSidebar({
    activeId,
    groups: providedGroups = navGroups,
}: AdminAppSidebarProps): ReactElement {
    const { auth } = usePage<PageProps>().props;
    const groups = visibleGroups(
        providedGroups,
        auth?.user?.roles ?? [],
        auth?.user?.permissions ?? [],
    );

    return (
        <aside
            style={{
                width: 260,
                minHeight: '100dvh',
                height: '100dvh',
                position: 'sticky',
                top: 0,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRight: '1px solid #f1f5f9',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
        >
            <SidebarLogo />
            <div
                style={{ height: 1, background: '#f1f5f9', marginBottom: 8 }}
            />

            <nav
                style={{
                    flex: 1,
                    padding: '8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                }}
            >
                {groups.map((group, gi) => (
                    <div
                        key={group.groupLabel}
                        style={{
                            marginBottom: gi < groups.length - 1 ? 16 : 0,
                        }}
                    >
                        <p
                            style={{
                                margin: '0 0 6px',
                                padding: '0 4px',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            {group.groupLabel}
                        </p>
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
