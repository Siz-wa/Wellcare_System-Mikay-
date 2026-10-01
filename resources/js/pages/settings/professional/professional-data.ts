// resources/js/pages/settings/professional/professional-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static copy for the doctor's professional profile, per the convention in
// CLAUDE.md: text lives here, never inline in JSX.
//
// A lot of this copy is doing legal work rather than decorative work, so it is
// worth saying where it comes from. Three rules shape what this page lets a
// doctor publish:
//
//   • PRC Board of Medicine / PMA Code of Ethics — a physician may publish
//     their name, field of specialty, office hours and affiliation. They may
//     NOT publish claims of personal superiority, certificates, diplomas or
//     postgraduate training, and may not solicit patients by advertisement.
//     That is why the practice statement is short and described as factual,
//     and why there is no field here for awards, ratings or testimonials.
//
//   • RA 10173 (Data Privacy Act) — a licence number is published
//     professional-registry data; a photograph is the doctor's likeness used
//     for the clinic's publicity, which is where consent belongs rather than
//     legitimate interest. Hence a tick-box the doctor owns, and copy that says
//     it can be withdrawn.
//
//   • The clinic's own credentialing rule — a specialty is conferred by an
//     administrator against a certificate, never self-declared. Everything
//     conferred is rendered read-only, and the copy explains who to ask.

export interface DoctorPublicCredentials {
    prc_license_no: string | null;
    verified_on: string | null;
    board: string | null;
}

/** What patients see. Mirrors App\Http\Resources\DoctorResource. */
export interface DoctorPublicPreview {
    id: number;
    name: string;
    specialty: string;
    specialization: string;
    initials: string;
    color: string;
    is_active: boolean;
    photo_url: string | null;
    profile_url: string;
    bio: string | null;
    languages: string | null;
    practising_since: number | null;
    credentials: DoctorPublicCredentials | null;
    schedules?: { days: string; hours: string }[];
}

/** Upload limits, resolved server-side by DoctorPhotoStorage. */
export interface PhotoLimits {
    /** "12 MB" — the clinic's cap, already clamped to what PHP will accept. */
    maxLabel: string;
    minEdge: number;
    types: string;
}

export interface ProfessionalProfileFields {
    displayName: string;
    specialty: string;
    specialtyLabel: string;
    specialization: string | null;
    bio: string;
    languages: string;
    practisingSince: number | null;
    isPublished: boolean;
    hasPhoto: boolean;
    publishPhoto: boolean;
    photoUrl: string | null;
    publicUrl: string;
}

/** The doctor's own credentialing file, in full. Never sent to a patient. */
export interface CredentialFile {
    status: string;
    statusLabel: string;
    statusTone: string;
    prcLicenseNo: string | null;
    prcExpiresOn: string | null;
    ptrNo: string | null;
    ptrIssuedAtLgu: string | null;
    ptrExpiresOn: string | null;
    philhealthAccreditationNo: string | null;
    s2LicenseNo: string | null;
    specialtyBoard: string | null;
    boardStatusLabel: string;
    medicalCertificateOn: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    daysUntilExpiry: number | null;
    hasLapsed: boolean;
    remarks: string | null;
}

