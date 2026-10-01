// resources/js/pages/doctor/dashboard/patient-records/patient-record-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full patient record — demographics, allergy flags, diagnosis history,
// visit timeline, latest vitals, and document management.
//
// TOAST: Every mutating action now shows a local success/error toast so the
// doctor gets immediate feedback without relying solely on the flash prop.

import { router, usePage, Link, useForm } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState, useCallback, useEffect } from 'react';
import React from 'react';
import { DateField, Select } from '@/design-system';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { todayIsoDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';
import { DashboardLayout } from '../layout/dashboard-layout';
import {
    SEVERITY_CONFIG,
    DIAGNOSIS_STATUS_CONFIG,
    DOC_TYPE_LABEL,
} from './patient-records-data';
import type {
    Patient,
    PatientProfile,
    AllergyRecord,
    DiagnosisRecord,
    DocumentRecord,
    VisitRecord,
    LatestVitals,
} from './patient-records-data';

// ── Inertia props ─────────────────────────────────────────────────────────────

interface PageData extends PageProps {
    patient: Patient;
    profile: PatientProfile | null;
    allergies: AllergyRecord[];
    diagnoses: DiagnosisRecord[];
    documents: DocumentRecord[];
    visits: VisitRecord[];
    latestVitals: LatestVitals | null;
}

type DetailTab =
    | 'overview'
    | 'allergies'
    | 'diagnoses'
    | 'visits'
    | 'documents';

// ── Local toast ───────────────────────────────────────────────────────────────
// Self-contained toast used specifically for useForm callbacks which don't
// go through the Inertia flash cycle the same way router.post/delete do.

interface ToastState {
    message: string;
    type: 'success' | 'error';
    key: number;
}

function LocalToast({
    toast,
    onDismiss,
}: {
    toast: ToastState;
    onDismiss: () => void;
}): ReactElement {
    useEffect(() => {
        const t = setTimeout(onDismiss, 4000);

        return () => clearTimeout(t);
    }, [toast.key]);

    const isSuccess = toast.type === 'success';

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 'var(--space-6)',
                right: 'var(--space-6)',
                zIndex: 9999,
                padding: '14px 20px',
                borderRadius: '14px',
                background: isSuccess ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                color: isSuccess ? '#15803d' : '#b91c1c',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                boxShadow: '0 10px 40px -4px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                maxWidth: 360,
                animation: 'slideUp 0.2s ease',
            }}
        >
            {isSuccess ? (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ) : (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            )}
            {toast.message}
            <button
                onClick={onDismiss}
                style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    padding: 0,
                    fontSize: 'var(--text-base)',
                    lineHeight: 1,
                }}
            >
                ×
            </button>
        </div>
    );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);

    const show = useCallback(
        (message: string, type: 'success' | 'error' = 'success') => {
            setToast({ message, type, key: Date.now() });
        },
        [],
    );

    const dismiss = useCallback(() => setToast(null), []);

    return { toast, show, dismiss };
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
    title,
    action,
}: {
    title: string;
    action?: ReactElement;
}): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
            }}
        >
            <h3
                style={{
                    margin: 0,
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--wc-text-primary)',
                }}
            >
                {title}
            </h3>
            {action}
        </div>
    );
}

// ── Vital chip ────────────────────────────────────────────────────────────────

function VitalChip({
    label,
    value,
    unit,
}: {
    label: string;
    value: string;
    unit: string;
}): ReactElement {
    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--wc-gray-100)',
                background: value?.trim() ? '#fff' : 'var(--wc-gray-50)',
            }}
        >
            <p
                style={{
                    margin: '0 0 4px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--wc-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                }}
            >
                {label}
            </p>
            {value?.trim() ? (
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-lg)',
                        fontWeight: 800,
                        color: 'var(--wc-text-primary)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {value}{' '}
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {unit}
                    </span>
                </p>
            ) : (
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-300)',
                        fontStyle: 'italic',
                    }}
                >
                    Not recorded
                </p>
            )}
        </div>
    );
}

// ── Shared field helper ───────────────────────────────────────────────────────

