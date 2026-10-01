// resources/js/pages/auth/register/steps/StepMedical.tsx
import type { ChangeEvent } from 'react';
import { Select } from '@/design-system';
import { hmoOptions, splitHmoProvider } from '@/lib/hmo-providers';
import { bloodPressureOnly, decimalOnly } from '@/lib/input-masks';
import { ConsentCheckbox } from '@/pages/auth/register/components/consent-checkbox';
import {
    Field,
    errorBorder,
} from '@/pages/auth/register/components/register-ui';
import type {
    RegisterFields,
    StepErrors,
} from '@/pages/auth/register/hooks/use-register-form';
import {
    bloodTypeOptions,
    medicalHistoryCopy,
} from '@/pages/auth/register/sections/register-data';

export interface ConsentDocument {
    type: string;
    field: string;
    title: string;
    summary: string;
    body: string;
    required: boolean;
    version: string;
}

interface StepMedicalProps {
    fields: RegisterFields;
    errors: StepErrors;
    setSanitized: (
        key: keyof RegisterFields,
        sanitize: (value: string) => string,
    ) => (e: ChangeEvent<HTMLInputElement>) => void;
    setRadio: (key: keyof RegisterFields) => (v: string) => void;
    setChecked: (
        key: keyof RegisterFields,
    ) => (e: ChangeEvent<HTMLInputElement>) => void;
    consents: ConsentDocument[];
}

export default function StepMedical({
    fields,
    errors,
    setSanitized,
    setRadio,
    setChecked,
    consents,
}: StepMedicalProps) {
    const hmo = splitHmoProvider(fields.hmo, setRadio('hmo'));

    return (
        <>
            <div className="grid grid-cols-3 gap-4">
                {/*
                    Not `type="number"`. Bound to a string like every other
                    field here, a number input reports a value the browser
                    considers half-typed (`12e`) as the empty string, which
                    React then writes back — the field clears itself under
                    the user. Its scroll wheel also edits a focused value.
                    `inputMode="decimal"` gets the same keypad on mobile,
                    and the sanitizer keeps letters out on desktop.

                    The bounds move to the hint and to validateStep3, which
                    already checks them — native `min`/`max` inside this
                    step's <Form> raised the browser's own error bubble, a
                    second error UI beside the styled inline messages.
                */}
                <Field label="Height (cm)" error={errors.height} hint="50–250">
                    <input
                        type="text"
                        name="height"
                        value={fields.height}
                        onChange={setSanitized('height', (v) =>
                            decimalOnly(v, 5),
                        )}
                        tabIndex={1}
                        inputMode="decimal"
                        placeholder="165"
                        className="wc-input"
                        style={errorBorder(errors.height)}
                    />
                </Field>

                <Field label="Weight (kg)" error={errors.weight} hint="1–300">
                    <input
                        type="text"
                        name="weight"
                        value={fields.weight}
                        onChange={setSanitized('weight', (v) =>
                            decimalOnly(v, 5),
                        )}
                        tabIndex={2}
                        inputMode="decimal"
                        placeholder="60"
                        className="wc-input"
                        style={errorBorder(errors.weight)}
                    />
                </Field>

                <Field label="BP (mmHg)" error={errors.blood_pressure}>
                    <input
                        type="text"
                        name="blood_pressure"
                        value={fields.blood_pressure}
                        onChange={setSanitized(
                            'blood_pressure',
                            bloodPressureOnly,
                        )}
                        tabIndex={3}
                        inputMode="numeric"
                        placeholder="120/80"
                        className="wc-input"
                        style={errorBorder(errors.blood_pressure)}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Field
                    label={medicalHistoryCopy.bloodTypeLabel}
                    error={errors.blood_type}
                >
                    <Select
                        value={fields.blood_type}
                        onChange={setRadio('blood_type')}
                        options={bloodTypeOptions}
                    />
                </Field>
                <div className="col-span-2">
                    <Field
                        label={medicalHistoryCopy.allergiesLabel}
                        error={errors.known_allergies}
                        hint={medicalHistoryCopy.allergiesHint}
                    >
                        <input
                            type="text"
                            name="known_allergies"
                            value={fields.known_allergies}
                            onChange={setSanitized('known_allergies', (v) =>
                                v.slice(0, 500),
                            )}
                            placeholder={
                                medicalHistoryCopy.allergiesPlaceholder
                            }
                            className="wc-input"
                            style={errorBorder(errors.known_allergies)}
                        />
                    </Field>
                </div>
            </div>

            {/*
                The same list the booking flow has always used. Typed
                freely here, the provider reached HR's approvals filter as
                "Maxicare", "maxicare" and "Maxi care" — three entries for
                one caseload. See @/lib/hmo-providers.
            */}
            <Field
                label="HMO Provider"
                error={errors.hmo}
                hint="Optional — leave unselected if you have none."
            >
                <Select
                    value={hmo.selectValue}
                    onChange={hmo.onSelectChange}
                    options={hmoOptions}
                />
            </Field>

            {/*
                What actually submits. The two controls above are one answer
                between them — a select reading "Other" is not the provider's
                name — so the field carries the stored value rather than
                whichever control happens to be on screen.
            */}
            <input type="hidden" name="hmo" value={fields.hmo} />

            {/*
                "Other" on its own is not an answer. It reaches HR as the
                provider to verify coverage against, and there is nobody to
                call at a company named "Other" — so the option asks which one,
                and the typed name is what gets stored.
            */}
            {hmo.showOther && (
                <Field
                    label="Which HMO provider?"
                    error={errors.hmo}
                    hint="The name on your card — for example: Sun Life Grepa."
                >
                    <input
                        type="text"
                        value={hmo.otherValue}
                        onChange={(e) => hmo.onOtherChange(e.target.value)}
                        tabIndex={4}
                        maxLength={100}
                        placeholder="Provider name"
                        className="wc-input"
                        style={errorBorder(errors.hmo)}
                    />
                </Field>
            )}

            {/*
              SC-4 / C-1 in WELLCARE-COMPLIANCE-PLAN.md. One box per purpose,
              never a single "I agree to the terms" — a lawful basis under
              RA 10173 has to be specific, and one tick covering everything is
              not specific about anything.
            */}
            <div
                style={{
                    marginTop: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-gray-900, #111827)',
                    }}
                >
                    Your consent
                </h3>

                {consents.map((doc, index) => (
                    <ConsentCheckbox
                        key={doc.type}
                        name={doc.field}
                        checked={Boolean(
                            fields[doc.field as keyof RegisterFields],
                        )}
                        onChange={setChecked(doc.field as keyof RegisterFields)}
                        title={doc.title}
                        summary={doc.summary}
                        body={doc.body}
                        required={doc.required}
                        error={errors[doc.field]}
                        tabIndex={5 + index}
                    />
                ))}

                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                    {medicalHistoryCopy.policyPrefix}{' '}
                    <a href="/terms" target="_blank" rel="noreferrer">
                        {medicalHistoryCopy.termsLabel}
                    </a>{' '}
                    {medicalHistoryCopy.policyJoin}{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer">
                        {medicalHistoryCopy.privacyLabel}
                    </a>
                    .
                </p>
            </div>
        </>
    );
}
