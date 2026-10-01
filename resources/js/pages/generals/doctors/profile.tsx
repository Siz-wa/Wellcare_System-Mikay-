// resources/js/pages/generals/doctors/profile.tsx
// Composition only — the section carries the markup, doctors-data.ts the copy.

import { Head } from '@inertiajs/react';
import type { ReactElement } from 'react';
import CTASection from '@/design-system/components/CTA/CTA';
import WellcareLayout from '@/layouts/app-gen-layout';
import type { DoctorSummary } from '@/lib/specialties';
import DoctorProfileSection from '@/pages/generals/doctors/sections/doctor-profile';

interface DoctorProfilePageProps {
    doctor: DoctorSummary;
}

/**
 * One doctor's public page.
 *
 * Public and unauthenticated, because a patient choosing a doctor has not
 * signed in yet — and because the DOH Patient's Bill of Rights expects a
 * patient to know who is treating them and on what credentials. Only published
 * doctors reach this page at all; GenController::doctor 404s the rest.
 */
export default function DoctorProfilePage({
    doctor,
}: DoctorProfilePageProps): ReactElement {
    return (
        <WellcareLayout activeNav="Doctors">
            <Head title={doctor.name} />
            <DoctorProfileSection doctor={doctor} />
            <CTASection />
        </WellcareLayout>
    );
}
