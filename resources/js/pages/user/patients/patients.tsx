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
    const archive = (patient: PatientOption) => {
        if (!window.confirm(patientsMeta.archive.confirm)) {
            return;
        }

        router.delete(destroy(patient.id).url, { preserveScroll: true });
    };

    return (
        <PatientDashboardLayout activeId="my-patients">
            <header
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: 'var(--wc-gray-900)',
                            margin: 0,
                            fontFamily:
                                'var(--font-display, "Bricolage Grotesque")',
                        }}
                    >
                        {patientsMeta.title}
                    </h1>
                    <p
                        style={{
                            margin: '6px 0 0',
                            fontSize: 14,
                            color: 'var(--wc-gray-500)',
                            maxWidth: 640,
                        }}
                    >
                        {patientsMeta.subtitle}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAdd}
                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                    style={{
                        display: 'inline-flex',
                        gap: 8,
                        flexShrink: 0,
                        alignItems: 'center',
                    }}
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
                style={{ color: 'var(--wc-gray-400)' }}
            />
            <h2
                style={{
                    margin: 'var(--space-4) 0 0',
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'var(--wc-gray-900)',
                }}
            >
                {patientsMeta.empty.title}
            </h2>
            <p
                style={{
                    margin: '6px auto 0',
                    fontSize: 14,
                    color: 'var(--wc-gray-500)',
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
