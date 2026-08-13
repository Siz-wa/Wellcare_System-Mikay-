// resources/js/pages/user/book-appointment/sections/step-appointment.tsx

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import type { Step1Errors } from '@/hooks/use-step-validators';
import type {
    BookingFormData,
    BookingWindow,
    PatientOption,
} from '@/pages/user/book-appointment/sections/bookingdata';
import {
    consultationTypeOptions,
    CONSULTATION_TYPE_HINT,
    eligibleServices,
    IN_PERSON_ONLY_NOTICE,
    isServiceEligible,
    STEP_HEADINGS,
    supportsVirtual,
} from '@/pages/user/book-appointment/sections/bookingdata';
import {
    BrandSelect,
    Field,
    ToggleCard,
    StepNav,
    IconCalendar,
} from '../components';

interface StepAppointmentProps {
    data: BookingFormData;
    errors: Step1Errors;
    setData: <K extends keyof BookingFormData>(
        field: K,
        value: BookingFormData[K],
    ) => void;
    /** Whose record drives service eligibility (OB-Gyne, Pediatrics) */
    patient: PatientOption;
    bookingWindow: BookingWindow;
    valid: boolean;
    onNext: () => void;
}

export default function StepAppointment({
    data,
    errors,
    setData,
    patient,
    bookingWindow,
    onNext,
}: StepAppointmentProps): ReactElement {
    const { title, subtitle } = STEP_HEADINGS[1];

    // Eligibility now reads the patient record rather than form inputs, which is
    // also what BookAppointmentRequest enforces server-side. Editing a patient's
    // age or sex reloads this page with fresh props, so the selection can still
    // go stale — drop it in an effect, never during render.
    const patientGender = patient.gender ?? '';
    const patientAge = patient.age === null ? '' : String(patient.age);
    const services = eligibleServices(patientGender, patientAge);

    useEffect(() => {
        if (
            data.service &&
            !isServiceEligible(data.service, patientGender, patientAge)
        ) {
            setData('service', '');
        }
    }, [data.service, patientGender, patientAge, setData]);

    const virtualAllowed = supportsVirtual(data.service);

    // Switching to a service that must happen at the clinic forces the mode
    // back. Same pattern as the service-eligibility reset above: correct it in
    // an effect, never during render, or the submitted value and the rendered
    // value disagree and the server rejects a form that looked valid.
    useEffect(() => {
        if (!virtualAllowed && data.consultationType === 'virtual') {
            setData('consultationType', 'in_person');
        }
    }, [virtualAllowed, data.consultationType, setData]);

    // Both bounds arrive from the server, already ISO and already in the clinic's
    // timezone. Deriving them here with `new Date().toISOString()` is what used
    // to shift local midnight back a day in UTC+8 — and the local 365-day cap
    // disagreed with the server's 3-month rule, which is how dates in 2027 got
    // through the picker only to be rejected on submit.
    const { min: minDate, max: maxDate } = bookingWindow;

    const formatWindowDate = (iso: string) =>
        new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

    const col: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <span
                    className="wc-label"
                    style={{
                        color: 'var(--wc-sky-500)',
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    Step 1 of 3
                </span>
                <h2 style={{ marginBottom: 'var(--space-1)' }}>{title}</h2>
                <p style={{ margin: 0 }}>{subtitle}</p>
            </div>

            <div style={col}>
                {/* Service */}
                <Field
                    label="Service to be Availed"
                    required
                    error={errors.service}
                >
                    <BrandSelect
                        value={data.service}
                        onChange={(v) => setData('service', v)}
                        options={services}
                        invalid={Boolean(errors.service)}
                        aria-label="Service to be availed"
                    />
                </Field>

                {/* Consultation type */}
                <Field
                    label="Consultation Type"
                    required
                    error={errors.consultationType}
                    hint={
                        !errors.consultationType
                            ? virtualAllowed
                                ? CONSULTATION_TYPE_HINT
                                : IN_PERSON_ONLY_NOTICE
                            : undefined
                    }
                >
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        {consultationTypeOptions
                            .filter(
                                (o) => o.value !== 'virtual' || virtualAllowed,
                            )
                            .map((o) => (
                                <ToggleCard
                                    key={o.value}
                                    value={o.value}
                                    label={o.label}
                                    iconKey={o.value}
                                    active={data.consultationType === o.value}
                                    onClick={() =>
                                        setData('consultationType', o.value)
                                    }
                                />
                            ))}
                    </div>
                </Field>

                {/* New vs returning is not asked here. It is derived from this
                    patient's own visit history when the booking is created. */}

                {/* Date */}
                <Field
                    label="Preferred Date"
                    required
                    error={errors.appointmentDate}
                    hint={
                        !errors.appointmentDate
                            ? `Select a date between ${formatWindowDate(minDate)} and ${formatWindowDate(maxDate)}.`
                            : undefined
                    }
                >
                    <div style={{ position: 'relative' }}>
                        <span
                            style={{
                                position: 'absolute',
                                left: 'var(--space-3)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: errors.appointmentDate
                                    ? 'var(--wc-error)'
                                    : 'var(--wc-gray-400)',
                                pointerEvents: 'none',
                                display: 'flex',
                            }}
                        >
                            <IconCalendar />
                        </span>
                        <input
                            className={`wc-input${errors.appointmentDate ? 'wc-input-error' : ''}`}
                            type="date"
                            min={minDate}
                            max={maxDate}
                            value={data.appointmentDate}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setData('appointmentDate', e.target.value)}
                            style={{
                                paddingLeft: 'calc(var(--space-3) + 22px)',
                            }}
                        />
                    </div>
                </Field>

                {/* Time slot moved to Step 3 — shown below doctor selection */}
            </div>

            {/* No Back: this is the first step. Changing who the appointment is
                for is done from the patient card above the wizard. */}
            <StepNav
                onNext={onNext}
                nextLabel="Continue to Coverage"
                nextDisabled={false}
            />
        </div>
    );
}
