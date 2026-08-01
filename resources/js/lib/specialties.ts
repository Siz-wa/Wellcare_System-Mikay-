// Shared mapping for doctor_profiles.specialty slugs.
//
// The DB stores lowercase slugs ("obstetrics"); every surface that shows a
// doctor renders the same human label from here. Keep this the only place the
// mapping lives — it previously existed only inside step-coverage.tsx, while
// the public doctors page carried its own unrelated vocabulary, which is how
// the same doctor ended up labelled differently on different pages.

export const SPECIALTY_LABELS: Record<string, string> = {
    general: 'General / Family Medicine',
    internal_medicine: 'Internal Medicine',
    pediatrics: 'Pediatrics',
    cardiology: 'Cardiology',
    dermatology: 'Dermatology',
    orthopedics: 'Orthopedics',
    obstetrics: 'OB-Gynecology',
};

/** Readable label for a specialty slug. Unknown slugs are title-cased. */
export function specialtyLabel(slug: string): string {
    return (
        SPECIALTY_LABELS[slug] ??
        slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

/**
 * The role line shown under a doctor's name. Prefers the free-text
 * `specialization` ("Obstetrics & Gynecology") and falls back to the label for
 * the `specialty` slug.
 *
 * Use this on EVERY surface that shows a doctor. Mixing it with a bare
 * specialtyLabel() call is what made the same doctor read differently on the
 * booking picker and their own profile.
 */
export function doctorRoleLabel(doctor: {
    specialization?: string | null;
    specialty: string;
}): string {
    return doctor.specialization?.trim() || specialtyLabel(doctor.specialty);
}

/** Doctor shape shared by the booking picker and the public doctors page. */
export interface DoctorSummary {
    id: number;
    name: string;
    specialty: string;
    specialization: string;
    initials: string;
    color: string;
    is_active: boolean;
    schedules?: { days: string; hours: string }[];
}
