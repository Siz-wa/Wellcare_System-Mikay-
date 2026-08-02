// resources/js/pages/nurse/patient-records/sections/allergies-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Allergies — the nurse's own intake data. Add and remove are both allowed.

import { router, useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { fieldGrid, SelectField, TextField } from '../components/field';
import {
    ActionButton,
    EmptyNote,
    RecordSection,
} from '../components/record-section';
import type { Allergy } from '../patient-records-data';
import {
    nursePatientRecordsMeta,
    severityColors,
    severityOptions,
} from '../patient-records-data';

interface AllergiesSectionProps {
    patientId: number;
    allergies: Allergy[];
}

export function AllergiesSection({
    patientId,
    allergies,
}: AllergiesSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;
    const [adding, setAdding] = useState(false);

    const form = useForm({
        allergen: '',
        severity: 'mild',
        reaction: '',
        notes: '',
    });

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();

        form.post(`/nurse/patient-records/${patientId}/allergies`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setAdding(false);
            },
        });
    }

    function handleCancel(): void {
        form.reset();
        form.clearErrors();
        setAdding(false);
    }

    function handleRemove(allergyId: number): void {
        router.delete(`/nurse/patient-records/allergies/${allergyId}`, {
            preserveScroll: true,
        });
    }

    return (
        <RecordSection
            title={meta.allergiesTitle}
            action={
                !adding ? (
                    <ActionButton
                        label={meta.allergyAddLabel}
                        onClick={() => setAdding(true)}
                    />
                ) : undefined
            }
        >
            {adding && (
                <form
                    onSubmit={handleSubmit}
                    style={{
                        padding: 'var(--space-4)',
                        marginBottom: 'var(--space-4)',
                        background: 'var(--wc-gray-50)',
                        borderRadius: 12,
                    }}
                >
                    <div style={fieldGrid}>
                        <TextField
                            label={meta.allergyFields.allergen}
                            value={form.data.allergen}
                            onChange={(v) => form.setData('allergen', v)}
                            placeholder={meta.allergyPlaceholders.allergen}
                            error={form.errors.allergen}
                        />
                        <SelectField
                            label={meta.allergyFields.severity}
                            value={form.data.severity}
                            onChange={(v) => form.setData('severity', v)}
                            options={severityOptions}
                            error={form.errors.severity}
                        />
                        <TextField
                            label={meta.allergyFields.reaction}
                            value={form.data.reaction}
                            onChange={(v) => form.setData('reaction', v)}
                            placeholder={meta.allergyPlaceholders.reaction}
                            error={form.errors.reaction}
                        />
                        <TextField
                            label={meta.allergyFields.notes}
                            value={form.data.notes}
                            onChange={(v) => form.setData('notes', v)}
                            placeholder={meta.allergyPlaceholders.notes}
                            error={form.errors.notes}
                        />
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-4)',
                        }}
                    >
                        <button
                            type="submit"
                            disabled={form.processing}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'var(--wc-blue-600)',
                                color: '#fff',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                fontFamily: 'var(--font-sans)',
                                cursor: form.processing ? 'wait' : 'pointer',
                                opacity: form.processing ? 0.7 : 1,
                            }}
                        >
                            {form.processing
                                ? meta.allergySavingLabel
                                : meta.allergySaveLabel}
                        </button>
                        <ActionButton
                            label={meta.allergyCancelLabel}
                            onClick={handleCancel}
                            tone="ghost"
                            disabled={form.processing}
                        />
                    </div>
                </form>
            )}

            {allergies.length === 0 && !adding ? (
                <EmptyNote>{meta.allergiesEmpty}</EmptyNote>
            ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {allergies.map((allergy, index) => (
                        <li
                            key={allergy.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                                padding: 'var(--space-3) 0',
                                borderTop:
                                    index === 0
                                        ? 'none'
                                        : '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    background:
                                        severityColors[allergy.severity] ??
                                        'var(--wc-gray-400)',
                                }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {allergy.allergen}
                                    <span
                                        style={{
                                            marginLeft: 8,
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color:
                                                severityColors[
                                                    allergy.severity
                                                ] ?? 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {allergy.severity}
                                    </span>
                                </p>
                                {(allergy.reaction || allergy.notes) && (
                                    <p
                                        style={{
                                            margin: '2px 0 0',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {[allergy.reaction, allergy.notes]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>
                            <ActionButton
                                label={meta.allergyRemoveLabel}
                                onClick={() => handleRemove(allergy.id)}
                                tone="danger"
                            />
                        </li>
                    ))}
                </ul>
            )}
        </RecordSection>
    );
}
