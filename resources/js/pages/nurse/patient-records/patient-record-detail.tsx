// resources/js/pages/nurse/patient-records/patient-record-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Nurse patient-record detail — thin composer.
//
// Writable here: demographics, allergies, documents.
// Read-only here: diagnoses, vitals, visit history.
// The split is enforced server-side by the routes, not by this file — see
// Nurse\PatientRecordController.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import type {
    Allergy,
    Diagnosis,
    PatientDocument,
    PatientProfile,
    PatientSummary,
    Visit,
    Vitals,
} from './patient-records-data';
import { nursePatientRecordsMeta } from './patient-records-data';
import { AllergiesSection } from './sections/allergies-section';
import { DiagnosesSection } from './sections/diagnoses-section';
import { DocumentsSection } from './sections/documents-section';
import { ProfileSection } from './sections/profile-section';
import { VisitsSection } from './sections/visits-section';
import { VitalsSection } from './sections/vitals-section';

interface PageData extends PageProps {
    patient: PatientSummary;
    profile: PatientProfile;
    allergies: Allergy[];
    diagnoses: Diagnosis[];
    documents: PatientDocument[];
    visits: Visit[];
    latestVitals: Vitals | null;
}

export default function NursePatientRecordDetailPage({
    patient,
    profile,
    allergies,
    diagnoses,
    documents,
    visits,
    latestVitals,
}: PageData): ReactElement {
    const meta = nursePatientRecordsMeta;

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            <Link
                href="/nurse/patient-records"
                style={{
                    display: 'inline-block',
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--wc-blue-600)',
                    textDecoration: 'none',
                }}
            >
                {meta.backLabel}
            </Link>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <span
                    style={{
                        width: 52,
                        height: 52,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#eff6ff',
                        color: 'var(--wc-blue-600)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                    }}
                >
                    {patient.initials}
                </span>
                <div style={{ minWidth: 0 }}>
                    <h1
                        style={{
                            margin: '0 0 2px',
                            fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                            color: 'var(--wc-dark)',
                            fontFamily:
                                "var(--font-display,'Bricolage Grotesque')",
                        }}
                    >
                        {patient.name}
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {patient.patientId} · {patient.appointmentCount} visits
                    </p>
                </div>
            </div>

            <ProfileSection patientId={patient.id} profile={profile} />
            <VitalsSection vitals={latestVitals} />
            <AllergiesSection patientId={patient.id} allergies={allergies} />
            <DiagnosesSection diagnoses={diagnoses} />
            <DocumentsSection patientId={patient.id} documents={documents} />
            <VisitsSection visits={visits} />
        </NurseDashboardLayout>
    );
}
