// resources/js/pages/admin/services/services-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Static copy and types for Manage Services. No markup, no logic — the same
// split every other feature folder uses.

export interface AdminServiceRow {
    id: number;
    slug: string;
    name: string;
    description: string;
    /** DB specialty slugs, or null for "any rostered doctor". */
    specialties: string[] | null;
    specialtyLabels: string[];
    requiresInPerson: boolean;
    /** Null means the service is not offered over video at all. */
    virtualFee: number | null;
    restrictedToSex: 'female' | 'male' | null;
    maxAge: number | null;
    minAge?: number | null;
    isActive: boolean;
    sortOrder: number;
    /** Appointments already recorded against this slug. Locks the slug. */
    bookings: number;
}

export interface SpecialtyOption {
    value: string;
    label: string;
}

export const servicesCopy = {
    activeNavId: 'services',
    pageTitle: 'Manage Services',
    pageSubtitle:
        'What the clinic offers. Changes reach the booking form immediately — there is nothing to rebuild or deploy.',
    addLabel: 'Add a service',
    addTitle: 'Add a service',
    editTitle: 'Edit service',

    // The question an administrator asks first on this screen, answered before
    // they go looking for a delete button that is deliberately absent.
    retireNotice:
        'Services are retired, never deleted. Switching one off removes it from the booking form and from the doctor picker at once, while every appointment already booked against it keeps its name in the records and the reports.',

    slugLockedHint:
        'Locked: appointments are already recorded against this slug, and renaming it would detach them from the catalogue. The name above is what patients read — change that instead.',
    slugFreeHint:
        'The internal key, used in booking links. Lowercase and hyphens only. It can be changed until the first appointment is booked.',

    specialtiesHint:
        'Which doctors may take it. Select none for services any rostered doctor delivers — a blood draw, a scan, an annual physical.',
    anyDoctorLabel: 'Any rostered doctor',

    inPersonHint:
        'Hides the video option rather than rejecting it on submit. For anything that needs the patient in the building.',
    maxAgeHint: 'Leave blank for no age limit. Pediatrics uses 18.',
    minAgeHint:
        'Leave blank for no lower limit. Internal Medicine uses 18; OB-Gyne 12.',
    virtualFeeHint:
        'What a self-paying patient is charged for this service over video. Leave blank if it is not offered over video — the patient then falls back to the clinic’s default fee. The amount is snapshotted onto each booking, so re-pricing never changes what someone already paid.',
    sexHint:
        'Only ever excludes the opposite answer. A patient who declined to state a sex is excluded from nothing.',
    sortOrderHint:
        'Low numbers first. The seeded catalogue is numbered in tens, so 45 places a service between two existing ones.',
} as const;

export const sexOptions: SpecialtyOption[] = [
    { value: '', label: 'Anyone' },
    { value: 'female', label: 'Female patients only' },
    { value: 'male', label: 'Male patients only' },
];

/** The statistics strip above the table. StatCard takes no hint. */
export const serviceStatCards = [
    { key: 'total', label: 'Services' },
    { key: 'active', label: 'Bookable now' },
    { key: 'retired', label: 'Retired' },
    { key: 'inPerson', label: 'In-person only' },
] as const;

/** Derive a URL-safe slug from a service name, for the create form. */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}
