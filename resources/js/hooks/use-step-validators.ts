// resources/js/hooks/use-step-validators.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validation for every booking step.
// Returns the shape booking-form.tsx expects:
//   { errors1, errors2, step1Valid, step2Valid }
//
// The wizard is three steps: 1 Appointment, 2 Coverage, 3 Review. Personal
// details are no longer step 1 — they live on the patient record and are
// validated by validatePatientDetails() below, which the add/edit-patient sheet
// reuses so there is exactly one client-side definition of a valid patient.
//
// appointmentTime is NOT in Step 1 — it is chosen in Step 2 after selecting
// a doctor, and is validated there instead.

import type {
    BookingFormData,
    BookingWindow,
    PatientFormData,
} from '@/pages/user/book-appointment/sections/bookingdata';
import {
    ageFromBirthdate,
    MINOR_MAX_AGE,
    supportsVirtual,
} from '@/pages/user/book-appointment/sections/bookingdata';

// ── Error shapes ──────────────────────────────────────────────────────────────

export interface PatientDetailsErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    contactNumber?: string;
    birthdate?: string;
    gender?: string;
    relationship?: string;
    relationshipNote?: string;
    defaultCoverage?: string;
    hmoProvider?: string;
    hmoId?: string;
}

export interface Step1Errors {
    service?: string;
    consultationType?: string;
    appointmentDate?: string;
    // appointmentTime intentionally absent — validated in Step 2
}

export interface Step2Errors {
    coverage?: string;
    hmo?: string;
    hmoId?: string;
    appointmentTime?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_PHONE = /^(\+639|09)\d{9}$/;

// ── Patient details — shared by the add/edit sheet ────────────────────────────

/**
 * The rules a patient record must satisfy. Mirrors SavePatientRequest, which is
 * the actual enforcement; this is what keeps the sheet from submitting a form
 * the server would only bounce back.
 */
export function validatePatientDetails(
    data: PatientFormData,
): PatientDetailsErrors {
    const e: PatientDetailsErrors = {};

    const fn = data.firstName?.trim() ?? '';

    if (!fn) {
        e.firstName = 'First name is required.';
    } else if (fn.length > 50) {
        e.firstName = 'First name must be under 50 characters.';
    }

    const ln = data.lastName?.trim() ?? '';

    if (!ln) {
        e.lastName = 'Last name is required.';
    } else if (ln.length > 50) {
        e.lastName = 'Last name must be under 50 characters.';
    }

    const em = data.email?.trim() ?? '';

    if (!em) {
        e.email = 'Email address is required.';
    } else if (!EMAIL_RE.test(em)) {
        e.email = 'Please enter a valid email address.';
    }

    const phone = (data.contactNumber ?? '').replace(/\s/g, '');

    if (!phone || phone === '+63') {
        e.contactNumber = 'Contact number is required.';
    } else if (!PH_PHONE.test(phone)) {
        e.contactNumber =
            'Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX).';
    }

    // Birthdate is the field asked for; age is derived from it and shown
    // read-only. Asking for both invites them to disagree.
    const age = ageFromBirthdate(data.birthdate);

    if (!data.birthdate) {
        e.birthdate = 'Birthdate is required.';
    } else if (age === null) {
        e.birthdate = 'Please enter a valid birthdate.';
    } else if (age < 0) {
        e.birthdate = 'Birthdate must be in the past.';
    }

    if (!data.gender) {
        e.gender = 'Please select their biological sex.';
    }

    if (!data.relationship) {
        e.relationship = 'Please tell us how this patient is related to you.';
    } else if (data.relationship === 'other' && !data.relationshipNote.trim()) {
        e.relationshipNote = 'Please say what the relationship is.';
    }

    // A minor is billed to their guarantor, so the sheet hides the coverage
    // chooser for them. If one is somehow set anyway, say why it cannot stand.
    const isMinor = age !== null && age <= MINOR_MAX_AGE;

    if (isMinor && data.defaultCoverage && data.defaultCoverage !== 'cash') {
        e.defaultCoverage = `A patient aged ${MINOR_MAX_AGE} or under is billed to their guarantor.`;

        return e;
    }

    // Coverage is optional here, but naming HMO without the member number would
    // save a prefill that cannot actually be used at the counter.
    if (data.defaultCoverage === 'hmo') {
        if (!data.hmoProvider) {
            e.hmoProvider = 'Please select the HMO provider.';
        }

        if (!data.hmoId) {
            e.hmoId = 'Please enter the HMO ID number.';
        } else if (data.hmoId.length < 6) {
            e.hmoId = 'HMO ID must be at least 6 characters.';
        }
    }

    return e;
}

export function isPatientDetailsValid(data: PatientFormData): boolean {
    return Object.keys(validatePatientDetails(data)).length === 0;
}

// ── Step 1 — Appointment ──────────────────────────────────────────────────────

function validateStep1(
    data: BookingFormData,
    window: BookingWindow,
): Step1Errors {
    const e: Step1Errors = {};

    if (!data.service) {
        e.service = 'Please select a service.';
    }

    // Defaults to in_person, so an empty value means the field was cleared
    // rather than never answered. Both are worth blocking.
    if (!data.consultationType) {
        e.consultationType = 'Please choose how you want to be seen.';
    } else if (
        data.consultationType === 'virtual' &&
        !supportsVirtual(data.service)
    ) {
        e.consultationType =
            'This service requires an in-person visit and cannot be booked as a video consultation.';
    }

    // Both bounds come from the server and are already ISO `YYYY-MM-DD`, so a
    // plain string comparison is the whole check. Building Date objects here is
    // what introduced the timezone skew that let today through.
    if (!data.appointmentDate) {
        e.appointmentDate = 'Please select a preferred date.';
    } else if (data.appointmentDate < window.min) {
        e.appointmentDate = 'The appointment date must be at least tomorrow.';
    } else if (data.appointmentDate > window.max) {
        e.appointmentDate =
            'Appointments cannot be booked more than 3 months in advance.';
    }

    return e;
}

// ── Step 2 — Coverage ─────────────────────────────────────────────────────────

function validateStep2(data: BookingFormData): Step2Errors {
    const e: Step2Errors = {};

    if (!data.coverage) {
        e.coverage = 'Please select a mode of coverage.';
    }

    if (data.coverage === 'hmo') {
        if (!data.hmo) {
            e.hmo = 'Please select your HMO provider.';
        }

        if (!data.hmoId) {
            e.hmoId = 'Please enter your HMO ID number.';
        } else if (data.hmoId.length < 6) {
            e.hmoId = 'HMO ID must be at least 6 characters.';
        }
    }

    if (!data.appointmentTime) {
        e.appointmentTime = 'Please select a time slot.';
    }

    return e;
}

// ── Main hook — shape matches booking-form.tsx expectations ──────────────────

export interface StepValidators {
    errors1: Step1Errors;
    errors2: Step2Errors;
    step1Valid: boolean;
    step2Valid: boolean;
}

export function useStepValidators(
    data: BookingFormData,
    window: BookingWindow,
): StepValidators {
    const errors1 = validateStep1(data, window);
    const errors2 = validateStep2(data);

    return {
        errors1,
        errors2,
        step1Valid: Object.keys(errors1).length === 0,
        step2Valid: Object.keys(errors2).length === 0,
    };
}
