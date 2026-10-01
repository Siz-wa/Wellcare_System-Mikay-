// resources/js/pages/user/book-appointment/sections/bookingdata.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static data and types for the booking form.

import type { DoctorSummary } from '@/lib/specialties';

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
    body: 'Complete the steps below to schedule your visit. Your doctor confirms each request, and you will get an email and a notification when they do.',
    disclaimer:
        'Your doctor confirms the request before the visit. You will get an email and a notification when they do.',
    // HIPAA is US law. This is a Dasmarinas clinic, governed by the Data
    // Privacy Act of 2012 (RA 10173) — which is what the rest of the system
    // actually implements: versioned consents, a DPO role and a record-access
    // log. Naming the wrong statute both misstated the obligation and undersold
    // the work. Key left as `hipaa` would be a lie in the code too.
    dataPrivacy:
        'Your data is encrypted and handled under the Data Privacy Act of 2012.',
    successHeading: { line1: 'Appointment', line2: 'Requested!' },
    successBody:
        'Your booking request has been received. We will email and notify you as soon as your doctor confirms it.',
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

/**
 * A doctor in the booking picker.
 *
 * Extends the shared shape rather than re-declaring it: both this and the
 * public directory are fed by App\Http\Resources\DoctorResource, and the
 * duplicate definition meant a field added to the resource (a photograph, a
 * PRC number) reached the public page and silently stopped at the picker.
 *
 * `availableSlots` is the one field genuinely local to booking — it comes from
 * the availability lookup, not from the doctor's profile.
 */
export interface DoctorOption extends DoctorSummary {
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
    manageLabel: 'Manage my family',
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
    minorCoverageNotice: `Children (${MINOR_MAX_AGE} and under) are usually covered as a dependent on a parent's HMO or PhilHealth. Choose that coverage and enter the child's own dependent member number, or Self-Pay to bill the visit to you.`,
};

export const MINOR_COVERAGE_NOTICE = `This patient is ${MINOR_MAX_AGE} or under. If they are a dependent on your HMO or PhilHealth, choose it and enter their dependent member number; otherwise choose Self-Pay and the visit is billed to you.`;

export const consultationTypeOptions: SelectOption[] = [
    { value: 'in_person', label: 'In-Person Visit' },
    { value: 'virtual', label: 'Video Consultation' },
];

// -- The service catalogue ---------------------------------------------------
//
// SERVED BY THE SERVER, not listed here. The eleven-entry array that used to
// sit at this spot was a hand-maintained mirror of App\Enums\Service, kept
// honest by a parity test; both are gone. The catalogue is now the `services`
// table, an administrator edits it at /admin/services, and
// AppointmentController passes it to the wizard as a prop.
//
// What remains here is the TYPE and the functions that read it. Each takes the
// catalogue as an argument rather than closing over a module constant, because
// a module-level copy would be a second source of truth again — and under SSR
// it would be one shared across requests.
//
//   specialties: null -> any doctor may take it (a scan, a blood draw, an
//                annual physical are delivered by whoever is rostered).
//   inPersonOnly -> the video option is hidden, not merely rejected on submit.
//   sex / maxAge -> the service disappears once the patient's own record rules
//                it out. Blank answers rule nothing out.

export interface ServiceDefinition {
    value: string;
    label: string;
    /** One line under the option saying who or what it is for. */
    description: string;
    /** DB `doctor_profiles.specialty` slugs, or null for "any doctor". */
    specialties: string[] | null;
    inPersonOnly: boolean;
    sex: 'female' | 'male' | null;
    maxAge: number | null;
    minAge?: number | null;
}

/** One service by slug, or undefined for "" and anything unrecognised. */
export function findService(
    catalogue: ServiceDefinition[],
    value: string,
): ServiceDefinition | undefined {
    return catalogue.find((s) => s.value === value);
}

/**
 * Can this service be delivered over video?
 *
 * A blood draw, a scan, hands-on therapy and a physical examination need the
 * patient in the building; selecting one hides the video option entirely
 * rather than showing a choice that would be rejected on submit.
 *
 * An unrecognised slug returns false — the safe answer. A service that has
 * been retired since the wizard loaded should not quietly offer video.
 */