export const professionalCopy = {
    roster: {
        title: 'Your clinic roster entry',
        description:
            'How the clinic lists you. These are set by the clinic administrator against the documents on your file — ask them if anything here is wrong.',
        publishedYes:
            'You are published. Patients can find you in the directory and book you.',
        publishedNo:
            'You are not published, so patients cannot see or book you. This follows your credentialing status below.',
    },

    credentials: {
        title: 'Credentials on file',
        description:
            'What the clinic holds on you, and where it stands. Only an administrator can change these.',
        empty: 'No credentialing file has been recorded for your account yet. The clinic administrator files your PRC registration, PTR and specialty board certificate before you can be published to patients.',
        // The disclosure rule, stated to the person whose data it is.
        published:
            'Patients see only your PRC registration number and your specialty board standing, and only while this file is verified. Your PTR, PhilHealth accreditation and S2 licence are never shown to patients.',
        expiryWarning:
            'Renew before this date. A lapsed PRC or PTR unpublishes you automatically and cancels nothing that is already booked — the clinic has to move those visits by hand.',
        lapsed: 'A licence on this file has lapsed, so you are no longer published to patients. Send the renewed document to the clinic administrator.',
    },

    photo: {
        title: 'Your photo',
        description:
            'Shown beside your name in the directory and the booking picker, so a patient can recognise you at the clinic.',
        uploadLabel: 'Choose a photo',
        replaceLabel: 'Replace photo',
        removeLabel: 'Remove photo',
        submitLabel: 'Upload',
        // Built from the server's own numbers rather than written out here.
        // The cap depends on the host's `upload_max_filesize`, so a hardcoded
        // "up to 4 MB" would eventually promise a size the server refuses.
        hint: (limits: PhotoLimits): string =>
            `${limits.types}, at least ${limits.minEdge} × ${limits.minEdge} pixels, up to ${limits.maxLabel}. A plain head-and-shoulders photo works best.`,
        empty: 'No photo uploaded. Patients currently see your initials.',
        // The state that reads as a bug and is not one: the file is uploaded,
        // the doctor can see it on this page and in their own dashboard header,
        // and the directory still shows initials because consent was never
        // given. Nothing said so, so it looked like the photo had failed.
        unpublished:
            'Patients still see your initials. This photo is not published until you tick the box below and save.',
        consentLabel: 'Show my photo to patients',
        // RA 10173. Uploading is not publishing, and this is where that is said.
        consentHint:
            'Your photo is published only while this is ticked. Publishing your likeness is your decision, and you can withdraw it at any time — untick this box and the photo disappears from every page at once. Removing the photo deletes the file and withdraws this permission with it.',
    },

    practice: {
        title: 'Practice details',
        description:
            'The part of your entry only you can supply. Optional, and shown to patients exactly as written.',
        bioLabel: 'Practice statement',
        bioHint:
            'Factual only — what you treat and how you practise. Under the PRC Board of Medicine and PMA Code of Ethics a physician may publish their name, field of specialty, office hours and affiliation, but not claims of personal superiority, certificates, diplomas or postgraduate training, and may not solicit patients by advertisement.',
        bioPlaceholder:
            'e.g. General adult and adolescent consultations, chronic disease follow-up, and pre-employment medical examinations.',
        languagesLabel: 'Languages you consult in',
        languagesHint:
            'Separate with commas — e.g. Filipino, English, Cebuano.',
        languagesPlaceholder: 'Filipino, English',
        sinceLabel: 'Practising since',
        sinceHint:
            'The year you began practising. Shown as a year, not as a count of years, so it never goes stale.',
    },

    preview: {
        title: 'What patients see',
        description:
            'Your public profile, exactly as a patient reads it. Anything missing here is either unset above or withheld because your credentials are not currently verified.',
        openLabel: 'Open my public profile',
        unpublished:
            'Nothing on this page is visible to patients while you are unpublished. It is shown here so you can prepare it.',
        noCredentials:
            'No credentials are shown to patients yet. They appear once an administrator verifies your file.',
    },
};

/** Right-hand label for each read-only credential row. */
export const credentialRows: {
    key: keyof CredentialFile;
    label: string;
    /** True when patients can see this value on the public profile. */
    publicToPatients: boolean;
}[] = [
    {
        key: 'prcLicenseNo',
        label: 'PRC registration no.',
        publicToPatients: true,
    },
    { key: 'prcExpiresOn', label: 'PRC expires', publicToPatients: false },
    { key: 'ptrNo', label: 'PTR no.', publicToPatients: false },
    { key: 'ptrIssuedAtLgu', label: 'PTR issued by', publicToPatients: false },
    { key: 'ptrExpiresOn', label: 'PTR expires', publicToPatients: false },
    { key: 'specialtyBoard', label: 'Specialty board', publicToPatients: true },
    {
        key: 'boardStatusLabel',
        label: 'Board standing',
        publicToPatients: true,
    },
    {
        key: 'philhealthAccreditationNo',
        label: 'PhilHealth accreditation no.',
        publicToPatients: false,
    },
    { key: 's2LicenseNo', label: 'S2 licence no.', publicToPatients: false },
    {
        key: 'medicalCertificateOn',
        label: 'Annual medical certificate',
        publicToPatients: false,
    },
];
