// resources/js/pages/auth/register/steps/StepPersonal.tsx
import type { ChangeEvent } from 'react';
import { DateField } from '@/design-system';
import { normalizePhMobile } from '@/lib/input-masks';
import { todayIsoDate } from '@/lib/local-date';
import {
    Field,
    RadioGroup,
    errorBorder,
} from '@/pages/auth/register/components/register-ui';
import type {
    RegisterFields,
    StepErrors,
} from '@/pages/auth/register/hooks/use-register-form';
import {
    genderOptions,
    civilStatusOptions,
} from '@/pages/auth/register/sections/register-data';

interface StepPersonalProps {
    fields: RegisterFields;
    errors: StepErrors;
    set: (
        key: keyof RegisterFields,
    ) => (e: ChangeEvent<HTMLInputElement>) => void;
    setSanitized: (
        key: keyof RegisterFields,
        sanitize: (value: string) => string,
    ) => (e: ChangeEvent<HTMLInputElement>) => void;
    setRadio: (key: keyof RegisterFields) => (v: string) => void;
}

export default function StepPersonal({
    fields,
    errors,
    set,
    setSanitized,
    setRadio,
}: StepPersonalProps) {
    return (
        <>
            <Field label="Address" error={errors.address} required>
                <input
                    type="text"
                    name="address"
                    value={fields.address}
                    onChange={set('address')}
                    tabIndex={1}
                    placeholder="Street, Barangay, City"
                    className="wc-input"
                    style={errorBorder(errors.address)}
                />
            </Field>

            <Field label="Company" error={errors.company}>
                <input
                    type="text"
                    name="company"
                    value={fields.company}
                    onChange={set('company')}
                    tabIndex={2}
                    placeholder="Company or employer name (optional)"
                    className="wc-input"
                />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Birthdate" error={errors.birthdate} required>
                    <DateField
                        kind="date"
                        name="birthdate"
                        value={fields.birthdate}
                        onChange={set('birthdate')}
                        tabIndex={3}
                        max={todayIsoDate()}
                        className="wc-input"
                        style={errorBorder(errors.birthdate)}
                    />
                </Field>

                <Field
                    label="Contact No."
                    error={errors.contact_number}
                    required
                >
                    {/*
                        `type="tel"` restricts nothing on its own — it only
                        hints at a keyboard. `inputMode="numeric"` gets the
                        digit pad rather than the phone pad, which carries
                        `* # +` this field has no use for, and the sanitizer
                        is what actually keeps letters out. No `maxLength`:
                        it would truncate a pasted `+63 917 123 4567` before
                        the sanitizer could fold the country code.
                    */}
                    <input
                        type="tel"
                        name="contact_number"
                        value={fields.contact_number}
                        onChange={setSanitized(
                            'contact_number',
                            normalizePhMobile,
                        )}
                        tabIndex={4}
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="09171234567"
                        className="wc-input"
                        style={errorBorder(errors.contact_number)}
                    />
                </Field>
            </div>

            <Field label="Gender" required>
                <RadioGroup
                    name="gender"
                    options={genderOptions}
                    value={fields.gender}
                    onChange={setRadio('gender')}
                    error={errors.gender}
                />
            </Field>

            <Field label="Civil Status" required>
                <RadioGroup
                    name="civil_status"
                    options={civilStatusOptions}
                    value={fields.civil_status}
                    onChange={setRadio('civil_status')}
                    error={errors.civil_status}
                />
            </Field>
        </>
    );
}
