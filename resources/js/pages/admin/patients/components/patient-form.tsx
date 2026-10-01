// resources/js/pages/admin/patients/components/patient-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Demographic edit form for a Patient record.
//
// There is no HMO member-ID field on purpose. It is insurance identity, the
// same value LoaAccessTest asserts must not leak between families, and the
// server route does not accept it either — see AdminPatientController::update.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import {
    Alert,
    Button,
    DateField,
    Field,
    Input,
    Select,
} from '@/design-system';
import { ageFromBirthdate } from '@/lib/age';
import { hmoOptions, splitHmoProvider } from '@/lib/hmo-providers';
import { normalizePhMobile } from '@/lib/input-masks';
import {
    civilStatusOptions,
    coverageOptions,
    genderOptions,
    patientsCopy,
} from '@/pages/admin/patients/patients-data';
import type { AdminPatientRow } from '@/pages/admin/patients/patients-data';

interface PatientFormProps {
    patient: AdminPatientRow;
    onDone: () => void;
}

export function PatientForm({
    patient,
    onDone,
}: PatientFormProps): ReactElement {
    const { data, setData, put, processing, errors } = useForm({
        first_name: patient.firstName,
        last_name: patient.lastName,
        email: patient.email,
        contact_number: patient.contactNumber,
        age: patient.age?.toString() ?? '',
        gender: patient.gender ?? '',
        birthdate: patient.birthdate ?? '',
        address: patient.address ?? '',
        civil_status: patient.civilStatus ?? '',
        company: patient.company ?? '',
        default_coverage: patient.coverage ?? '',
        hmo_provider: patient.hmoProvider ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        put(`/admin/patients/${patient.id}`, {
            preserveScroll: true,
            onSuccess: onDone,
        });
    };

    // One stored string, two controls — see @/lib/hmo-providers.
    const hmoProvider = splitHmoProvider(data.hmo_provider, (v) =>
        setData('hmo_provider', v),
    );

    return (
        <form onSubmit={submit}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <Alert variant="info">{patientsCopy.clinicalNote}</Alert>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-4)',
                }}
            >
                <Field label="First name" required error={errors.first_name}>
                    <Input
                        value={data.first_name}
                        onChange={(e) => setData('first_name', e.target.value)}
                        error={Boolean(errors.first_name)}
                    />
                </Field>

                <Field label="Last name" required error={errors.last_name}>
                    <Input
                        value={data.last_name}
                        onChange={(e) => setData('last_name', e.target.value)}
                        error={Boolean(errors.last_name)}
                    />
                </Field>

                <Field label="Email" required error={errors.email}>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        error={Boolean(errors.email)}
                    />
                </Field>

                <Field
                    label="Contact number"
                    required
                    error={errors.contact_number}
                >
                    {/* `type="tel"` only hints at a keyboard; the sanitizer is
                        what keeps letters out, and `inputMode="numeric"` gets
                        the digit pad rather than the phone pad's `* # +`. */}
                    <Input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={data.contact_number}
                        onChange={(e) =>
                            setData(
                                'contact_number',
                                normalizePhMobile(e.target.value),
                            )
                        }
                        error={Boolean(errors.contact_number)}
                        placeholder="09171234567"
                    />
                </Field>

                {/*
                    Read-only and worked out from the birthdate beside it,
                    the way the booking sheet already does it. A typed age
                    is only correct on the day it is typed, and two
                    editable fields that mean the same thing eventually
                    disagree inside one record.
                */}
                <Field
                    label="Age"
                    hint="From the birthdate."
                    error={errors.age}
                >
                    <Input
                        readOnly
                        tabIndex={-1}
                        value={ageFromBirthdate(data.birthdate) ?? ''}
                        aria-label="Age, worked out from the birthdate"
                    />
                </Field>

                <Field label="Gender" error={errors.gender}>
                    <Select
                        value={data.gender}
                        onChange={(value) => setData('gender', value)}
                        invalid={Boolean(errors.gender)}
                        options={genderOptions}
                    />
                </Field>

                <Field label="Birthdate" error={errors.birthdate}>
                    <DateField
                        kind="date"
                        value={data.birthdate}
                        onChange={(e) => setData('birthdate', e.target.value)}
                        invalid={Boolean(errors.birthdate)}
                    />
                </Field>

                <Field label="Civil status" error={errors.civil_status}>
                    <Select
                        value={data.civil_status}
                        onChange={(value) => setData('civil_status', value)}
                        invalid={Boolean(errors.civil_status)}
                        options={civilStatusOptions}
                    />
                </Field>

                <Field label="Company" error={errors.company}>
                    <Input
                        value={data.company}
                        onChange={(e) => setData('company', e.target.value)}
                        error={Boolean(errors.company)}
                    />
                </Field>

                <Field label="Default coverage" error={errors.default_coverage}>
                    <Select
                        value={data.default_coverage}
                        onChange={(value) => setData('default_coverage', value)}
                        invalid={Boolean(errors.default_coverage)}
                        options={coverageOptions}
                    />
                </Field>

                {data.default_coverage === 'hmo' && (
                    <Field
                        label="HMO provider"
                        required
                        error={errors.hmo_provider}
                    >
                        <Select
                            value={hmoProvider.selectValue}
                            onChange={hmoProvider.onSelectChange}
                            invalid={Boolean(errors.hmo_provider)}
                            options={hmoOptions}
                        />
                    </Field>
                )}

                {/* "Other" names no provider anyone can verify coverage
                    against, so the option asks which one. */}
                {data.default_coverage === 'hmo' && hmoProvider.showOther && (
                    <Field
                        label="Which HMO provider?"
                        required
                        error={errors.hmo_provider}
                    >
                        <Input
                            value={hmoProvider.otherValue}
                            onChange={(e) =>
                                hmoProvider.onOtherChange(e.target.value)
                            }
                            maxLength={100}
                            placeholder="Provider name"
                            error={Boolean(errors.hmo_provider)}
                        />
                    </Field>
                )}

                <Field label="Address" error={errors.address}>
                    <Input
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        error={Boolean(errors.address)}
                    />
                </Field>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-3)',
                    marginTop: 'var(--space-6)',
                }}
            >
                <Button type="button" variant="ghost" onClick={onDone}>
                    {patientsCopy.cancel}
                </Button>
                <Button type="submit" loading={processing}>
                    {patientsCopy.editSubmit}
                </Button>
            </div>
        </form>
    );
}
