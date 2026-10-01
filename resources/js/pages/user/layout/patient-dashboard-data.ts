// resources/js/pages/user/layout/patient-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the patient portal.
//
// Two surfaces read this file and they must not drift apart:
//
//   • `primaryTabs`  — the fixed bottom tab bar, phones only (< 768px).
//   • `navGroups`    — the sidebar, tablet and up.
//
// The bottom bar is capped at FIVE destinations, which is the one hard rule in
// every current mobile-navigation guideline: past five, a tab bar is measurably
// worse than the drawer it replaced. Everything that does not earn a tab lives
// under `More`, which opens a sheet rather than navigating — so nothing in the
// portal is ever more than three taps away.
//
// The sidebar keeps the fuller list because a 260px rail can afford it, but the
// LABELS are shared. Renaming a task between two surfaces is the single most
// reported source of "I can't find it" in patient-portal research, so the tab
// label and the sidebar label for the same destination differ only by the
// leading "My" the tab bar has no room for.

/** Icon keys are a closed union — every key needs a matching entry in ICON_MAP
 *  inside components/PatientAppSidebar.tsx, or the sidebar fails to type. */
export type IconKey =
    | 'dashboard'
    | 'schedule'
    | 'patients'
    | 'consultations'
    | 'labreviews'
    | 'records'
    | 'settings'
    | 'video'
    | 'payments'
    | 'more';

export interface NavItem {
    id: string;
    label: string;
    href: string;
    iconKey: IconKey;
}

export interface NavGroup {
    groupLabel: string;
    items: NavItem[];
}

/**
 * A bottom-bar destination.
 *
 * `owns` lists the `activeId`s that light this tab up. A tab stands for a whole
 * area, not one page — opening Lab Results must not make the bar look like the
 * patient has left Records, or the bar stops telling them where they are.
 */
export interface TabItem {
    id: string;
    label: string;
    href: string;
    iconKey: IconKey;
    owns: string[];
    /** Renders as the raised brand button in the middle of the bar. */
    primary?: boolean;
}

export const primaryTabs: TabItem[] = [
    {
        id: 'dashboard',
        label: 'Home',
        href: '/user/dashboard',
        iconKey: 'dashboard',
        owns: ['dashboard'],
    },
    {
        id: 'records',
        label: 'Records',
        href: '/user/records',
        iconKey: 'records',
        // Lab results are a kind of record, and the patient looking for a blood
        // test result does not first decide whether it is filed as a "record".
        owns: ['records', 'lab-results'],
    },
    {
        id: 'schedule',
        label: 'Book',
        href: '/book',
        iconKey: 'schedule',
        owns: ['schedule'],
        primary: true,
    },
    {
        id: 'my-patients',
        label: 'Family',
        href: '/user/patients',
        iconKey: 'patients',
        owns: ['my-patients'],
    },
    {
        id: 'more',
        label: 'More',
        // Opens the sheet; the href is the sheet's no-JS fallback.
        href: '/settings/profile',
        iconKey: 'more',
        owns: ['consultations', 'loa-status', 'payments', 'settings', 'more'],
    },
];

/** Resolve a page's `activeId` to the tab that should be lit. */
export function tabIdForActiveId(activeId: string): string {
    const owner = primaryTabs.find((tab) => tab.owns.includes(activeId));

    return owner?.id ?? '';
}

const myHealth: NavGroup = {
    groupLabel: 'MY HEALTH',
    items: [
        {
            id: 'dashboard',
            label: 'Home',
            href: '/user/dashboard',
            iconKey: 'dashboard',
        },
        {
            // Not `patients` — the FAQs entry below already claims that id.
            id: 'my-patients',
            label: 'My Family',
            href: '/user/patients',
            iconKey: 'patients',
        },
        {
            id: 'records',
            label: 'My Records',
            href: '/user/records',
            iconKey: 'records',
        },
        {
            id: 'lab-results',
            label: 'Lab Results',
            href: '/user/lab-results',
            iconKey: 'labreviews',
        },
        {
            // Was "LOA Status". A Letter of Authorization is what the HMO calls
            // it; the patient is waiting to hear whether their HMO said yes.
            id: 'loa-status',
            label: 'HMO Approvals',
            href: '/user/loa-status',
            iconKey: 'consultations',
        },
        {
            id: 'consultations',
            label: 'Video Consultations',
            href: '/user/consultations',
            iconKey: 'video',
        },
        {
            // Directly under Video Consultations, because that is the only kind
            // of visit that ever appears here — an in-person one is paid at the
            // clinic cashier and never reaches this page.
            id: 'payments',
            label: 'Payments',
            href: '/user/payments',
            iconKey: 'payments',
        },
    ],
};

const booking: NavGroup = {
    groupLabel: 'BOOKING',
    items: [
        {
            id: 'schedule',
            label: 'Book Appointment',
            href: '/book',
            iconKey: 'schedule',
        },
    ],
};

const account: NavGroup = {
    // Settings is reachable from the account menu in the topbar too, but a
    // sidebar entry is what people actually look for — and until this existed,
    // no role's sidebar linked to it at all.
    groupLabel: 'ACCOUNT',
    items: [
        {
            id: 'settings',
            label: 'Settings',
            href: '/settings/profile',
            iconKey: 'settings',
        },
    ],
};

const site: NavGroup = {
    // The public marketing pages. These sit LAST and under their own heading:
    // mixing them into the portal's task list is the menu bloat that pushes the
    // things a patient actually came for below the fold.
    groupLabel: 'WELLCARE SITE',
    items: [
        { id: 'home', label: 'Home Page', href: '/', iconKey: 'records' },
        {
            id: 'doctors',
            label: 'Doctors List',
            href: '/doctors',
            iconKey: 'records',
        },
        {
            id: 'contact',
            label: 'Contact Us',
            href: '/contact',
            iconKey: 'records',
        },
        { id: 'patients', label: 'FAQs', href: '/faqs', iconKey: 'records' },
    ],
};

/** The sidebar, tablet and up. */
export const navGroups: NavGroup[] = [myHealth, booking, account, site];

/**
 * The `More` sheet, phones only: everything the five tabs do not already reach.
 *
 * Derived from `navGroups` rather than listed again, so a destination added to
 * the sidebar can never go missing on phones — the one failure mode a hand
 * written second list guarantees eventually.
 */
// `more` is excluded deliberately. It is not a destination — its href is only
// a no-JS fallback — and counting it here filtered Settings, the page that
// fallback points at, straight out of the sheet it was meant to open.
const tabbedHrefs = new Set(
    primaryTabs.filter((tab) => tab.id !== 'more').map((tab) => tab.href),
);

export const moreGroups: NavGroup[] = navGroups
    .map((group) => ({
        ...group,
        items: group.items.filter((item) => !tabbedHrefs.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);

export const patientDashboardMeta = {
    searchPlaceholder: 'Search appointments…',
    activeNav: 'dashboard',
};