export function supportsVirtual(
    catalogue: ServiceDefinition[],
    service: string,
): boolean {
    const found = findService(catalogue, service);

    return found !== undefined && !found.inPersonOnly;
}

export const CONSULTATION_TYPE_HINT =
    'Video consultations run in your browser - no app to install. You will get a join link on this dashboard when your doctor starts the session.';

export const IN_PERSON_ONLY_NOTICE =
    'This service must be done at the clinic, so it is booked as an in-person visit.';

/** The dropdown, with its placeholder. */
export function serviceOptions(catalogue: ServiceDefinition[]): SelectOption[] {
    return [
        { value: '', label: 'Select a service' },
        ...catalogue.map((s) => ({ value: s.value, label: s.label })),
    ];
}

// -- Service eligibility -----------------------------------------------------
// Some services only apply to part of the patient population, and one the
// patient cannot have is hidden rather than shown and then refused.
//
//   sex: "female"  -> hidden when gender === "male". Deliberately still shown
//                    for "other"/prefer-not-to-say - we don't exclude someone
//                    who declined to answer.
//   maxAge: 18     -> hidden once age exceeds 18.
//
// Blank age/gender shows everything: the patient hasn't answered yet, so we
// can't rule anything out. Service::isEligibleFor() is the server half and
// applies the same three rules to the same columns.

export function isServiceEligible(
    catalogue: ServiceDefinition[],
    value: string,
    gender: string,
    age: string,
): boolean {
    const rule = findService(catalogue, value);

    if (!rule) {
        return true;
    }

    if (rule.sex === 'female' && gender === 'male') {
        return false;
    }

    if (rule.sex === 'male' && gender === 'female') {
        return false;
    }

    if (age !== '') {
        const parsed = Number(age);

        if (
            Number.isFinite(parsed) &&
            ((rule.maxAge !== null && parsed > rule.maxAge) ||
                (rule.minAge != null && parsed < rule.minAge))
        ) {
            return false;
        }
    }

    return true;
}

/** `serviceOptions` narrowed to what this patient can actually book. */
export function eligibleServices(
    catalogue: ServiceDefinition[],
    gender: string,
    age: string,
): SelectOption[] {
    return serviceOptions(catalogue).filter((o) =>
        isServiceEligible(catalogue, o.value, gender, age),
    );
}

/**
 * Which specialties may take a service, for the doctor picker's filter.
 *
 * null (and an unknown slug) means show every doctor. The values here are
 * `doctor_profiles.specialty` slugs and must match that column exactly —
 * ServiceCatalogueTest asserts every stored one against App\Enums\Specialty.
 */
export function specialtiesForService(
    catalogue: ServiceDefinition[],
    service: string,
): string[] | null {
    return findService(catalogue, service)?.specialties ?? null;
}

// -- Clinic days -------------------------------------------------------------
//
// A doctor keeps a weekly roster, and a patient picking a date has no way to
// know it. When they pick a day the doctor does not work, the wizard used to
// say "This doctor has no availability configured for 2026-09-15" - a sentence
// about a database table, offered to someone who wanted to see a doctor, and
// one that does not say the single thing that would help: which days they
// could pick instead.
//
// `schedules` comes from DoctorResource::formatSchedules() and only ever
// contains APPROVED, recurring hours, so anything named here is genuinely
// bookable.

const FULL_WEEKDAY: Record<string, string> = {
    Sun: 'Sundays',
    Mon: 'Mondays',
    Tue: 'Tuesdays',
    Wed: 'Wednesdays',
    Thu: 'Thursdays',
    Fri: 'Fridays',
    Sat: 'Saturdays',
};

