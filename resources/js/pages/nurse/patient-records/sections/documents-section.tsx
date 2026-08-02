// resources/js/pages/nurse/patient-records/sections/documents-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Documents — upload and download. Already the nurse's job in the lab flow.

import { useForm } from '@inertiajs/react';
import { Download, FileText } from 'lucide-react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import {
    fieldGrid,
    FieldError,
    SelectField,
    TextField,
} from '../components/field';
import {
    ActionButton,
    EmptyNote,
    RecordSection,
} from '../components/record-section';
import type { PatientDocument } from '../patient-records-data';
import {
    documentTypes,
    nursePatientRecordsMeta,
} from '../patient-records-data';

interface DocumentsSectionProps {
    patientId: number;
    documents: PatientDocument[];
}

export function DocumentsSection({
    patientId,
    documents,
}: DocumentsSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;
    const [uploading, setUploading] = useState(false);

    const form = useForm<{
        title: string;
        type: string;
        file: File | null;
    }>({
        title: '',
        type: 'lab',
        file: null,
    });

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();

        form.post(`/nurse/patient-records/${patientId}/documents`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setUploading(false);
            },
        });
    }

    function handleCancel(): void {
        form.reset();
        form.clearErrors();
        setUploading(false);
    }

    return (
        <RecordSection
            title={meta.documentsTitle}
            action={
                !uploading ? (
                    <ActionButton
                        label={meta.documentUploadLabel}
                        onClick={() => setUploading(true)}
                    />
                ) : undefined
            }
        >
            {uploading && (
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
                            label={meta.documentFields.title}
                            value={form.data.title}
                            onChange={(v) => form.setData('title', v)}
                            placeholder={meta.documentTitlePlaceholder}
                            error={form.errors.title}
                        />
                        <SelectField
                            label={meta.documentFields.type}
                            value={form.data.type}
                            onChange={(v) => form.setData('type', v)}
                            options={documentTypes}
                            error={form.errors.type}
                        />
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: 4,
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                {meta.documentFields.file}
                            </label>
                            <input
                                type="file"
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    form.setData(
                                        'file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                style={{
                                    width: '100%',
                                    fontSize: 'var(--text-xs)',
                                    fontFamily: 'var(--font-sans)',
                                    color: 'var(--wc-gray-600)',
                                }}
                            />
                            {form.errors.file ? (
                                <FieldError message={form.errors.file} />
                            ) : (
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: '11px',
                                        color: 'var(--wc-gray-400)',
                                    }}
                                >
                                    {meta.documentHint}
                                </p>
                            )}
                        </div>
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
                                ? meta.documentSavingLabel
                                : meta.documentSaveLabel}
                        </button>
                        <ActionButton
                            label={meta.documentCancelLabel}
                            onClick={handleCancel}
                            tone="ghost"
                            disabled={form.processing}
                        />
                    </div>
                </form>
            )}

            {documents.length === 0 && !uploading ? (
                <EmptyNote>{meta.documentsEmpty}</EmptyNote>
            ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {documents.map((document, index) => (
                        <li
                            key={document.id}
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
                                    width: 34,
                                    height: 34,
                                    flexShrink: 0,
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#eff6ff',
                                    color: 'var(--wc-blue-600)',
                                }}
                            >
                                <FileText size={16} strokeWidth={1.8} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {document.title}
                                </p>
                                <p
                                    style={{
                                        margin: '2px 0 0',
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {document.type} · {document.size} ·{' '}
                                    {document.uploadedAt}
                                </p>
                            </div>
                            <a
                                href={document.downloadUrl}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 12px',
                                    borderRadius: 10,
                                    background: 'var(--wc-gray-50)',
                                    border: '1px solid var(--wc-gray-200)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    color: 'var(--wc-gray-600)',
                                    textDecoration: 'none',
                                }}
                            >
                                <Download size={13} strokeWidth={2} />
                                {meta.documentDownloadLabel}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </RecordSection>
    );
}
