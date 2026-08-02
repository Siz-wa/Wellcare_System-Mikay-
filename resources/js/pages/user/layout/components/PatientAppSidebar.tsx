// resources/js/layouts/app/PatientAppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient portal sidebar — same visual spec as AppSidebar but uses
// patient-specific nav groups.

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
    ChevronRight,
    Stethoscope,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { WellcareLogo } from '@/design-system/components/navbar';
import { navGroups } from '@/pages/user/layout/patient-dashboard-data';
import type { NavItem } from '@/pages/user/layout/patient-dashboard-data';

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
};

export function SidebarLogo(): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '24px 24px 20px',
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: BRAND,
                    boxShadow: ACTIVE_SHADOW,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="371 196 647 635"
                    width="26"
                    height="26"
                    xmlSpace="preserve"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        fill="#ffffff"
                        opacity="1"
                        stroke="none"
                        d="M828.197815,532.614258 C821.634338,532.046509 815.501526,531.171692 809.363892,531.137268 C762.866455,530.877075 716.367981,530.781494 669.869873,530.635620 C668.061218,530.629944 666.252563,530.634888 663.757751,530.634888 C663.757751,528.342102 663.756470,526.421936 663.757996,524.501770 C663.795349,476.836670 664.044434,429.170502 663.793701,381.506897 C663.635315,351.399048 650.741577,327.506653 625.126770,311.772003 C598.522095,295.429321 570.237793,294.433380 542.809753,309.402832 C514.533325,324.835327 499.787415,349.599731 499.540436,382.049835 C499.178986,429.545593 499.349365,477.045471 499.293549,524.543579 C499.291412,526.354980 499.293274,528.166382 499.293274,530.214783 C456.633972,530.214783 414.365173,530.214783 371.762054,530.214783 C371.676727,528.542297 371.539093,527.089478 371.537720,525.636536 C371.495972,481.804657 371.287201,437.972015 371.475006,394.141052 C371.860382,304.204010 424.682465,226.655991 509.214478,196.615311 C584.347961,169.914658 654.283020,182.739136 715.840881,233.723877 C760.153809,270.425690 784.046753,318.625305 789.148560,375.944977 C790.062134,386.208832 789.793274,396.578308 790.053467,406.899475 C790.098755,408.694702 790.059875,410.492035 790.059875,412.747864 C796.087158,412.747864 801.697205,412.789581 807.306458,412.741150 C845.138245,412.414459 880.851318,421.047821 913.318604,440.402039 C975.582520,477.518280 1011.396606,532.235046 1018.060120,604.735901 C1027.391113,706.258362 960.265198,797.705505 865.278809,823.832458 C848.495544,828.448853 831.409241,831.160767 813.997681,831.204834 C765.499695,831.327698 717.001282,831.275330 668.502991,831.292053 C667.185913,831.292480 665.868835,831.292114 664.217285,831.292114 C664.217285,785.816711 664.217285,740.603333 664.217285,694.982117 C666.165527,694.982117 667.955994,694.977844 669.746399,694.982727 C717.411255,695.113159 765.077087,695.499817 812.740723,695.312073 C874.277588,695.069702 913.764526,630.740234 886.041626,575.849792 C874.118286,552.242065 854.564880,538.034302 828.197815,532.614258 z"
                    />
                    <path
                        fill="#ffffff"
                        opacity="1"
                        stroke="none"
                        d="M371.151489,704.000000 C371.151520,684.198608 371.151520,664.897156 371.151520,645.799194 C371.675934,645.392639 371.929565,645.024658 372.175995,645.029358 C392.588013,645.424133 413.113586,642.853455 433.335449,647.956238 C473.455719,658.080017 502.442139,694.768188 502.893066,736.291565 C503.426178,785.379089 467.258209,826.236633 418.432404,830.546631 C403.067108,831.902954 387.481018,830.758301 371.151489,830.758301 C371.151489,788.599487 371.151489,746.549744 371.151489,704.000000 z"
                    />
                </svg>
            </div>
            <div style={{ lineHeight: 1 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#1e293b',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    WELLCARE
                </p>
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        color: BRAND,
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.15em',
                    }}
                >
                    CLINICS & LABORATORY
                </p>
            </div>
        </div>
    );
}

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

interface PatientAppSidebarProps {
    activeId: string;
}

export function PatientAppSidebar({
    activeId,
}: PatientAppSidebarProps): ReactElement {
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
                {navGroups.map((group, gi) => (
                    <div
                        key={group.groupLabel}
                        style={{
                            marginBottom: gi < navGroups.length - 1 ? 16 : 0,
                        }}
                    >
                        <p
                            style={{
                                margin: '0 0 6px',
                                padding: '0 4px',
                                fontSize: '10px',
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
