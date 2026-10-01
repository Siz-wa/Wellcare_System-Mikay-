// resources/js/pages/user/patients/patients.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "My Patients" — the guarantor's roster. Composition only.
//
// The account is a guarantor account: one login books for several people. This
// is where those people are created and kept up to date, so the booking form
// never has to ask for a name again.

import { router } from '@inertiajs/react';
import { UserPlus, Users } from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { ConfirmDialog } from '@/design-system';
import type { PatientOption } from '@/pages/user/book-appointment/sections/bookingdata';
import PatientFormSheet from '@/pages/user/book-appointment/sections/patient-form-sheet';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import { destroy } from '@/routes/user/patients';
import type { PageProps } from '@/types';
import { PatientRosterCard } from './components/patient-roster-card';
import { patientsMeta } from './patients-data';

interface PageData extends PageProps {
    patients: PatientOption[];
}

export default function PatientsPage({ patients }: PageData): ReactElement {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<PatientOption | null>(null);

    const openAdd = () => {
        setEditing(null);
        setSheetOpen(true);
    };

    const openEdit = (patient: PatientOption) => {
        setEditing(patient);
        setSheetOpen(true);
    };

    // Archiving is a soft delete the server refuses while an appointment is
    // still open, so the confirm here is a courtesy rather than the guard.
    // It was a native window.confirm(); now it is the house dialog, so it looks
    // like the rest of the app and does not block the page thread.
    const [archiving, setArchiving] = useState<PatientOption | null>(null);
    const [archiveBusy, setArchiveBusy] = useState(false);

    const archive = (patient: PatientOption) => {
        setArchiving(patient);
    };

    const confirmArchive = () => {
        if (!archiving) {
            return;
        }

        setArchiveBusy(true);

        router.delete(destroy(archiving.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setArchiveBusy(false);
                setArchiving(null);
            },
        });
    };

    return (
        <PatientDashboardLayout activeId="my-patients">
            {/* Wraps on a phone: a 26px title and a pill button do not share
                358px, and `flex-shrink: 0` on the button meant the title lost
                the argument and wrapped to three lines instead. */}
            <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <div>
                    <h1
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                            margin: 0,
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {patientsMeta.title}
                    </h1>
                    <p
                        style={{
                            margin: '6px 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                            maxWidth: 640,
                        }}
                    >
                        {patientsMeta.subtitle}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAdd}
                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto"
                >
                    <UserPlus size={16} /> {patientsMeta.addCta}
                </button>
            </header>

            {patients.length === 0 ? (
                <EmptyPatients onAdd={openAdd} />
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-4)',
                    }}
                >
                    {patients.map((patient) => (
                        <PatientRosterCard
                            key={patient.id}
                            patient={patient}
                            onEdit={() => openEdit(patient)}
                            onArchive={() => archive(patient)}
                        />
                    ))}
                </div>
            )}

            <PatientFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                patient={editing}
            />
            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => !open && setArchiving(null)}
                title={
                    archiving
                        ? `Archive ${archiving.firstName ?? 'this patient'}?`
                        : patientsMeta.archive.title
                }
                description={patientsMeta.archive.confirm}
                confirmLabel={patientsMeta.archive.action}
                cancelLabel={patientsMeta.archive.dismiss}
                processing={archiveBusy}
                onConfirm={confirmArchive}
            />
        </PatientDashboardLayout>
    );
}

function EmptyPatients({ onAdd }: { onAdd: () => void }): ReactElement {
    return (
        <div
            style={{
                background: '#fff',
                border: '1px dashed var(--wc-gray-300)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-10) var(--space-6)',
                textAlign: 'center',
            }}
        >
            <Users
                size={32}
                strokeWidth={1.5}
                style={{ color: 'var(--wc-text-muted)' }}
            />
            <h2
                style={{
                    margin: 'var(--space-4) 0 0',
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    color: 'var(--wc-text-primary)',
                }}
            >
                {patientsMeta.empty.title}
            </h2>
            <p
                style={{
                    margin: '6px auto 0',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-muted)',
                    maxWidth: 420,
                }}
            >
                {patientsMeta.empty.body}
            </p>
            <button
                type="button"
                onClick={onAdd}
                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                style={{ marginTop: 'var(--space-5)' }}
            >
                {patientsMeta.addCta}
            </button>
        </div>
    );
}
