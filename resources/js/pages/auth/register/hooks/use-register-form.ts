// resources/js/pages/auth/register/hooks/use-register-form.ts
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { onboardingSteps } from '@/pages/auth/register/sections/register-data';

// ─── Types ────────────────────────────────────────────────────────────────────
export type StepErrors = Partial<Record<string, string>>;

export interface RegisterFields {
    // Step 1
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    // Step 2
    address: string;
    company: string;
    birthdate: string;
    contact_number: string;
    gender: string;
    civil_status: string;
    // Step 3
    height: string;
    weight: string;
    blood_pressure: string;
    hmo: string;
    classification: string;
}

const INITIAL_FIELDS: RegisterFields = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    address: '',
    company: '',
    birthdate: '',
    contact_number: '',
    gender: '',
    civil_status: '',
    height: '',
    weight: '',
    blood_pressure: '',
    hmo: '',
    classification: 'new',
};

// ─── Step field map — used to route server errors back to the right step ──────
export const STEP_FIELDS: Record<number, (keyof RegisterFields)[]> = {
    1: [
        'first_name',
        'last_name',
        'email',
        'password',
        'password_confirmation',
    ],
    2: [
        'address',
        'company',
        'birthdate',
        'contact_number',
        'gender',
        'civil_status',
    ],
    3: ['height', 'weight', 'blood_pressure', 'hmo', 'classification'],
};

// ─── Validation ───────────────────────────────────────────────────────────────
function validateStep1(f: RegisterFields): StepErrors {
    const e: StepErrors = {};

    if (!f.first_name.trim()) {
e.first_name = 'First name is required.';
} else if (f.first_name.trim().length < 2) {
e.first_name = 'First name must be at least 2 characters.';
} else if (f.first_name.trim().length > 100) {
e.first_name = 'First name must not exceed 100 characters.';
}

    if (!f.last_name.trim()) {
e.last_name = 'Last name is required.';
} else if (f.last_name.trim().length < 2) {
e.last_name = 'Last name must be at least 2 characters.';
} else if (f.last_name.trim().length > 100) {
e.last_name = 'Last name must not exceed 100 characters.';
}

    if (!f.email.trim()) {
e.email = 'Email address is required.';
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
e.email = 'Please enter a valid email address.';
}

    if (!f.password) {
e.password = 'Password is required.';
} else if (f.password.length < 8) {
e.password = 'Password must be at least 8 characters.';
} else if (!/[A-Z]/.test(f.password)) {
e.password = 'Password must contain at least one uppercase letter.';
} else if (!/[0-9]/.test(f.password)) {
e.password = 'Password must contain at least one number.';
}

    if (!f.password_confirmation) {
e.password_confirmation = 'Please confirm your password.';
} else if (f.password !== f.password_confirmation) {
e.password_confirmation = 'Passwords do not match.';
}

    return e;
}

function validateStep2(f: RegisterFields): StepErrors {
    const e: StepErrors = {};

    if (!f.address.trim()) {
e.address = 'Address is required.';
} else if (f.address.trim().length < 5) {
e.address = 'Please enter a complete address.';
}

    if (!f.birthdate) {
        e.birthdate = 'Birthdate is required.';
    } else {
        const dob = new Date(f.birthdate);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();

        if (isNaN(dob.getTime())) {
e.birthdate = 'Please enter a valid date.';
} else if (dob >= today) {
e.birthdate = 'Birthdate must be in the past.';
} else if (age < 1) {
e.birthdate = 'Patient must be at least 1 year old.';
} else if (age > 120) {
e.birthdate = 'Please enter a valid birthdate.';
}
    }

    if (!f.contact_number.trim()) {
e.contact_number = 'Contact number is required.';
} else if (!/^[0-9+\-\s()]{7,20}$/.test(f.contact_number)) {
e.contact_number = 'Please enter a valid contact number.';
}

    if (!f.gender) {
e.gender = 'Please select a gender.';
}

    if (!f.civil_status) {
e.civil_status = 'Please select a civil status.';
}

    return e;
}

function validateStep3(f: RegisterFields): StepErrors {
    const e: StepErrors = {};

    if (f.height) {
        const h = parseFloat(f.height);

        if (isNaN(h) || h < 50 || h > 250) {
e.height = 'Height must be between 50 and 250 cm.';
}
    }

    if (f.weight) {
        const w = parseFloat(f.weight);

        if (isNaN(w) || w < 1 || w > 300) {
e.weight = 'Weight must be between 1 and 300 kg.';
}
    }

    if (f.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(f.blood_pressure)) {
e.blood_pressure = 'BP must be in format 120/80.';
}

    if (!f.classification) {
e.classification = 'Please select a patient classification.';
}

    return e;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRegisterForm(onStepChange: (step: number) => void) {
    const [step, setStep] = useState(1);
    const [fields, setFields] = useState<RegisterFields>(INITIAL_FIELDS);
    const [clientErrors, setClientErrors] = useState<StepErrors>({});

    const totalSteps = onboardingSteps.length;

    // Controlled input handler — clears that field's error on change
    const set =
        (key: keyof RegisterFields) => (e: ChangeEvent<HTMLInputElement>) => {
            setFields((prev) => ({ ...prev, [key]: e.target.value }));
            setClientErrors((prev) => ({ ...prev, [key]: undefined }));
        };

    // Radio / pill selection handler
    const setRadio = (key: keyof RegisterFields) => (value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
        setClientErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    // Validate current step and advance if clean
    const handleNext = () => {
        const validators = [validateStep1, validateStep2, validateStep3];
        const errors = validators[step - 1](fields);

        if (Object.keys(errors).length > 0) {
            setClientErrors(errors);

            return;
        }

        setClientErrors({});
        const next = Math.min(step + 1, totalSteps);
        setStep(next);
        onStepChange(next);
    };

    const handleBack = () => {
        setClientErrors({});
        const prev = Math.max(step - 1, 1);
        setStep(prev);
        onStepChange(prev);
    };

    /**
     * Jump to a specific step and optionally seed client errors.
     * Used by RegisterFormPanel to surface server-side errors that
     * belong to step 1 or 2 fields after the final form submission.
     */
    const goToStep = (target: number, errors: StepErrors = {}) => {
        setStep(target);
        setClientErrors(errors);
        onStepChange(target);
    };

    // Runs before final submit — blocks if step 3 is invalid
    const handleSubmitValidation = (): boolean => {
        const errors = validateStep3(fields);

        if (Object.keys(errors).length > 0) {
            setClientErrors(errors);

            return false;
        }

        return true;
    };

    return {
        step,
        totalSteps,
        fields,
        clientErrors,
        set,
        setRadio,
        handleNext,
        handleBack,
        handleSubmitValidation,
        goToStep,
    };
}
