// resources/js/pages/admin/patients/components/patient-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Demographic edit form for a Patient record.
//
// There is no HMO member-ID field on purpose. It is insurance identity, the
// same value LoaAccessTest asserts must not leak between families, and the
// server route does not accept it either — see AdminPatientController::update.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { Alert, Button, Field, Input, Select } from '@/design-system';
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
                    <Input
                        value={data.contact_number}
                        onChange={(e) =>
                            setData('contact_number', e.target.value)
                        }
                        error={Boolean(errors.contact_number)}
                        placeholder="09XXXXXXXXX"
                    />
                </Field>

                <Field label="Age" error={errors.age}>
                    <Input
                        type="number"
                        min={0}
                        max={120}
                        value={data.age}
                        onChange={(e) => setData('age', e.target.value)}
                        error={Boolean(errors.age)}
                    />
                </Field>

                <Field label="Gender" error={errors.gender}>
                    <Select
                        value={data.gender}
                        onChange={(e) => setData('gender', e.target.value)}
                        error={Boolean(errors.gender)}
                        options={genderOptions}
                    />
                </Field>

                <Field label="Birthdate" error={errors.birthdate}>
                    <Input
                        type="date"
                        value={data.birthdate}
                        onChange={(e) => setData('birthdate', e.target.value)}
                        error={Boolean(errors.birthdate)}
                    />
                </Field>

                <Field label="Civil status" error={errors.civil_status}>
                    <Select
                        value={data.civil_status}
                        onChange={(e) =>
                            setData('civil_status', e.target.value)
                        }
                        error={Boolean(errors.civil_status)}
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
                        onChange={(e) =>
                            setData('default_coverage', e.target.value)
                        }
                        error={Boolean(errors.default_coverage)}
                        options={coverageOptions}
                    />
                </Field>

                {data.default_coverage === 'hmo' && (
                    <Field
                        label="HMO provider"
                        required
                        error={errors.hmo_provider}
                    >
                        <Input
                            value={data.hmo_provider}
                            onChange={(e) =>
                                setData('hmo_provider', e.target.value)
                            }
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
