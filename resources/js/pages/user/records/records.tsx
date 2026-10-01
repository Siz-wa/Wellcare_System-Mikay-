// resources/js/pages/user/records/records.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "View Medical Records" (Fig. 4 / Fig. 11) — index. Composition only.
// One card per patient the signed-in account guarantees.

import { Link } from '@inertiajs/react';
import { FolderOpen } from 'lucide-react';
import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import { PatientCard } from './components/patient-card';
import type { PatientCard as PatientCardData } from './records-data';
import { recordsMeta } from './records-data';

interface PageData extends PageProps {
    patients: PatientCardData[];
}

export default function RecordsPage({ patients }: PageData): ReactElement {
    return (
        <PatientDashboardLayout activeId="records">
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {recordsMeta.indexTitle}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                        maxWidth: 640,
                    }}
                >
                    {recordsMeta.indexSubtitle}
                </p>
            </header>

            {patients.length === 0 ? (
                <EmptyRecords />
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
                        <PatientCard key={patient.id} patient={patient} />
                    ))}
                </div>
            )}
        </PatientDashboardLayout>
    );
}

function EmptyRecords(): ReactElement {
    const { emptyPatients } = recordsMeta;

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
            <FolderOpen
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
                {emptyPatients.title}
            </h2>
            <p
                style={{
                    margin: '6px auto 0',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-muted)',
                    maxWidth: 420,
                }}
            >
                {emptyPatients.body}
            </p>
            <Link
                href={emptyPatients.ctaHref}
                style={{
                    display: 'inline-block',
                    marginTop: 'var(--space-5)',
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: 'var(--wc-blue-600)',
                    color: '#fff',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    textDecoration: 'none',
                }}
            >
                {emptyPatients.cta}
            </Link>
        </div>
    );
}
