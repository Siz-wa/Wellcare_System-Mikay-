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
    Allergy,
    Diagnosis,
    PatientCard,
    Profile,
    RecordDocument,
    Visit,
} from './records-data';
import { recordsMeta } from './records-data';
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
}

export default function RecordDetailPage({
    patient,
    profile,
    allergies,
    diagnoses,
    documents,
    visits,
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
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--wc-gray-600)',
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
                        fontSize: 18,
                        flexShrink: 0,
                    }}
                >
                    {patient.initials}
                </span>
                <div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 24,
                            fontWeight: 700,
                            color: 'var(--wc-gray-900)',
                            fontFamily:
                                'var(--font-display, "Bricolage Grotesque")',
                        }}
                    >
                        {patient.name}
                    </h1>
                    {patient.clinicId && (
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 13,
                                color: 'var(--wc-gray-500)',
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
                    fontSize: 13,
                    color: 'var(--wc-gray-600)',
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
                <DocumentsSection documents={documents} />
            </div>
        </PatientDashboardLayout>
    );
}
