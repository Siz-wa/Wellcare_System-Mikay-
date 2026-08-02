// resources/js/pages/user/DoctorsPage.tsx
import CTASection from '@/design-system/components/CTA/CTA';
import WellcareLayout from '@/layouts/app-gen-layout';
import type { DoctorSummary } from '@/lib/specialties';
import DoctorsGridSection from '@/pages/generals/doctors/sections/doctors-grid';
import DoctorsHeroSection from '@/pages/generals/doctors/sections/doctors-hero';
import WhyOurDoctorsSection from '@/pages/generals/doctors/sections/doctors-why';

interface DoctorsPageProps {
    doctors: DoctorSummary[];
}

export default function DoctorsPage({ doctors }: DoctorsPageProps) {
    return (
        <WellcareLayout activeNav="Doctors">
            <DoctorsHeroSection />
            <WhyOurDoctorsSection />
            <DoctorsGridSection doctors={doctors} />
            <CTASection />
        </WellcareLayout>
    );
}
