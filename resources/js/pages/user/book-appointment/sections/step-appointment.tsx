// resources/js/pages/generals/book-appointment/sections/step-appointment.tsx

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import type { Step2Errors } from '@/hooks/use-step-validators';
import type { BookingFormData } from '@/pages/user/book-appointment/sections/bookingdata';
import {
    consultationTypeOptions,
    CONSULTATION_TYPE_HINT,
    eligibleServices,
    IN_PERSON_ONLY_NOTICE,
    isServiceEligible,
    patientStatusOptions,
    STEP_HEADINGS,
    supportsVirtual,
} from '@/pages/user/book-appointment/sections/bookingdata';
import { Field, ToggleCard, StepNav, IconCalendar } from '../components';

interface StepAppointmentProps {
    data: BookingFormData;
    errors: Step2Errors;
    setData: <K extends keyof BookingFormData>(
        field: K,
        value: BookingFormData[K],
    ) => void;
    valid: boolean;
    onNext: () => void;
    onBack: () => void;
}

const BOOKING_MAX_DAYS = 365;

export default function StepAppointment({
    data,
    errors,
    setData,
    onNext,
    onBack,
}: StepAppointmentProps): ReactElement {
    const { title, subtitle } = STEP_HEADINGS[2];

    // Age and gender are answered back in Step 1, so the patient can return there
    // and change them after picking a service. Drop the selection if it no longer
    // applies — in an effect, never during render.
    const services = eligibleServices(data.gender, data.age);

    useEffect(() => {
        if (
            data.service &&
            !isServiceEligible(data.service, data.gender, data.age)
        ) {
            setData('service', '');
        }
    }, [data.service, data.gender, data.age, setData]);

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

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const minDate = tomorrow.toISOString().split('T')[0];

    const maxDateObj = new Date();
    maxDateObj.setDate(maxDateObj.getDate() + BOOKING_MAX_DAYS);
    maxDateObj.setHours(0, 0, 0, 0);
    const maxDate = maxDateObj.toISOString().split('T')[0];

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
                    Step 2 of 4
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
                    <select
                        className={`wc-input wc-select${errors.service ? 'wc-input-error' : ''}`}
                        value={data.service}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setData('service', e.target.value)
                        }
                    >
                        {services.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
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

                {/* Patient status */}
                <Field
                    label="Patient Record Status"
                    required
                    error={errors.patientStatus}
                >
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        {patientStatusOptions.map((o) => (
                            <ToggleCard
                                key={o.value}
                                value={o.value}
                                label={o.label}
                                iconKey={o.value}
                                active={data.patientStatus === o.value}
                                onClick={() =>
                                    setData('patientStatus', o.value)
                                }
                            />
                        ))}
                    </div>
                </Field>

                {/* Date */}
                <Field
                    label="Preferred Date"
                    required
                    error={errors.appointmentDate}
                    hint={
                        !errors.appointmentDate
                            ? `Select a date between tomorrow and ${BOOKING_MAX_DAYS} days from now.`
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

            <StepNav
                onBack={onBack}
                onNext={onNext}
                nextLabel="Continue to Coverage"
                nextDisabled={false}
            />
        </div>
    );
}
