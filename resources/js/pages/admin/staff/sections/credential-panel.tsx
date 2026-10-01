// resources/js/pages/admin/staff/sections/credential-panel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The decision panel on a staff member's credentialing file: verify, reject,
// suspend, and confer a specialty.
//
// Deliberately separate from the form beside it. Saving documents is clerical;
// verifying them is an authorization decision that publishes someone to
// patients, and the two should not look like the same button.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Field,
    Select,
    Textarea,
} from '@/design-system';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { AdminModal } from '@/pages/admin/components/admin-modal';
import {
    expiryLabel,
    expiryTone,
    staffCopy,
} from '@/pages/admin/staff/staff-data';
import type { SpecialtyOption, StaffRow } from '@/pages/admin/staff/staff-data';

type BadgeVariant =
    | 'primary'
    | 'sky'
    | 'success'
    | 'warning'
    | 'error'
    | 'neutral'
    | 'dark';

interface CredentialPanelProps {
    staff: StaffRow;
    specialties: SpecialtyOption[];
}

export function CredentialPanel({
    staff,
    specialties,
}: CredentialPanelProps): ReactElement {
    const [action, setAction] = useState<'reject' | 'suspend' | null>(null);
    const [remarks, setRemarks] = useState('');
    const [specialty, setSpecialty] = useState(staff.specialty ?? 'general');

    const { confirm, dialog } = useConfirmDialog();

    const verify = async () => {
        if (
            !(await confirm({
                title: 'Verify these credentials?',
                description: staffCopy.verifyConfirm,
                confirmLabel: 'Verify credentials',
                destructive: false,
            }))
        ) {
            return;
        }

        router.post(
            `/admin/staff/${staff.id}/verify`,
            {},
            { preserveScroll: true },
        );
    };

    const submitAction = () => {
        if (!action) {
            return;
        }

        router.post(
            `/admin/staff/${staff.id}/${action}`,
            { remarks },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAction(null);
                    setRemarks('');
                },
            },
        );
    };

    const confer = () => {
        router.post(
            `/admin/staff/${staff.id}/specialty`,
            { specialty },
            { preserveScroll: true },
        );
    };

    const selected = specialties.find((s) => s.value === specialty);

    return (
        <>
            {dialog}
            <>
                <Card>
                    <CardHeader>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>Standing</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <Badge
                                    variant={
                                        staff.credentialTone as BadgeVariant
                                    }
                                >
                                    {staff.credentialLabel}
                                </Badge>
                                <Badge
                                    variant={
                                        staff.isPublished
                                            ? 'success'
                                            : 'neutral'
                                    }
                                    dot
                                >
                                    {staff.isPublished
                                        ? staffCopy.published
                                        : staffCopy.notPublished}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardBody>
                        {staff.hasLapsed && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <Alert variant="error">
                                    {staffCopy.lapsedWarning}. They have been
                                    withdrawn from booking and cannot be
                                    verified again until the licence is renewed.
                                </Alert>
                            </div>
                        )}

                        <dl style={dlStyle}>
                            <Detail
                                label="PRC licence"
                                value={staff.prcLicenseNo ?? '—'}
                            />
                            <Detail
                                label="PRC expiry"
                                value={staff.prcExpiresOn ?? '—'}
                            />
                            <Detail
                                label="Countdown"
                                value={
                                    <Badge
                                        variant={expiryTone(
                                            staff.daysUntilExpiry,
                                            staff.hasLapsed,
                                        )}
                                    >
                                        {expiryLabel(
                                            staff.daysUntilExpiry,
                                            staff.hasLapsed,
                                        )}
                                    </Badge>
                                }
                            />
                            <Detail
                                label="Verified by"
                                value={
                                    staff.verifiedBy
                                        ? `${staff.verifiedBy} · ${staff.verifiedAt ?? ''}`
                                        : 'Not yet verified'
                                }
                            />
                        </dl>

                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginTop: 'var(--space-5)',
                            }}
                        >
                            <Button onClick={verify}>{staffCopy.verify}</Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setAction('reject');
                                    setRemarks('');
                                }}
                            >
                                {staffCopy.reject}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setAction('suspend');
                                    setRemarks('');
                                }}
                            >
                                {staffCopy.suspend}
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* ── Conferring the specialty ────────────────────────────────── */}
                {staff.role === 'doctor' && (
                    <Card>
                        <CardHeader>
                            <span style={{ fontWeight: 700 }}>
                                Practice privilege
                            </span>
                        </CardHeader>
                        <CardBody>
                            <p style={noteStyle}>{staffCopy.boardNote}</p>

                            <Field label="Specialty">
                                <Select
                                    value={specialty}
                                    onChange={(value) => setSpecialty(value)}
                                    options={specialties.map((s) => ({
                                        value: s.value,
                                        label: s.label,
                                    }))}
                                />
                            </Field>

                            {selected?.board && (
                                <p style={noteStyle}>
                                    Requires a Diplomate or Fellow certificate
                                    from the <strong>{selected.board}</strong>.
                                </p>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    marginTop: 'var(--space-4)',
                                }}
                            >
                                <Button variant="secondary" onClick={confer}>
                                    {staffCopy.confer}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                )}

                <AdminModal
                    title={
                        action === 'suspend'
                            ? staffCopy.suspendTitle
                            : staffCopy.rejectTitle
                    }
                    open={action !== null}
                    onClose={() => setAction(null)}
                >
                    <p style={noteStyle}>
                        {action === 'suspend'
                            ? staffCopy.suspendHelp
                            : staffCopy.rejectHelp}
                    </p>

                    <Field label={staffCopy.remarksLabel} required>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                            placeholder={staffCopy.remarksPlaceholder}
                        />
                    </Field>

                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'flex-end',
                            marginTop: 'var(--space-4)',
                        }}
                    >
                        <Button variant="ghost" onClick={() => setAction(null)}>
                            {staffCopy.cancel}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={submitAction}
                            disabled={remarks.trim() === ''}
                        >
                            {action === 'suspend'
                                ? staffCopy.suspend
                                : staffCopy.reject}
                        </Button>
                    </div>
                </AdminModal>
            </>
        </>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}): ReactElement {
    return (
        <div>
            <dt
                style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--wc-text-muted)',
                    marginBottom: 4,
                }}
            >
                {label}
            </dt>
            <dd style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{value}</dd>
        </div>
    );
}

const dlStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-4)',
    margin: 0,
} as const;

const noteStyle = {
    fontSize: 'var(--text-xs)',
    color: 'var(--wc-text-muted)',
    margin: '0 0 var(--space-3)',
    lineHeight: 1.5,
} as const;
