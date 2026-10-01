// resources/js/pages/admin/staff/components/credential-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The credentialing file an administrator records against a clinical account.
//
// Grouped the way the documents actually arrive: PRC first (the one that makes
// practice lawful at all), then PTR, then the specialty board certificate that
// backs a specialist claim, then the optional registrations.
//
// Every field can be saved empty. Credentialing is a process — the PRC number
// is typed on day one and the PTR weeks later when it is produced — so the
// rules that gate practice are enforced at verification, not here.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import {
    Button,
    DateField,
    Field,
    Input,
    Select,
    Textarea,
} from '@/design-system';
import { sanitizePrcLicense } from '@/lib/input-masks';
import { staffCopy } from '@/pages/admin/staff/staff-data';
import type {
    CredentialFile,
    SelectOption,
} from '@/pages/admin/staff/staff-data';

interface CredentialFormProps {
    staffId: number;
    credential: CredentialFile | null;
    boardStatuses: SelectOption[];
}

export function CredentialForm({
    staffId,
    credential,
    boardStatuses,
}: CredentialFormProps): ReactElement {
    const { data, setData, put, processing, errors } = useForm({
        prcLicenseNo: credential?.prcLicenseNo ?? '',
        prcExpiresOn: credential?.prcExpiresOn ?? '',
        ptrNo: credential?.ptrNo ?? '',
        ptrIssuedAtLgu: credential?.ptrIssuedAtLgu ?? '',
        ptrExpiresOn: credential?.ptrExpiresOn ?? '',
        specialtyBoard: credential?.specialtyBoard ?? '',
        boardStatus: credential?.boardStatus ?? 'none',
        philhealthAccreditationNo: credential?.philhealthAccreditationNo ?? '',
        s2LicenseNo: credential?.s2LicenseNo ?? '',
        medicalCertificateOn: credential?.medicalCertificateOn ?? '',
        remarks: credential?.remarks ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(`/admin/staff/${staffId}/credentials`, { preserveScroll: true });
    };

    return (
        <form
            onSubmit={submit}
            style={{ display: 'grid', gap: 'var(--space-5)' }}
        >
            {/* ── PRC ─────────────────────────────────────────────────────── */}
            <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>
                    PRC registration — Professional Regulation Commission
                </legend>
                <p style={noteStyle}>{staffCopy.prcNote}</p>

                <div style={gridStyle}>
                    <Field
                        label="PRC licence number"
                        hint="Seven digits."
                        error={errors.prcLicenseNo}
                    >
                        <Input
                            value={data.prcLicenseNo}
                            onChange={(e) =>
                                setData(
                                    'prcLicenseNo',
                                    sanitizePrcLicense(e.target.value),
                                )
                            }
                            inputMode="numeric"
                            placeholder="e.g. 0123456"
                        />
                    </Field>

                    <Field
                        label="Expires on"
                        hint="Three years from registration, on the holder’s birthday."
                        error={errors.prcExpiresOn}
                    >
                        <DateField
                            kind="date"
                            value={data.prcExpiresOn}
                            onChange={(e) =>
                                setData('prcExpiresOn', e.target.value)
                            }
                        />
                    </Field>
                </div>
            </fieldset>

            {/* ── PTR ─────────────────────────────────────────────────────── */}
            <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>
                    PTR — Professional Tax Receipt
                </legend>
                <p style={noteStyle}>{staffCopy.ptrNote}</p>

                <div style={gridStyle}>
                    <Field label="PTR number" error={errors.ptrNo}>
                        <Input
                            value={data.ptrNo}
                            onChange={(e) => setData('ptrNo', e.target.value)}
                            placeholder="e.g. PTR-2026-0001"
                        />
                    </Field>

                    <Field
                        label="Issued by (LGU)"
                        error={errors.ptrIssuedAtLgu}
                    >
                        <Input
                            value={data.ptrIssuedAtLgu}
                            onChange={(e) =>
                                setData('ptrIssuedAtLgu', e.target.value)
                            }
                            placeholder="e.g. Dasmariñas City"
                        />
                    </Field>

                    <Field label="Expires on" error={errors.ptrExpiresOn}>
                        <DateField
                            kind="date"
                            value={data.ptrExpiresOn}
                            onChange={(e) =>
                                setData('ptrExpiresOn', e.target.value)
                            }
                        />
                    </Field>
                </div>
            </fieldset>

            {/* ── Specialty board ─────────────────────────────────────────── */}
            <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>Specialty board certificate</legend>
                <p style={noteStyle}>{staffCopy.boardNote}</p>

                <div style={gridStyle}>
                    <Field label="Standing" error={errors.boardStatus}>
                        <Select
                            value={data.boardStatus}
                            onChange={(value) => setData('boardStatus', value)}
                            options={boardStatuses}
                        />
                    </Field>

                    <Field
                        label="Issuing board"
                        hint="Required once a Diplomate or Fellow rank is recorded."
                        error={errors.specialtyBoard}
                    >
                        <Input
                            value={data.specialtyBoard}
                            onChange={(e) =>
                                setData('specialtyBoard', e.target.value)
                            }
                            placeholder="e.g. Philippine Pediatric Society"
                        />
                    </Field>
                </div>
            </fieldset>

            {/* ── Other registrations ─────────────────────────────────────── */}
            <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>Other registrations</legend>
                <p style={noteStyle}>{staffCopy.medCertNote}</p>

                <div style={gridStyle}>
                    <Field
                        label="PhilHealth accreditation number"
                        hint="Needed to file claims."
                        error={errors.philhealthAccreditationNo}
                    >
                        <Input
                            value={data.philhealthAccreditationNo}
                            onChange={(e) =>
                                setData(
                                    'philhealthAccreditationNo',
                                    e.target.value,
                                )
                            }
                        />
                    </Field>

                    <Field
                        label="S2 licence number"
                        hint="Only for prescribers of dangerous drugs."
                        error={errors.s2LicenseNo}
                    >
                        <Input
                            value={data.s2LicenseNo}
                            onChange={(e) =>
                                setData('s2LicenseNo', e.target.value)
                            }
                        />
                    </Field>

                    <Field
                        label="Annual medical certificate dated"
                        error={errors.medicalCertificateOn}
                    >
                        <DateField
                            kind="date"
                            value={data.medicalCertificateOn}
                            onChange={(e) =>
                                setData('medicalCertificateOn', e.target.value)
                            }
                        />
                    </Field>
                </div>
            </fieldset>

            <Field label="Notes" error={errors.remarks}>
                <Textarea
                    value={data.remarks}
                    onChange={(e) => setData('remarks', e.target.value)}
                    rows={2}
                    placeholder="Anything the record should show about these documents."
                />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" loading={processing}>
                    {staffCopy.saveFile}
                </Button>
            </div>
        </form>
    );
}

const fieldsetStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 'var(--space-4)',
    margin: 0,
} as const;

const legendStyle = {
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--wc-text-secondary)',
    padding: '0 6px',
} as const;

const noteStyle = {
    fontSize: 'var(--text-xs)',
    color: 'var(--wc-text-muted)',
    margin: '0 0 var(--space-3)',
    lineHeight: 1.5,
} as const;

const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
} as const;
