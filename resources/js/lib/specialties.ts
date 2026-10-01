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

/**
 * The two credentials a patient may be shown, and only while the doctor's
 * credentialing file is verified and unlapsed. Null on the whole object when it
 * is not — see App\Http\Resources\DoctorResource, which is the only place
 * that decision is made.
 */
export interface DoctorCredentials {
    prc_license_no: string | null;
    verified_on: string | null;
    /** "Diplomate, Philippine Board of Pediatrics", or null for a GP. */
    board: string | null;
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
    /** Null unless the doctor has consented to their photograph being shown. */
    photo_url: string | null;
    profile_url: string;
    bio: string | null;
    languages: string | null;
    practising_since: number | null;
    credentials: DoctorCredentials | null;
    schedules?: { days: string; hours: string }[];
}

/**
 * The credential line under a doctor's name — "PRC 0123456 · Diplomate,
 * Philippine Board of Pediatrics" — or null when there is nothing verified to
 * show.
 *
 * Here rather than in a component for the same reason doctorRoleLabel is: every
 * surface that lists a doctor renders this, and three copies of the formatting
 * is how the same doctor ends up reading differently on different pages.
 */
export function doctorCredentialLine(doctor: {
    credentials?: DoctorCredentials | null;
}): string | null {
    const credentials = doctor.credentials;

    if (!credentials?.prc_license_no) {
        return null;
    }

    return credentials.board
        ? `PRC ${credentials.prc_license_no} · ${credentials.board}`
        : `PRC ${credentials.prc_license_no}`;
}
