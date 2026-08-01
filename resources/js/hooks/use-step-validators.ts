// resources/js/hooks/use-step-validators.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validation for every booking step.
// Returns the shape booking-form.tsx expects:
//   { errors1, errors2, errors3, step1Valid, step2Valid, step3Valid }
//
// appointmentTime is NOT in Step 2 — it is chosen in Step 3 after selecting
// a doctor, and is validated there instead.

import type { BookingFormData } from '@/pages/user/book-appointment/sections/bookingdata';

// ── Error shapes ──────────────────────────────────────────────────────────────

export interface Step1Errors {
    firstName?: string;
    lastName?: string;
    email?: string;
    contactNumber?: string;
    age?: string;
    gender?: string;
}

export interface Step2Errors {
    service?: string;
    patientStatus?: string;
    appointmentDate?: string;
    // appointmentTime intentionally absent — validated in Step 3
}

export interface Step3Errors {
    coverage?: string;
    hmo?: string;
    hmoId?: string;
    appointmentTime?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_PHONE = /^(\+639|09)\d{9}$/;
const BOOKING_MAX_DAYS = 365;

// ── Step 1 ────────────────────────────────────────────────────────────────────

function validateStep1(data: BookingFormData): Step1Errors {
    const e: Step1Errors = {};

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

    const age = String(data.age ?? '').trim();

    if (!age) {
e.age = 'Age is required.';
} else if (Number(age) < 1 || Number(age) > 120) {
e.age = 'Age must be between 1 and 120.';
}

    if (!data.gender) {
e.gender = 'Please select your biological sex.';
}

    return e;
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function validateStep2(data: BookingFormData): Step2Errors {
    const e: Step2Errors = {};

    if (!data.service) {
e.service = 'Please select a service.';
}

    if (!data.patientStatus) {
e.patientStatus = 'Please select your patient status.';
}

    if (!data.appointmentDate) {
        e.appointmentDate = 'Please select a preferred date.';
    } else {
        const chosen = new Date(data.appointmentDate + 'T00:00:00');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + BOOKING_MAX_DAYS);

        if (chosen < tomorrow) {
e.appointmentDate =
                'The appointment date must be at least tomorrow.';
} else if (chosen > maxDate) {
e.appointmentDate = `Appointments cannot be booked more than ${BOOKING_MAX_DAYS} days in advance.`;
}
    }

    return e;
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

function validateStep3(data: BookingFormData): Step3Errors {
    const e: Step3Errors = {};

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
    errors3: Step3Errors;
    step1Valid: boolean;
    step2Valid: boolean;
    step3Valid: boolean;
}

export function useStepValidators(data: BookingFormData): StepValidators {
    const errors1 = validateStep1(data);
    const errors2 = validateStep2(data);
    const errors3 = validateStep3(data);

    return {
        errors1,
        errors2,
        errors3,
        step1Valid: Object.keys(errors1).length === 0,
        step2Valid: Object.keys(errors2).length === 0,
        step3Valid: Object.keys(errors3).length === 0,
    };
}