/** "Mon, Wed and Fri", or null when the doctor has no published roster. */
export function clinicDaysLabel(doctor: {
    schedules?: { days: string; hours: string }[];
}): string | null {
    const days = (doctor.schedules ?? [])
        .flatMap((s) => s.days.split(' / '))
        .map((d) => d.trim())
        .filter(Boolean);

    const unique = [...new Set(days)];

    if (unique.length === 0) {
        return null;
    }

    if (unique.length === 1) {
        return unique[0];
    }

    return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

/** "Mon / Wed / Fri, 9AM - 5PM" per roster row - the detail line on a card. */
export function clinicHoursLines(doctor: {
    schedules?: { days: string; hours: string }[];
}): string[] {
    return (doctor.schedules ?? []).map((s) => `${s.days} · ${s.hours}`);
}

/** "Mondays" for a Y-M-D string, for naming the day the patient chose. */
export function weekdayNameFor(isoDate: string): string | null {
    if (!isoDate) {
        return null;
    }

    const parsed = new Date(`${isoDate}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    const short = parsed.toLocaleDateString('en-PH', { weekday: 'short' });

    return FULL_WEEKDAY[short] ?? `${short}s`;
}

/** "Tue, 15 Sep 2026" - a date a person reads, not "2026-09-15". */
export function readableDate(isoDate: string): string {
    if (!isoDate) {
        return '';
    }

    const parsed = new Date(`${isoDate}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return isoDate;
    }

    return parsed.toLocaleDateString('en-PH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export const coverageOptions: CoverageOption[] = [
    // 'Self-Pay' alone, not 'Cash / Self-Pay'. The stored value is still
    // `cash` — renaming the enum would cost a migration and buy nothing — but
    // the WORD was the problem: a patient choosing "Cash" for a video
    // consultation reasonably expects to hand notes to somebody, and there is
    // nobody on a video call to hand them to. See the virtual notice in
    // step-coverage.tsx for what the label now points at.
    { value: 'cash', label: 'Self-Pay', icon: 'cash' },
    { value: 'hmo', label: 'HMO', icon: 'hmo' },
    { value: 'philhealth', label: 'PhilHealth', icon: 'philhealth' },
];

/**
 * Shown when a self-payer picks a VIDEO consultation.
 *
 * The one combination the clinic cannot collect on at the door, so the patient
 * has to learn three things before they finish booking: that a fee is coming,
 * that paying it is a separate act they perform elsewhere, and that the slot
 * is released if they do not. Saying it here rather than only in the
 * notification means nobody discovers it at the moment their room will not
 * open.
 */
export const virtualSelfPayNotice = {
    title: 'You will need to settle this before the consultation',
    body: 'A video consultation is paid before it starts — there is no cashier to pay on the way in. After booking, your Payments page shows the amount and the clinic’s GCash, Maya and bank details; you can also pay cash at the Dasmariñas branch cashier. The booking is released if it is still unpaid shortly before your schedule.',
} as const;

// Promoted to @/lib/hmo-providers so registration and the admin patient
// form can use the same list instead of asking for the provider as free
// text. Re-exported here so booking's existing imports keep working.
export { hmoOptions } from '@/lib/hmo-providers';

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
    /**
     * SC-4 / C-5. Agreement to how a video consultation works, asked at the
     * point of choosing one. Only meaningful — and only sent — when
     * `consultationType` is 'virtual'; the server refuses a virtual booking
     * without it.
     */
    consentTelemedicine: boolean;
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

/**
 * The telemedicine consent wording, from ConsentService::documentFor().
 * Same shape the registration form receives, so the same checkbox renders it.
 */
export interface ConsentDocument {
    type: string;
    field: string;
    title: string;
    summary: string;
    body: string;
    required: boolean;
    version: string;
}

/**
 * What the wizard opens with, resolved server-side from `?service=` and
 * `?type=` by AppointmentController::resolvePrefill().
 *
 * Both are already validated against the catalogue by the time they get here:
 * an unrecognised slug arrives as null rather than being written into the form
 * and failing on submit.
 */
export interface BookingPrefill {
    /** From a doctor's public profile: that doctor, preselected. */
    doctorId?: number | null;
    service: string | null;
    consultationType: 'virtual' | null;
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
    consentTelemedicine: false,
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

// Promoted to @/lib/age so the admin patient form can derive an age the
// same way this sheet does, rather than offering a second editable answer
// to the same question. Re-exported so booking's imports keep working.
export { ageFromBirthdate } from '@/lib/age';

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