/** The subset of the child control's props this wrapper takes over. */
interface WrappedControlProps {
    id?: string;
    'aria-invalid'?: boolean;
}

function Field({
    label,
    error,
    children,
}: {
    label?: string;
    error?: string;
    children: React.ReactNode;
}): ReactElement {
    const controlId = `record-field-${React.useId()}`;

    /*
      These forms carried the field name only in the placeholder — including
      the required marker, as `"Diagnosis name *"`. A placeholder disappears
      at the first keystroke, which is exactly when someone reviewing a
      half-filled form needs to know what a box holds, and placeholder grey
      rarely clears the contrast floor. The label is now real and attached;
      the placeholder is demoted to an example of the format, which is what
      a placeholder is actually good for.
    */
    const control = React.isValidElement<WrappedControlProps>(children)
        ? React.cloneElement(children, {
              id: children.props.id ?? controlId,
              'aria-invalid':
                  children.props['aria-invalid'] ?? (error ? true : undefined),
          })
        : children;

    return (
        <div>
            {label && (
                <label
                    htmlFor={controlId}
                    style={{
                        display: 'block',
                        marginBottom: 4,
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {label}
                </label>
            )}
            {control}
            {error && (
                <p
                    style={{
                        margin: '4px 0 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--wc-text-error)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Add allergy form ──────────────────────────────────────────────────────────

function AddAllergyForm({
    patientId,
    onDone,
    onSuccess,
    onError,
}: {
    patientId: number;
    onDone: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}): ReactElement {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            allergen: '',
            severity: 'moderate',
            reaction: '',
            notes: '',
        });

    function submit(e: React.FormEvent): void {
        e.preventDefault();
        post(`/doctor/patient-records/${patientId}/allergies`, {
            onSuccess: () => {
                reset();
                onDone();
                onSuccess('Allergy recorded successfully.');
            },
            onError: () =>
                onError('Failed to save allergy. Please check the fields.'),
        });
    }

    const s = (field: keyof typeof data, value: string) => {
        setData(field, value);

        if (errors[field]) {
            clearErrors(field);
        }
    };

    return (
        <form
            onSubmit={submit}
            style={{
                padding: 'var(--space-5)',
                borderRadius: '14px',
                border: '1px solid var(--wc-blue-100)',
                background: 'var(--wc-blue-50)',
                marginBottom: 'var(--space-4)',
            }}
        >
            <p
                style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--wc-text-primary)',
                }}
            >
                Add Allergy
            </p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Allergen" error={errors.allergen}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.allergen && 'wc-input-error',
                        )}
                        placeholder="e.g. Penicillin"
                        value={data.allergen}
                        onChange={(e) => s('allergen', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>

                <Field label="Severity" error={errors.severity}>
                    <Select
                        value={data.severity}
                        onChange={(value) => s('severity', value)}
                        invalid={Boolean(errors.severity)}
                        required
                        placeholder="Select severity"
                        options={[
                            { value: 'mild', label: 'Mild' },
                            { value: 'moderate', label: 'Moderate' },
                            { value: 'severe', label: 'Severe' },
                        ]}
                    />
                </Field>

                <Field label="Reaction" error={errors.reaction}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.reaction && 'wc-input-error',
                        )}
                        placeholder="e.g. Hives, anaphylaxis"
                        value={data.reaction}
                        onChange={(e) => s('reaction', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>

                <Field label="Notes" error={errors.notes}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.notes && 'wc-input-error',
                        )}
                        placeholder="Optional"
                        value={data.notes}
                        onChange={(e) => s('notes', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                    type="submit"
                    disabled={processing}
                    className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                    style={{ opacity: processing ? 0.6 : 1 }}
                >
                    {processing ? 'Saving…' : 'Save Allergy'}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Add diagnosis form ────────────────────────────────────────────────────────

function AddDiagnosisForm({
    patientId,
    onDone,
    onSuccess,
    onError,
}: {
    patientId: number;
    onDone: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}): ReactElement {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            diagnosis: '',
            icd_code: '',
            type: 'primary',
            status: 'active',
            diagnosed_at: todayIsoDate(),
            notes: '',
        });

    function submit(e: React.FormEvent): void {
        e.preventDefault();
        post(`/doctor/patient-records/${patientId}/diagnoses`, {
            onSuccess: () => {
                reset();
                onDone();
                onSuccess('Diagnosis recorded successfully.');
            },
            onError: () =>
                onError('Failed to save diagnosis. Please check the fields.'),
        });
    }

    const s = (field: keyof typeof data, value: string) => {
        setData(field, value);

        if (errors[field]) {
            clearErrors(field);
        }
    };

    return (
        <form
            onSubmit={submit}
            style={{
                padding: 'var(--space-5)',
                borderRadius: '14px',
                border: '1px solid var(--wc-blue-100)',
                background: 'var(--wc-blue-50)',
                marginBottom: 'var(--space-4)',
            }}
        >
            <p
                style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--wc-text-primary)',
                }}
            >
                Add Diagnosis
            </p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Diagnosis" error={errors.diagnosis}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.diagnosis && 'wc-input-error',
                        )}
                        placeholder="e.g. Acute nasopharyngitis"
                        value={data.diagnosis}
                        onChange={(e) => s('diagnosis', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>

                <Field label="ICD-10 code" error={errors.icd_code}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.icd_code && 'wc-input-error',
                        )}
                        placeholder="e.g. J06.9"
                        value={data.icd_code}
                        onChange={(e) => s('icd_code', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>

                <Field label="Type" error={errors.type}>
                    <Select
                        value={data.type}
                        onChange={(value) => s('type', value)}
                        invalid={Boolean(errors.type)}
                        required
                        placeholder="Select type"
                        options={[
                            { value: 'primary', label: 'Primary' },
                            { value: 'secondary', label: 'Secondary' },
                            { value: 'chronic', label: 'Chronic' },
                        ]}
                    />
                </Field>

                <Field label="Status" error={errors.status}>
                    <Select
                        value={data.status}
                        onChange={(value) => s('status', value)}
                        invalid={Boolean(errors.status)}
                        required
                        placeholder="Select status"
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'chronic', label: 'Chronic' },
                            { value: 'resolved', label: 'Resolved' },
                        ]}
                    />
                </Field>

                <Field label="Diagnosed on" error={errors.diagnosed_at}>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--wc-text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: '4px',
                            }}
                        >
                            Date diagnosed *
                        </label>
                        <DateField
                            kind="date"
                            className={cn(
                                'wc-input',
                                errors.diagnosed_at && 'wc-input-error',
                            )}
                            value={data.diagnosed_at}
                            max={todayIsoDate()}
                            onChange={(e) => s('diagnosed_at', e.target.value)}
                            style={{
                                fontSize: 'var(--text-sm)',
                                width: '100%',
                            }}
                        />
                    </div>
                </Field>

                <Field label="Notes" error={errors.notes}>
                    <input
                        className={cn(
                            'wc-input',
                            errors.notes && 'wc-input-error',
                        )}
                        placeholder="Optional"
                        value={data.notes}
                        onChange={(e) => s('notes', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                </Field>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                    type="submit"
                    disabled={processing}
                    className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                    style={{ opacity: processing ? 0.6 : 1 }}
                >
                    {processing ? 'Saving…' : 'Save Diagnosis'}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Document upload form ──────────────────────────────────────────────────────

function DocumentUploadForm({
    patientId,
    onSuccess,
    onError,
}: {
    patientId: number;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}): ReactElement {
    const { data, setData, post, processing, reset, errors } = useForm<{
        title: string;
        type: string;
        file: File | null;
    }>({ title: '', type: '', file: null });

    function submit(e: React.FormEvent): void {
        e.preventDefault();
        post(`/doctor/patient-records/${patientId}/documents`, {
            forceFormData: true,
            onSuccess: () => {
                reset();
                onSuccess('Document uploaded successfully.');
            },
            onError: () =>
                onError('Upload failed. Please check the file and try again.'),
        });
    }

    return (
        <form
            onSubmit={submit}
            className="mb-5 grid grid-cols-1 items-end gap-3 rounded-[14px] border border-wc-blue-100 bg-wc-blue-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:p-5"
        >
            <div>
                <input
                    className={cn('wc-input', errors.title && 'wc-input-error')}
                    placeholder="Document title *"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                />
                {errors.title && (
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-error)',
                        }}
                    >
                        {errors.title}
                    </p>
                )}
            </div>
            <div>
                <Select
                    value={data.type}
                    onChange={(value) => setData('type', value)}
                    invalid={Boolean(errors.type)}
                    placeholder="Select type…"
                    options={[
                        { value: 'lab', label: 'Lab Result' },
                        { value: 'imaging', label: 'Imaging' },
                        { value: 'referral', label: 'Referral' },
                        { value: 'prescription', label: 'Prescription' },
                        { value: 'report', label: 'Report' },
                        { value: 'other', label: 'Other' },
                    ]}
                />
                {errors.type && (
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-error)',
                        }}
                    >
                        {errors.type}
                    </p>
                )}
            </div>
            <button
                type="submit"
                disabled={processing || !data.title || !data.type || !data.file}
                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                style={{
                    opacity:
                        processing || !data.title || !data.type || !data.file
                            ? 0.6
                            : 1,
                }}
            >
                {processing ? 'Uploading…' : 'Upload'}
            </button>
            <div style={{ gridColumn: '1 / -1' }}>
                <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="wc-input"
                    style={{ fontSize: 'var(--text-sm)' }}
                    onChange={(e) =>
                        setData('file', e.target.files?.[0] ?? null)
                    }
                />
                {errors.file && (
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-error)',
                        }}
                    >
                        {errors.file}
                    </p>
                )}
            </div>
        </form>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientRecordDetail(): ReactElement {
    const { confirm, dialog } = useConfirmDialog();

    const { props } = usePage<PageData>();
    const {
        patient,
        profile,
        allergies,
        diagnoses,
        documents,
        visits,
        latestVitals,
    } = props;

    const [tab, setTab] = useState<DetailTab>('overview');
    const [showAddAllergy, setShowAddAllergy] = useState(false);
    const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);

    const { toast, show: showToast, dismiss: dismissToast } = useToast();

    const tabs: { key: DetailTab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        {
            key: 'allergies',
            label: `Allergies${allergies.length > 0 ? ` (${allergies.length})` : ''}`,
        },
        { key: 'diagnoses', label: 'Diagnoses' },
        { key: 'visits', label: 'Visit History' },
        { key: 'documents', label: 'Documents' },
    ];

    // ── Delete handlers — use preserveScroll so the page doesn't jump,
    //    and show toast on success/error via router callbacks.

    async function deleteAllergy(id: number): Promise<void> {
        if (
            !(await confirm({
                title: 'Remove this allergy record?',
                description:
                    'It will no longer be checked against new prescriptions for this patient.',
                confirmLabel: 'Remove allergy',
            }))
        ) {
            return;
        }

        router.delete(`/doctor/patient-records/allergies/${id}`, {
            preserveScroll: true,
            onSuccess: () => showToast('Allergy record removed.'),
            onError: () => showToast('Failed to remove allergy.', 'error'),
        });
    }

    async function deleteDiagnosis(id: number): Promise<void> {
        if (
            !(await confirm({
                title: 'Remove this diagnosis?',
                description: "It will be taken off this patient's record.",
                confirmLabel: 'Remove diagnosis',
            }))
        ) {
            return;
        }

        router.delete(`/doctor/patient-records/diagnoses/${id}`, {
            preserveScroll: true,
            onSuccess: () => showToast('Diagnosis removed.'),
            onError: () => showToast('Failed to remove diagnosis.', 'error'),
        });
    }

    function markDiagnosisResolved(id: number): void {
        router.patch(
            `/doctor/patient-records/diagnoses/${id}`,
            { status: 'resolved' },
            {
                preserveScroll: true,
                onSuccess: () => showToast('Diagnosis marked as resolved.'),
                onError: () =>
                    showToast('Failed to update diagnosis.', 'error'),
            },
        );
    }

    async function deleteDocument(id: number): Promise<void> {
        if (
            !(await confirm({
                title: 'Delete this document?',
                description: 'This cannot be undone.',
                confirmLabel: 'Delete document',
            }))
        ) {
            return;
        }

        router.delete(`/doctor/patient-records/documents/${id}`, {
            preserveScroll: true,
            onSuccess: () => showToast('Document deleted.'),
            onError: () => showToast('Failed to delete document.', 'error'),
        });
    }

    return (
        <>
            {dialog}
            <DashboardLayout activeId="patient-records">
                {/* ── Back + header ── */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <Link
                        href="/doctor/patient-records"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                            textDecoration: 'none',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Patient Records
                    </Link>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-4)',
                        }}
                    >
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: '16px',
                                background: 'var(--wc-blue-600)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-lg)',
                                fontWeight: 800,
                                flexShrink: 0,
                            }}
                        >
                            {patient.initials}
                        </div>
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-2xl)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.02em',
                                        color: 'var(--wc-text-primary)',
                                        fontFamily: 'var(--font-display)',
                                    }}
                                >
                                    {patient.name}
                                </h1>
                                {patient.hasAllergy && (
                                    <span
                                        style={{
                                            background: '#fee2e2',
                                            color: '#b91c1c',
                                            padding: '3px 12px',
                                            borderRadius: '100px',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 800,
                                            border: '1px solid #fecaca',
                                        }}
                                    >
                                        ⚠ ALLERGY ON FILE
                                    </span>
                                )}
                            </div>
                            <p
                                style={{
                                    margin: '3px 0 0',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                {patient.patientId} · {patient.email}
                                {profile?.birthdate &&
                                    ` · Born ${profile.birthdate}`}
                                {profile?.gender && ` · ${profile.gender}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tab bar ── */}
                <div
                    style={{
                        borderBottom: '1px solid var(--wc-gray-100)',
                        marginBottom: 'var(--space-6)',
                        display: 'flex',
                        gap: '4px',
                    }}
                >
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: 'var(--text-sm)',
                                fontWeight: tab === t.key ? 700 : 500,
                                color:
                                    tab === t.key
                                        ? 'var(--wc-blue-600)'
                                        : 'var(--wc-gray-500)',
                                cursor: 'pointer',
                                borderBottom:
                                    tab === t.key
                                        ? '2px solid var(--wc-blue-600)'
                                        : '2px solid transparent',
                                marginBottom: '-1px',
                                transition: 'all 0.15s',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── OVERVIEW ── */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Demographics */}
                        <div
                            className="wc-card"
                            style={{ padding: 'var(--space-5)' }}
                        >
                            <SectionHeader title="Demographics" />
                            {profile ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-3)',
                                    }}
                                >
                                    {[
                                        {
                                            label: 'Full Name',
                                            value: `${profile.firstName} ${profile.lastName}`,
                                        },
                                        {
                                            label: 'Birthdate',
                                            value: profile.birthdate ?? '—',
                                        },
                                        {
                                            label: 'Gender',
                                            value: profile.gender ?? '—',
                                        },
                                        {
                                            label: 'Civil Status',
                                            value: profile.civilStatus ?? '—',
                                        },
                                        {
                                            label: 'Blood Type',
                                            value: profile.bloodType ?? '—',
                                        },
                                        {
                                            label: 'Contact',
                                            value: profile.contactNumber ?? '—',
                                        },
                                        {
                                            label: 'Address',
                                            value: profile.address ?? '—',
                                        },
                                    ].map((row) => (
                                        <div
                                            key={row.label}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: 'var(--space-2) 0',
                                                borderBottom:
                                                    '1px solid var(--wc-gray-100)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-text-muted)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                }}
                                            >
                                                {row.label}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 600,
                                                    color: 'var(--wc-text-primary)',
                                                }}
                                            >
                                                {row.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-text-muted)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    No profile on file.
                                </p>
                            )}
                        </div>

                        {/* Latest vitals */}
                        <div
                            className="wc-card"
                            style={{ padding: 'var(--space-5)' }}
                        >
                            <SectionHeader title="Latest Vitals" />
                            {latestVitals ? (
                                <>
                                    {/* Where they came from, before what they are. On a
                                video visit the doctor measured none of these —
                                the patient read them out — and the chart has to
                                say so rather than implying a clinic cuff. */}
                                    <p
                                        style={{
                                            margin: '0 0 var(--space-3)',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 600,
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {latestVitals.sourceLabel ??
                                            'Source not recorded.'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                        <VitalChip
                                            label="Blood Pressure"
                                            value={latestVitals.bloodPressure}
                                            unit="mmHg"
                                        />
                                        <VitalChip
                                            label="Heart Rate"
                                            value={latestVitals.heartRate}
                                            unit="bpm"
                                        />
                                        <VitalChip
                                            label="Temperature"
                                            value={latestVitals.temperature}
                                            unit="°C"
                                        />
                                        <VitalChip
                                            label="O₂ Saturation"
                                            value={
                                                latestVitals.oxygenSaturation
                                            }
                                            unit="%"
                                        />
                                        <VitalChip
                                            label="Weight"
                                            value={latestVitals.weight}
                                            unit="kg"
                                        />
                                        <VitalChip
                                            label="Height"
                                            value={latestVitals.height}
                                            unit="cm"
                                        />
                                    </div>
                                </>
                            ) : (
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-text-muted)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    No vitals on record yet.
                                </p>
                            )}
                        </div>

                        {/* Allergy summary */}
                        {allergies.length > 0 && (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-5)',
                                    gridColumn: '1 / -1',
                                    borderLeft: '4px solid #ef4444',
                                }}
                            >
                                <SectionHeader title="⚠ Known Allergies" />
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 'var(--space-3)',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {allergies.map((a) => {
                                        const cfg = SEVERITY_CONFIG[a.severity];

                                        return (
                                            <span
                                                key={a.id}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '100px',
                                                    background: cfg.bg,
                                                    color: cfg.color,
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 700,
                                                    border: `1px solid ${cfg.color}40`,
                                                }}
                                            >
                                                {a.allergen}
                                                {a.reaction && (
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            opacity: 0.8,
                                                        }}
                                                    >
                                                        {' '}
                                                        · {a.reaction}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Active diagnoses summary */}
                        {diagnoses.filter((d) => d.status === 'active').length >
                            0 && (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-5)',
                                    gridColumn: '1 / -1',
                                }}
                            >
                                <SectionHeader title="Active Conditions" />
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-2)',
                                    }}
                                >
                                    {diagnoses
                                        .filter((d) => d.status === 'active')
                                        .map((d) => (
                                            <div
                                                key={d.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'space-between',
                                                    padding:
                                                        'var(--space-3) var(--space-4)',
                                                    borderRadius: '10px',
                                                    background:
                                                        'var(--wc-gray-50)',
                                                    border: '1px solid var(--wc-gray-100)',
                                                }}
                                            >
                                                <div>
                                                    <span
                                                        style={{
                                                            fontSize:
                                                                'var(--text-sm)',
                                                            fontWeight: 700,
                                                            color: 'var(--wc-text-primary)',
                                                        }}
                                                    >
                                                        {d.diagnosis}
                                                    </span>
                                                    {d.icdCode && (
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    'var(--text-xs)',
                                                                color: 'var(--wc-text-muted)',
                                                                marginLeft:
                                                                    'var(--space-2)',
                                                            }}
                                                        >
                                                            {d.icdCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize:
                                                            'var(--text-xs)',
                                                        color: 'var(--wc-text-muted)',
                                                    }}
                                                >
                                                    Since {d.diagnosedAt}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── ALLERGIES ── */}
                {tab === 'allergies' && (
                    <div>
                        {showAddAllergy ? (
                            <AddAllergyForm
                                patientId={patient.id}
                                onDone={() => setShowAddAllergy(false)}
                                onSuccess={(msg) => showToast(msg)}
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        ) : (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <button
                                    onClick={() => setShowAddAllergy(true)}
                                    className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                                >
                                    + Add Allergy
                                </button>
                            </div>
                        )}
                        {allergies.length === 0 ? (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-10)',
                                    textAlign: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: 'var(--wc-text-muted)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    No allergies on record. Add any known
                                    allergies above.
                                </p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                {allergies.map((a) => {
                                    const cfg = SEVERITY_CONFIG[a.severity];

                                    return (
                                        <div
                                            key={a.id}
                                            className="wc-card"
                                            style={{
                                                padding:
                                                    'var(--space-4) var(--space-5)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-4)',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        padding: '4px 14px',
                                                        borderRadius: '100px',
                                                        background: cfg.bg,
                                                        color: cfg.color,
                                                        fontSize:
                                                            'var(--text-xs)',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {cfg.label}
                                                </span>
                                                <div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize:
                                                                'var(--text-sm)',
                                                            fontWeight: 700,
                                                            color: 'var(--wc-text-primary)',
                                                        }}
                                                    >
                                                        {a.allergen}
                                                    </p>
                                                    {a.reaction && (
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    'var(--text-xs)',
                                                                color: 'var(--wc-text-muted)',
                                                            }}
                                                        >
                                                            Reaction:{' '}
                                                            {a.reaction}
                                                        </p>
                                                    )}
                                                    {a.notes && (
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    'var(--text-xs)',
                                                                color: 'var(--wc-text-muted)',
                                                            }}
                                                        >
                                                            {a.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    deleteAllergy(a.id)
                                                }
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--wc-text-error)',
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── DIAGNOSES ── */}
                {tab === 'diagnoses' && (
                    <div>
                        {showAddDiagnosis ? (
                            <AddDiagnosisForm
                                patientId={patient.id}
                                onDone={() => setShowAddDiagnosis(false)}
                                onSuccess={(msg) => showToast(msg)}
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        ) : (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <button
                                    onClick={() => setShowAddDiagnosis(true)}
                                    className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                                >
                                    + Add Diagnosis
                                </button>
                            </div>
                        )}
                        {diagnoses.length === 0 ? (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-10)',
                                    textAlign: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: 'var(--wc-text-muted)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    No diagnoses on record.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="wc-card"
                                style={{ overflow: 'hidden' }}
                            >
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            {[
                                                'Diagnosis',
                                                'ICD',
                                                'Type',
                                                'Status',
                                                'Date',
                                                '',
                                            ].map((col) => (
                                                <th
                                                    key={col}
                                                    style={{
                                                        padding:
                                                            '10px var(--space-5)',
                                                        textAlign: 'left',
                                                        fontSize:
                                                            'var(--text-xs)',
                                                        fontWeight: 700,
                                                        color: 'var(--wc-text-muted)',
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing: '0.07em',
                                                        borderBottom:
                                                            '1px solid var(--wc-gray-100)',
                                                    }}
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diagnoses.map((d) => {
                                            const cfg =
                                                DIAGNOSIS_STATUS_CONFIG[
                                                    d.status
                                                ];

                                            return (
                                                <tr
                                                    key={d.id}
                                                    style={{
                                                        borderBottom:
                                                            '1px solid var(--wc-gray-100)',
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                            fontSize:
                                                                'var(--text-sm)',
                                                            fontWeight: 600,
                                                            color: 'var(--wc-text-primary)',
                                                        }}
                                                    >
                                                        {d.diagnosis}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                            fontSize:
                                                                'var(--text-xs)',
                                                            color: 'var(--wc-text-muted)',
                                                            fontFamily:
                                                                'monospace',
                                                        }}
                                                    >
                                                        {d.icdCode || '—'}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                            fontSize:
                                                                'var(--text-xs)',
                                                            color: 'var(--wc-text-muted)',
                                                            textTransform:
                                                                'capitalize',
                                                        }}
                                                    >
                                                        {d.type}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                padding:
                                                                    '3px 10px',
                                                                borderRadius:
                                                                    '100px',
                                                                background:
                                                                    cfg.bg,
                                                                color: cfg.color,
                                                                fontSize:
                                                                    'var(--text-xs)',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                            fontSize:
                                                                'var(--text-xs)',
                                                            color: 'var(--wc-text-muted)',
                                                        }}
                                                    >
                                                        {d.diagnosedAt}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                'var(--space-4) var(--space-5)',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        {d.status !==
                                                            'resolved' && (
                                                            <button
                                                                onClick={() =>
                                                                    markDiagnosisResolved(
                                                                        d.id,
                                                                    )
                                                                }
                                                                style={{
                                                                    background:
                                                                        'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontSize:
                                                                        'var(--text-xs)',
                                                                    fontWeight: 700,
                                                                    color: '#16a34a',
                                                                    marginRight:
                                                                        'var(--space-3)',
                                                                }}
                                                            >
                                                                Mark Resolved
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                deleteDiagnosis(
                                                                    d.id,
                                                                )
                                                            }
                                                            style={{
                                                                background:
                                                                    'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize:
                                                                    'var(--text-xs)',
                                                                fontWeight: 700,
                                                                color: 'var(--wc-text-error)',
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── VISIT HISTORY ── */}
                {tab === 'visits' && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-4)',
                        }}
                    >
                        {visits.length === 0 ? (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-10)',
                                    textAlign: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: 'var(--wc-text-muted)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    No completed visits on record.
                                </p>
                            </div>
                        ) : (
                            visits.map((v) => (
                                <div
                                    key={v.id}
                                    className="wc-card"
                                    style={{ padding: 'var(--space-5)' }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        <div>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-text-primary)',
                                                }}
                                            >
                                                {v.service}
                                            </p>
                                            <p
                                                style={{
                                                    margin: '2px 0 0',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-text-muted)',
                                                }}
                                            >
                                                {v.date}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                padding: '3px 12px',
                                                borderRadius: '100px',
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Completed
                                        </span>
                                    </div>
                                    {v.soap?.assessment?.trim() && (
                                        <div
                                            style={{
                                                padding:
                                                    'var(--space-3) var(--space-4)',
                                                borderRadius: '10px',
                                                background: 'var(--wc-gray-50)',
                                                marginBottom: 'var(--space-3)',
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: '0 0 4px',
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-text-muted)',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                Assessment
                                            </p>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--wc-text-secondary)',
                                                }}
                                            >
                                                {v.soap.assessment}
                                            </p>
                                        </div>
                                    )}
                                    {v.prescriptions.length > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 'var(--space-2)',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            {v.prescriptions.map((rx, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '8px',
                                                        background:
                                                            'var(--wc-blue-50)',
                                                        color: 'var(--wc-blue-700)',
                                                        fontSize:
                                                            'var(--text-xs)',
                                                        fontWeight: 600,
                                                        border: '1px solid var(--wc-blue-100)',
                                                    }}
                                                >
                                                    {rx.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── DOCUMENTS ── */}
                {tab === 'documents' && (
                    <div>
                        <div style={{ marginBottom: 'var(--space-5)' }}>
                            <p
                                style={{
                                    margin: '0 0 var(--space-4)',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                Upload lab results, imaging, referral letters,
                                or any other medical documents.
                            </p>
                            <DocumentUploadForm
                                patientId={patient.id}
                                onSuccess={(msg) => showToast(msg)}
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        </div>

                        {documents.length === 0 ? (
                            <div
                                className="wc-card"
                                style={{
                                    padding: 'var(--space-10)',
                                    textAlign: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: 'var(--wc-text-muted)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    No documents uploaded yet.
                                </p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="wc-card"
                                        style={{
                                            padding:
                                                'var(--space-4) var(--space-5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-4)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '10px',
                                                background: 'var(--wc-blue-50)',
                                                border: '1px solid var(--wc-blue-100)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="var(--wc-blue-600)"
                                                strokeWidth="2"
                                            >
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {doc.title}
                                            </p>
                                            <p
                                                style={{
                                                    margin: '2px 0 0',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-text-muted)',
                                                }}
                                            >
                                                {DOC_TYPE_LABEL[doc.type]} ·{' '}
                                                {doc.size} · {doc.uploadedAt}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 'var(--space-2)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <a
                                                href={doc.downloadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                                            >
                                                Download
                                            </a>
                                            <button
                                                onClick={() =>
                                                    deleteDocument(doc.id)
                                                }
                                                className="wc-btn wc-btn-danger wc-btn-sm wc-btn-pill"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Local toast — shown for all record management actions ── */}
                {toast && <LocalToast toast={toast} onDismiss={dismissToast} />}
            </DashboardLayout>
        </>
    );
}
