// resources/js/pages/generals/book-appointment/sections/step-personal.tsx

import type { ReactElement } from 'react';
import type { Step1Errors } from '@/hooks/use-step-validators';
import type { BookingFormData } from '@/pages/user/book-appointment/sections/bookingdata';
import {
    genderOptions,
    STEP_HEADINGS,
} from '@/pages/user/book-appointment/sections/bookingdata';
import { Field, StepNav } from '../components';

interface StepPersonalProps {
    data: BookingFormData;
    errors: Step1Errors;
    setData: <K extends keyof BookingFormData>(
        field: K,
        value: BookingFormData[K],
    ) => void;
    valid: boolean;
    onNext: () => void;
}

export default function StepPersonal({
    data,
    errors,
    setData,
    valid,
    onNext,
}: StepPersonalProps): ReactElement {
    const { title, subtitle } = STEP_HEADINGS[1];

    const twoCol: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-5)',
    };
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
                    Step 1 of 4
                </span>
                <h2 style={{ marginBottom: 'var(--space-1)' }}>{title}</h2>
                <p style={{ margin: 0 }}>{subtitle}</p>
            </div>

            <div style={col}>
                <div style={twoCol}>
                    <Field label="First Name" required error={errors.firstName}>
                        <input
                            className={`wc-input${errors.firstName ? 'wc-input-error' : ''}`}
                            type="text"
                            placeholder="e.g. Maria"
                            value={data.firstName}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                                const clean = e.target.value
                                    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, '')
                                    .slice(0, 50);
                                setData('firstName', clean);
                            }}
                        />
                    </Field>
                    <Field label="Last Name" required error={errors.lastName}>
                        <input
                            className={`wc-input${errors.lastName ? 'wc-input-error' : ''}`}
                            type="text"
                            placeholder="e.g. Santos"
                            value={data.lastName}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                                const clean = e.target.value
                                    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, '')
                                    .slice(0, 50);
                                setData('lastName', clean);
                            }}
                        />
                    </Field>
                </div>

                <div style={twoCol}>
                    <Field label="Email Address" required error={errors.email}>
                        <input
                            className={`wc-input${errors.email ? 'wc-input-error' : ''}`}
                            type="email"
                            placeholder="you@example.com"
                            maxLength={255}
                            value={data.email}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setData('email', e.target.value)}
                        />
                    </Field>
                    <Field
                        label="Contact Number"
                        required
                        error={errors.contactNumber}
                        hint={
                            !errors.contactNumber
                                ? 'e.g. +639XXXXXXXXX or 09XXXXXXXXX'
                                : undefined
                        }
                    >
                        <input
                            className={`wc-input${errors.contactNumber ? 'wc-input-error' : ''}`}
                            type="tel"
                            placeholder="+639XXXXXXXXX"
                            maxLength={13}
                            value={data.contactNumber}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setData('contactNumber', e.target.value)}
                        />
                    </Field>
                </div>

                <div style={twoCol}>
                    <Field label="Age" required error={errors.age}>
                        <input
                            className={`wc-input${errors.age ? 'wc-input-error' : ''}`}
                            type="number"
                            placeholder="e.g. 32"
                            min={1}
                            max={120}
                            value={data.age}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                                const raw = e.target.value;

                                // Allow empty string (so user can clear the field)
                                if (raw === '') {
                                    setData('age', '');

                                    return;
                                }

                                // Only allow whole numbers, clamp to 1-120
                                const n = parseInt(raw, 10);

                                if (isNaN(n)) {
return;
}

                                setData(
                                    'age',
                                    String(Math.min(120, Math.max(1, n))),
                                );
                            }}
                        />
                    </Field>
                    <Field
                        label="Biological Sex"
                        required
                        error={errors.gender}
                    >
                        <select
                            className={`wc-input wc-select${errors.gender ? 'wc-input-error' : ''}`}
                            value={data.gender}
                            onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>,
                            ) => setData('gender', e.target.value)}
                        >
                            {genderOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            <StepNav
                nextLabel="Continue to Appointment"
                nextDisabled={false}
                onNext={onNext}
            />
        </div>
    );
}
