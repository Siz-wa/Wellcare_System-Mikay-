// resources/js/pages/user/book-appointment/sections/bookingdata.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static data and types for the booking form.

/**
 * Anyone this age or under is billed to their guarantor: they cannot hold their
 * own HMO or PhilHealth membership, so no coverage chooser is shown for them.
 * Mirrors Patient::MINOR_MAX_AGE, which is the enforcement.
 *
 * Declared first because the copy below interpolates it — a `const` used above
 * its declaration is a temporal-dead-zone error at module load, not a hoist.
 */
export const MINOR_MAX_AGE = 18;

export const bookingMeta = {
    label: 'Book an Appointment',
    heading: { line1: 'Request an', line2: 'Appointment.' },
    body: "Complete the steps below to schedule your visit. We'll confirm your booking within 36 hours.",
    disclaimer:
        'Please expect a confirmation email from our team within 36 hours of submitting this form.',
    hipaa: 'Your data is encrypted and HIPAA-compliant.',
    successHeading: { line1: 'Appointment', line2: 'Requested!' },
    successBody:
        'Your booking request has been received. Expect a confirmation email within 36 hours.',
};

// Three steps, not four. Personal information used to be step 1 and was retyped
// on every single booking; it now lives on the patient record, captured once,
// and the wizard starts after the patient has been chosen.
export const STEPS = [
    { id: 1 as const, label: 'Appointment' },
    { id: 2 as const, label: 'Coverage' },
    { id: 3 as const, label: 'Review & Submit' },
];

export type StepId = (typeof STEPS)[number]['id'];

export const STEP_HEADINGS: Record<
    StepId,
    { title: string; subtitle: string }
> = {
    1: {
        title: 'Appointment Details',
        subtitle: 'Choose the service and schedule for this visit.',
    },
    2: {
        title: 'Coverage & Doctor Preference',
        subtitle:
            "Let us know how you'll be covering this visit and if you have a preferred doctor.",
    },
    3: {
        title: 'Review Your Appointment',
        subtitle:
            'Please check all details before submitting. You can go back to edit any section.',
    },
};

export interface SelectOption {
    value: string;
    label: string;
}

export interface CoverageOption extends SelectOption {
    icon: 'cash' | 'hmo' | 'philhealth' | 'corporate';
}

// ── Doctor shape ─────────────────────────────────────────────────────────────

export interface DoctorOption {
    id: number;
    name: string;
    specialty: string;
    specialization: string;
    initials: string;
    color: string;
    is_active: boolean;
    availableSlots?: number;
}

