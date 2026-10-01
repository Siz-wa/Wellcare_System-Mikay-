// resources/js/pages/settings/layout/settings-shell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The chrome for every settings page.

import { Head, usePage } from '@inertiajs/react';
import type { ReactElement, ReactNode } from 'react';
import type { NavGroup } from '@/pages/admin/layout/admin-dashboard-data';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { DashboardLayout } from '@/pages/doctor/layout/dashboard-layout';
import { dpoNavGroups } from '@/pages/dpo/dpo-data';
import { HRDashboardLayout } from '@/pages/hr/layout/hr-dashboard-layout';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import { ownerNavGroups } from '@/pages/owner/owner-data';
import { SettingsNav } from '@/pages/settings/components/settings-nav';
import type { SettingsSectionId } from '@/pages/settings/settings-data';
import { settingsMeta } from '@/pages/settings/settings-data';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';

interface SettingsShellProps {
    active: SettingsSectionId;
    title: string;
    children: ReactNode;
}

/**
 * All role layouts take exactly `{ activeId, children }`, which is what makes
 * this dispatch a lookup rather than seven branches of markup.
 *
 * `owner` and `dpo` reuse AdminDashboardLayout with their own nav, exactly as
 * their own pages do — the layout takes a `groups` override for precisely this.
 */
const LAYOUTS = {
    doctor: DashboardLayout,
    nurse: NurseDashboardLayout,
    hr: HRDashboardLayout,
    admin: AdminDashboardLayout,
    owner: AdminDashboardLayout,
    dpo: AdminDashboardLayout,
    user: PatientDashboardLayout,
} as const;

type RoleKey = keyof typeof LAYOUTS;

/**
 * Nav override for the roles that borrow the admin shell.
 *
 * Without this, `owner` and `dpo` matched nothing in ROLE_PRIORITY and fell
 * through to the `user` default — so the System Owner, the one tier documented
 * as holding no patient access at all, opened Settings inside a patient
 * sidebar offering My Records, Lab Results and Book Appointment. OB-05 of the
 * 2026-09-11 governance walkthrough.
 */
const NAV_OVERRIDES: Partial<Record<RoleKey, NavGroup[]>> = {
    owner: ownerNavGroups,
    dpo: dpoNavGroups,
};

/**
 * Order matters: an account holding both `admin` and `hr` is an administrator
 * who also works the HMO queue, and should get the admin sidebar. Highest
 * privilege wins, so the two governance tiers lead.
 */
const ROLE_PRIORITY: RoleKey[] = [
    'owner',
    'dpo',
    'admin',
    'doctor',
    'hr',
    'nurse',
    'user',
];

/**
 * Settings rendered inside the signed-in role's own dashboard chrome.
 *
 * The starter kit put these pages in `AppLayout` — a header-only shell with a
 * breadcrumb and no sidebar — so opening Settings dropped a doctor out of the
 * workspace they were in and gave them no way back except the browser's back
 * button. Every other page in this app is a role shell with a sidebar, and
 * Settings is not special enough to be the exception.
 */
export function SettingsShell({
    active,
    title,
    children,
}: SettingsShellProps): ReactElement {
    const { auth } = usePage<PageProps>().props;
    const roles = auth?.user?.roles ?? [];

    const roleKey =
        ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'user';
    const Layout = LAYOUTS[roleKey];
    const groups = NAV_OVERRIDES[roleKey];

    const body = (
        <>
            <Head title={title} />

            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 700,
                        letterSpacing: 'var(--tracking-tight)',
                        color: 'var(--wc-text-primary)',
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {settingsMeta.title}
                </h1>
                <p
                    style={{
                        margin: 'var(--space-2) 0 0',
                        fontSize: 'var(--text-base)',
                        lineHeight: 'var(--leading-relaxed)',
                        color: 'var(--wc-text-secondary)',
                        maxWidth: 'var(--measure-base)',
                    }}
                >
                    {settingsMeta.subtitle}
                </p>
            </header>

            <div className="wc-settings-grid">
                <SettingsNav active={active} />
                <section
                    className="wc-settings-main"
                    aria-label={settingsMeta.title}
                >
                    {children}
                </section>
            </div>
        </>
    );

    // Only AdminDashboardLayout takes a nav override, and only the two
    // governance roles need one. Branching here keeps the other four layout
    // signatures free of a prop they would have to accept and ignore.
    if (groups) {
        return (
            <AdminDashboardLayout activeId="settings" groups={groups}>
                {body}
            </AdminDashboardLayout>
        );
    }

    return <Layout activeId="settings">{body}</Layout>;
}
