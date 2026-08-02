// resources/js/pages/nurse/patient-records/sections/profile-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fig. 10's "encode patient data" — demographics only.
//
// Coverage fields (default_coverage, hmo_provider, hmo_id) are deliberately not
// here; UpdatePatientDemographicsRequest rejects them server-side too.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import {
    fieldGrid,
    ReadOnlyField,
    SelectField,
    TextField,
} from '../components/field';
import { ActionButton, RecordSection } from '../components/record-section';
import type { PatientProfile } from '../patient-records-data';
import {
    civilStatusOptions,
    genderOptions,
    nursePatientRecordsMeta,
} from '../patient-records-data';

interface ProfileSectionProps {
    patientId: number;
    profile: PatientProfile;
}

/** `d M Y` back to the `YYYY-MM-DD` an <input type="date"> needs. */
function toDateInput(value: string | null): string {
    if (!value) {
        return '';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? ''
        : parsed.toISOString().slice(0, 10);
}

export function ProfileSection({
    patientId,
    profile,
}: ProfileSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;
    const labels = meta.profileFields;
    const [editing, setEditing] = useState(false);

    const form = useForm({
        first_name: profile.firstName ?? '',
        last_name: profile.lastName ?? '',
        email: profile.email ?? '',
        contact_number: profile.contactNumber ?? '',
        birthdate: toDateInput(profile.birthdate),
        gender: profile.gender ?? '',
        civil_status: profile.civilStatus ?? '',
        address: profile.address ?? '',
    });

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();

        form.patch(`/nurse/patient-records/${patientId}`, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    function handleCancel(): void {
        form.reset();
        form.clearErrors();
        setEditing(false);
    }

    if (!editing) {
        return (
            <RecordSection
                title={meta.profileTitle}
                note={meta.coverageNote}
                action={
                    <ActionButton
                        label={meta.profileEditLabel}
                        onClick={() => setEditing(true)}
                        tone="ghost"
                    />
                }
            >
                <div style={fieldGrid}>
                    <ReadOnlyField
                        label={labels.firstName}
                        value={profile.firstName}
                    />
                    <ReadOnlyField
                        label={labels.lastName}
                        value={profile.lastName}
                    />
                    <ReadOnlyField
                        label={labels.clientNumber}
                        value={profile.clientNumber}
                    />
                    <ReadOnlyField label={labels.email} value={profile.email} />
                    <ReadOnlyField
                        label={labels.contactNumber}
                        value={profile.contactNumber}
                    />
                    <ReadOnlyField
                        label={labels.birthdate}
                        value={profile.birthdate}
                    />
                    <ReadOnlyField
                        label={labels.gender}
                        value={profile.gender}
                    />
                    <ReadOnlyField
                        label={labels.civilStatus}
                        value={profile.civilStatus}
                    />
                    <ReadOnlyField
                        label={labels.address}
                        value={profile.address}
                    />
                </div>
            </RecordSection>
        );
    }

    return (
        <RecordSection title={meta.profileTitle} note={meta.coverageNote}>
            <form onSubmit={handleSubmit}>
                <div style={fieldGrid}>
                    <TextField
                        label={labels.firstName}
                        value={form.data.first_name}
                        onChange={(v) => form.setData('first_name', v)}
                        error={form.errors.first_name}
                    />
                    <TextField
                        label={labels.lastName}
                        value={form.data.last_name}
                        onChange={(v) => form.setData('last_name', v)}
                        error={form.errors.last_name}
                    />
                    <TextField
                        label={labels.email}
                        type="email"
                        value={form.data.email}
                        onChange={(v) => form.setData('email', v)}
                        error={form.errors.email}
                    />
                    <TextField
                        label={labels.contactNumber}
                        value={form.data.contact_number}
                        onChange={(v) => form.setData('contact_number', v)}
                        error={form.errors.contact_number}
                    />
                    <TextField
                        label={labels.birthdate}
                        type="date"
                        value={form.data.birthdate}
                        onChange={(v) => form.setData('birthdate', v)}
                        error={form.errors.birthdate}
                    />
                    <SelectField
                        label={labels.gender}
                        value={form.data.gender}
                        onChange={(v) => form.setData('gender', v)}
                        options={genderOptions}
                        error={form.errors.gender}
                    />
                    <SelectField
                        label={labels.civilStatus}
                        value={form.data.civil_status}
                        onChange={(v) => form.setData('civil_status', v)}
                        options={civilStatusOptions}
                        error={form.errors.civil_status}
                    />
                    <TextField
                        label={labels.address}
                        value={form.data.address}
                        onChange={(v) => form.setData('address', v)}
                        error={form.errors.address}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-5)',
                    }}
                >
                    <button
                        type="submit"
                        disabled={form.processing}
                        style={{
                            padding: '9px 18px',
                            borderRadius: 10,
                            border: 'none',
                            background: 'var(--wc-blue-600)',
                            color: '#fff',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            cursor: form.processing ? 'wait' : 'pointer',
                            opacity: form.processing ? 0.7 : 1,
                        }}
                    >
                        {form.processing
                            ? meta.profileSavingLabel
                            : meta.profileSaveLabel}
                    </button>
                    <ActionButton
                        label={meta.profileCancelLabel}
                        onClick={handleCancel}
                        tone="ghost"
                        disabled={form.processing}
                    />
                </div>
            </form>
        </RecordSection>
    );
}