export const genderOptions: SelectOption[] = [
    { value: '', label: 'Select biological sex' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Prefer not to say' },
];

export const branchOptions: SelectOption[] = [
    { value: '', label: 'Choose a branch' },
    { value: 'dasmarinas', label: 'Wellcare Dasmarinas' },
];

export const civilStatusOptions: SelectOption[] = [
    { value: '', label: 'Select civil status' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
];

// New vs returning is no longer asked. It is a fact about the patient's record,
// not an opinion they hold about it, so BookingService derives it from their
// own visit history — a first-time child is no longer filed as "returning"
// because their mother had visited before.

/**
 * Who you can add. "Myself" is deliberately absent: the account holder's own
 * patient record is created with the account, so offering it here would only
 * ever produce a duplicate — which SavePatientRequest refuses anyway.
 *
 * `self` remains a valid stored value; it is just not something you pick.
 */
export const relationshipOptions: SelectOption[] = [
    { value: '', label: 'Select relationship' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'other', label: 'Other' },
];

export const RELATIONSHIP_LABELS: Record<string, string> = {
    self: 'Myself',
    spouse: 'Spouse',
    child: 'Child',
    parent: 'Parent',
    sibling: 'Sibling',
    other: 'Other',
};

export const patientGateCopy = {
    title: 'Who is this appointment for?',
    subtitle:
        'Your account can hold everyone you book for. Pick a patient, or add someone new — their details are only ever typed once.',
    addLabel: 'Add someone new',
    emptyTitle: 'No patients yet',
    emptyBody:
        'Add the first person you want to book for. You will not have to fill this in again.',
    manageLabel: 'Manage my patients',
    cancelLabel: 'Not now',
    // Shown on records that predate the age/sex requirement. Appointments need
    // both, so the gate sends these to the edit sheet rather than the wizard.
    needsDetails: 'Tap to complete their details before booking',
};

export const patientSheetCopy = {
    addTitle: 'Add a patient',
    addSubtitle:
        'These details are saved to their record, so every future booking is just a date and a time.',
    editTitle: 'Edit patient',
    editSubtitle: 'Update the details on this patient’s record.',
    coverageHint:
        'Optional. If you set it, the Coverage step arrives already filled for this patient.',
    minorCoverageNotice: `Patients aged ${MINOR_MAX_AGE} and under are billed to their guarantor, so there is no coverage to set here.`,
};

export const MINOR_COVERAGE_NOTICE = `This patient is ${MINOR_MAX_AGE} or under, so the visit is billed to you as their guarantor. No coverage details are needed.`;

export const consultationTypeOptions: SelectOption[] = [
    { value: 'in_person', label: 'In-Person Visit' },
    { value: 'virtual', label: 'Video Consultation' },
];

/**
 * Services that need the patient physically present — a blood draw, a scan,
 * hands-on therapy. Selecting one hides the video option entirely rather than
 * showing a choice that would be rejected on submit.
 *
 * Mirrors BookAppointmentRequest::IN_PERSON_ONLY_SERVICES, which is the actual
 * enforcement — this list is only what keeps the user from picking an
 * impossible combination in the first place.
 */
export const IN_PERSON_ONLY_SERVICES = [
    'laboratory',
    'imaging',
    'physical-therapy',
];

export const supportsVirtual = (service: string): boolean =>
    service !== '' && !IN_PERSON_ONLY_SERVICES.includes(service);

export const CONSULTATION_TYPE_HINT =
    'Video consultations run in your browser — no app to install. You will get a join link on this dashboard when your doctor starts the session.';

export const IN_PERSON_ONLY_NOTICE =
    'This service must be done at the clinic, so it is booked as an in-person visit.';

export const serviceOptions: SelectOption[] = [
    { value: '', label: 'Select a service' },
    { value: 'general', label: 'General Consultation' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'pediatrics', label: 'Pediatrics' },
    { value: 'ob-gyne', label: 'OB-Gyne' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'laboratory', label: 'Laboratory Services' },
    { value: 'imaging', label: 'Imaging / Radiology' },
    { value: 'physical-therapy', label: 'Physical Therapy' },
];

// ── Service eligibility ──────────────────────────────────────────────────────
// Some services only apply to part of the patient population. A service listed
// here is hidden once the patient's answers rule it out.
//
//   sex: "female"  → hidden when gender === "male". Deliberately still shown for
//                    "other"/prefer-not-to-say — we don't exclude someone who
//                    declined to answer.
//   maxAge: 18     → hidden once age exceeds 18.
//
// Blank age/gender shows everything: the patient hasn't answered yet (Step 1),
// so we can't rule anything out.

export const SERVICE_ELIGIBILITY: Record<
    string,
    { sex?: 'female'; maxAge?: number }
> = {
    'ob-gyne': { sex: 'female' },
    pediatrics: { maxAge: 18 },
};

export function isServiceEligible(
    value: string,
    gender: string,
    age: string,
): boolean {
    const rule = SERVICE_ELIGIBILITY[value];

    if (!rule) {
        return true;
    }

    if (rule.sex === 'female' && gender === 'male') {
        return false;
    }

    if (rule.maxAge !== undefined && age !== '') {
        const parsed = Number(age);

        if (Number.isFinite(parsed) && parsed > rule.maxAge) {
            return false;
        }
    }

    return true;
}

/** `serviceOptions` narrowed to what this patient can actually book. */
export function eligibleServices(gender: string, age: string): SelectOption[] {
    return serviceOptions.filter((o) =>
        isServiceEligible(o.value, gender, age),
    );
}

export const coverageOptions: CoverageOption[] = [
    { value: 'cash', label: 'Cash / Self-Pay', icon: 'cash' },
    { value: 'hmo', label: 'HMO', icon: 'hmo' },
    { value: 'philhealth', label: 'PhilHealth', icon: 'philhealth' },
];

export const hmoOptions: SelectOption[] = [
    { value: '', label: 'Select HMO provider' },
    { value: 'maxicare', label: 'Maxicare' },
    { value: 'medicard', label: 'Medicard' },
    { value: 'intellicare', label: 'Intellicare' },
    { value: 'philcare', label: 'PhilCare' },
    { value: 'carenet', label: 'CareNet' },
    { value: 'other', label: 'Other' },
];

export const TIME_SLOTS: string[] = [
    '8:00 AM',
    '8:30 AM',
    '9:00 AM',
    '9:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '1:00 PM',
    '1:30 PM',
    '2:00 PM',
    '2:30 PM',
    '3:00 PM',
    '3:30 PM',
    '4:00 PM',
    '4:30 PM',
];

// ── Service to Specialty mapping ──────────────────────────────────────────────
// Values MUST match the `specialty` column in doctor_profiles exactly.
// null = show ALL doctors (no specialty filter).

export const SERVICE_TO_SPECIALTIES: Record<string, string[] | null> = {
    general: null,
    cardiology: ['cardiology'],
    dermatology: ['dermatology'],
    pediatrics: ['pediatrics'],
    'ob-gyne': ['obstetrics'],
    orthopedics: ['orthopedics'],
    laboratory: null,
    imaging: null,
    'physical-therapy': null,
};

export const REVIEW_LABELS: Record<string, string> = {
    fullName: 'Full Name',
    email: 'Email',
    contactNumber: 'Contact Number',
    ageGender: 'Age / Gender',
    service: 'Service',
    branch: 'Branch',
    appointmentDate: 'Preferred Date',
    appointmentTime: 'Time Slot',
    relationship: 'Relationship',
    consultationType: 'Consultation Type',
    coverage: 'Mode of Coverage',
    hmo: 'HMO Provider',
    hmoId: 'HMO ID Number',
    preferredDoctor: 'Preferred Doctor',
};

export const HMO_NOTICE =
    'HMO appointments are subject to coverage verification by our HR team before being forwarded to the doctor. You will receive a notification once your HMO is verified.';

// ── Form data ─────────────────────────────────────────────────────────────────

export interface BookingFormData {
    /** Who the appointment is for. Chosen at the gate, before the wizard. */
    patientId: number | null;
    service: string;
    branch: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationType: string;
    coverage: string;
    hmo: string;
    hmoId: string;
    doctorId: number | null;
    additionalInfo: string;
}

/**
 * A person this account books for, from GuarantorPatientController::mapPatient().
 *
 * Age and gender drive the service-eligibility filter that used to read the
 * Step 1 inputs; coverage seeds the Coverage step so a repeat HMO visit is not
 * retyped. The server re-reads all of it off the record at submit time — these
 * values are for display and prefill only.
 */
export interface PatientOption {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    initials: string;
    clinicId: string | null;
    email: string;
    contactNumber: string;
    age: number | null;
    gender: string | null;
    birthdate: string | null;
    address: string | null;
    civilStatus: string | null;
    company: string | null;
    relationship: string | null;
    /** Free text for relationship === 'other'. */
    relationshipNote: string | null;
    /** Display form, already resolving 'other' to its note. */
    relationshipLabel: string | null;
    /** Billed to their guarantor, so the Coverage step does not ask them to choose. */
    isMinor: boolean;
    /** Birthdate or sex is missing, so this record cannot be booked until it is filled. */
    needsDetails: boolean;
    defaultCoverage: string | null;
    hmoProvider: string | null;
    hmoId: string | null;
    appointmentCount: number;
    documentCount: number;
}

/**
 * The bookable date range, computed server-side.
 *
 * Both ends used to be derived in the browser from a hardcoded 365 days, which
 * disagreed with the server's 3-month rule and let patients pick dates a year
 * out that were then rejected on submit. `toISOString()` on a local midnight
 * also shifted the string back a day in UTC+8, so "tomorrow" resolved to today.
 */
export interface BookingWindow {
    min: string;
    max: string;
}

export const BOOKING_FORM_DEFAULTS: BookingFormData = {
    patientId: null,
    service: '',
    branch: '',
    appointmentDate: '',
    appointmentTime: '',
    // Pre-selected rather than blank: in-person is what the clinic did before
    // this feature existed, so a patient who ignores the control gets the
    // status quo instead of a validation error.
    consultationType: 'in_person',
    coverage: '',
    hmo: '',
    hmoId: '',
    doctorId: null,
    additionalInfo: '',
};

/**
 * The add/edit-patient sheet's own form. Mirrors SavePatientRequest.
 *
 * No `age`: it is birthdate arithmetic, and two fields that can disagree is one
 * field too many. The sheet shows it read-only beside the birthdate, and the
 * server derives it in SavePatientRequest::prepareForValidation().
 */
export interface PatientFormData {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    gender: string;
    relationship: string;
    /** Required when relationship === 'other'. */
    relationshipNote: string;
    birthdate: string;
    address: string;
    civilStatus: string;
    company: string;
    defaultCoverage: string;
    hmoProvider: string;
    hmoId: string;
}

/**
 * Whole years between an ISO date and today, or null when the date is empty or
 * not yet a complete date. Deliberately plain arithmetic on the parts rather
 * than Date maths — `new Date('2010-05-04')` is UTC midnight, which in UTC+8
 * reads back as the 4th but compares as the 3rd.
 */
export function ageFromBirthdate(iso: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');

    if (!m) {
        return null;
    }

    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const now = new Date();
    let age = now.getFullYear() - y;

    const beforeBirthday =
        now.getMonth() + 1 < mo ||
        (now.getMonth() + 1 === mo && now.getDate() < d);

    if (beforeBirthday) {
        age -= 1;
    }

    return age < 0 || age > 120 ? null : age;
}

export const PATIENT_FORM_DEFAULTS: PatientFormData = {
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '+63',
    gender: '',
    relationship: '',
    relationshipNote: '',
    birthdate: '',
    address: '',
    civilStatus: '',
    company: '',
    defaultCoverage: '',
    hmoProvider: '',
    hmoId: '',
};
