// resources/js/pages/settings/settings-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static copy and nav for the account settings area, per the convention in
// CLAUDE.md: text and lists live here, never inline in JSX.
//
// Settings is the one feature in this app that is genuinely shared by all five
// roles, so it has no `<role>/` prefix — the shell picks the right chrome at
// render time (see layout/settings-shell.tsx).

export type SettingsSectionId =
    | 'profile'
    | 'professional'
    | 'security'
    | 'notifications'
    | 'accessibility'
    | 'privacy';

export interface SettingsNavItem {
    id: SettingsSectionId;
    label: string;
    description: string;
    href: string;
    /** Must match a key in ICON_MAP inside components/settings-nav.tsx. */
    iconKey:
        | 'user'
        | 'shield'
        | 'bell'
        | 'accessibility'
        | 'lock'
        | 'stethoscope';
    /**
     * Roles this item is shown to. Absent means everyone.
     *
     * Presentation only — the route itself is gated by `role:doctor` middleware
     * in routes/settings.php. Hiding a link is not access control, and the two
     * are deliberately separate: this decides what is worth showing, that
     * decides what is allowed.
     */
    roles?: string[];
}

export const settingsNav: SettingsNavItem[] = [
    {
        id: 'profile',
        label: 'Profile',
        description: 'Your name, contact details and email address.',
        href: '/settings/profile',
        iconKey: 'user',
    },
    {
        id: 'professional',
        label: 'Professional profile',
        description: 'Your photo, practice details and credentials on file.',
        href: '/settings/professional',
        iconKey: 'stethoscope',
        roles: ['doctor'],
    },
    {
        id: 'security',
        label: 'Security',
        description: 'Password, two-factor authentication and active sessions.',
        href: '/settings/security',
        iconKey: 'shield',
    },
    {
        id: 'notifications',
        label: 'Notifications',
        description: 'Choose what the clinic contacts you about.',
        href: '/settings/notifications',
        iconKey: 'bell',
    },
    {
        id: 'accessibility',
        label: 'Accessibility',
        description: 'Text size and contrast for easier reading.',
        href: '/settings/accessibility',
        iconKey: 'accessibility',
    },
    {
        id: 'privacy',
        label: 'Privacy & data',
        description: 'Download your data, or close your account.',
        href: '/settings/privacy',
        iconKey: 'lock',
    },
];

export const settingsMeta = {
    title: 'Account Settings',
    subtitle:
        'Manage your personal information, sign-in security and how WellCare contacts you.',
};

// ── Profile page ─────────────────────────────────────────────────────────────

export const profileCopy = {
    identity: {
        title: 'Personal information',
        description:
            'The name the clinic uses on your records and appointment slips.',
    },
    contact: {
        title: 'Contact details',
        description:
            'How the clinic reaches you about appointments and results.',
    },
    account: {
        title: 'Sign-in email',
        description:
            'Used to sign in and to send appointment confirmations. Changing it means verifying the new address.',
    },
    danger: {
        title: 'Close this account',
        description:
            'Deleting your account permanently removes your profile and booking history. This cannot be undone.',
    },
};

/**
 * `patient_profiles.gender` is a MySQL ENUM of exactly ['M','F'].
 *
 * NOT the male/female/other used by the separate `patients` table — those are
 * two different tables for two different things (see the User vs Patient note
 * in CLAUDE.md). Sending 'male' here is rejected by the database driver.
 */
export const genderOptions = [
    // A real, selectable empty option rather than the design system's
    // `placeholder` prop, which renders `<option value="" disabled>`. A
    // disabled placeholder is fine on a create form and wrong here: it would
    // let someone set a value and never take it back, while the column is
    // nullable and the controller clears it happily.
    { value: '', label: 'Prefer not to say' },
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
];

export const civilStatusOptions = [
    { value: '', label: 'Prefer not to say' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'separated', label: 'Separated' },
    { value: 'annulled', label: 'Annulled' },
];

// ── Security page ────────────────────────────────────────────────────────────

export const securityCopy = {
    password: {
        title: 'Update password',
        description:
            'Use a long, unique password. A clinical account protects other people’s medical records, not only your own.',
    },
    twoFactor: {
        title: 'Two-factor authentication',
        description:
            'Adds a six-digit code from your phone to every sign-in, so a stolen password is not enough on its own.',
        setupExpired:
            'Your previous setup was left unfinished and has expired, so the code you scanned no longer works. Start again below and scan the new QR code.',
        pending:
            'Setup has been started but not finished. Your account is not protected until you enter a code from your authenticator app.',
    },
    twoFactorRequired: {
        title: 'Set up two-factor authentication to continue',
        // Answers, in order, the two questions a redirect like this raises:
        // why am I on this page, and why did the link I clicked not work.
        body: 'Staff accounts can open patient records, so this clinic requires a second sign-in factor on every one of them. Until it is set up, the rest of the app will keep sending you back to this page.',
        returnPrefix: 'You were on your way to',
        returnSuffix: 'We will take you back there as soon as this is done.',
    },
    // GV-9. Same job as `twoFactorRequired` above, for the other gate that can
    // pin an account to this page. EnsurePasswordIsChanged flashes this
    // sentence, but a flash survives one redirect and this chain is two —
    // settings sits behind password confirmation — so a provisioned account
    // arrived here with no explanation at all. Derived from account state for
    // the same reason the 2FA notice is.
    passwordChangeRequired: {
        title: 'Choose your own password to continue',
        body: 'This account is still using the password it was created with, which means somebody else has typed it. Set a password only you know and the rest of the app opens up.',
        returnPrefix: 'You were on your way to',
        returnSuffix: 'We will take you back there as soon as this is done.',
    },
    sessions: {
        title: 'Active sessions',
        description:
            'Every browser currently signed in to this account. If you do not recognise one — or you signed in on a clinic workstation — sign the others out.',
        unsupported:
            'Session listing is unavailable because this installation is not using the database session driver.',
    },
    activity: {
        title: 'Recent account activity',
        description:
            'Sign-ins, sign-outs and failed attempts on this account. Anything you do not recognise is worth a password change.',
        empty: 'No account activity has been recorded yet.',
    },
};

// ── Notifications page ───────────────────────────────────────────────────────

export const notificationsCopy = {
    title: 'Notification preferences',
    description:
        'Choose which updates reach you, and where. Critical laboratory results and account-security alerts are always sent.',
    saved: 'Preferences saved.',
};

// ── Privacy page ─────────────────────────────────────────────────────────────

export const privacyCopy = {
    export: {
        title: 'Download your data',
        description:
            'A JSON file containing your profile, the patients you book for, your appointment history and the clinical entries on your record. Uploaded document files are listed by name; download the files themselves from My Records.',
        action: 'Download my data',
    },
    holdings: {
        title: 'What WellCare holds about you',
        description: 'A summary of the records attached to this account today.',
    },
    rights: {
        title: 'Your rights',
        description:
            'Under the Data Privacy Act of 2012 (RA 10173) you may access, correct, and obtain a copy of the personal data WellCare holds about you. Corrections to clinical entries are made by the clinic — contact the Dasmariñas branch and the record will be amended.',
    },
};

export const holdingsLabels: Record<string, string> = {
    patients: 'Patients you book for',
    appointments: 'Appointments',
    documents: 'Uploaded documents',
    allergies: 'Recorded allergies',
    diagnoses: 'Recorded diagnoses',
};
