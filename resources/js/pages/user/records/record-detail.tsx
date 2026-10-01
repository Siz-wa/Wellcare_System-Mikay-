// resources/js/pages/user/records/record-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One patient's full record, read-only. Composition only — every section is
// its own file and all copy lives in records-data.ts.

import { Link } from '@inertiajs/react';
import { ArrowLeft, Info } from 'lucide-react';
import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import type {
    AccessLogEntry,
    Allergy,
    Diagnosis,
    PatientCard,
    Profile,
    RecordDocument,
    Visit,
} from './records-data';
import { recordsMeta } from './records-data';
import { AccessLogSection } from './sections/access-log-section';
import { AllergiesSection } from './sections/allergies-section';
import { DiagnosesSection } from './sections/diagnoses-section';
import { DocumentsSection } from './sections/documents-section';
import { ProfileSection } from './sections/profile-section';
import { VisitsSection } from './sections/visits-section';

interface PageData extends PageProps {
    patient: PatientCard;
    profile: Profile;
    allergies: Allergy[];
    diagnoses: Diagnosis[];
    documents: RecordDocument[];
    visits: Visit[];
    accessLog: AccessLogEntry[];
}

export default function RecordDetailPage({
    patient,
    profile,
    allergies,
    diagnoses,
    documents,
    visits,
    accessLog,
}: PageData): ReactElement {
    return (
        <PatientDashboardLayout activeId="records">
            <Link
                href="/user/records"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 'var(--space-5)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--wc-text-secondary)',
                    textDecoration: 'none',
                }}
            >
                <ArrowLeft size={15} strokeWidth={1.8} />
                {recordsMeta.detailBackLabel}
            </Link>

            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-5)',
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'var(--wc-blue-50, #eff6ff)',
                        color: 'var(--wc-blue-600)',
                        fontWeight: 700,
                        fontSize: 'var(--text-lg)',
                        flexShrink: 0,
                    }}
                >
                    {patient.initials}
                </span>
                <div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {patient.name}
                    </h1>
                    {patient.clinicId && (
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {recordsMeta.labels.clinicId} {patient.clinicId}
                        </p>
                    )}
                </div>
            </header>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 'var(--space-3) var(--space-4)',
                    marginBottom: 'var(--space-5)',
                    borderRadius: 10,
                    background: 'var(--wc-gray-50)',
                    border: '1px solid var(--wc-gray-200)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-secondary)',
                }}
            >
                <Info
                    size={15}
                    strokeWidth={1.8}
                    style={{ flexShrink: 0, marginTop: 2 }}
                />
                <span>{recordsMeta.readOnlyNotice}</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                }}
            >
                <AllergiesSection allergies={allergies} />
                <ProfileSection profile={profile} />
                <DiagnosesSection diagnoses={diagnoses} />
                <VisitsSection visits={visits} />

                <AccessLogSection entries={accessLog} />
                <DocumentsSection documents={documents} />
            </div>
        </PatientDashboardLayout>
    );
}
