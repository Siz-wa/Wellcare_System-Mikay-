// resources/js/pages/user/ServicesPage.tsx
import CTAsection from '@/design-system/components/CTA/CTA';
import WellcareLayout from '@/layouts/app-gen-layout';
import ServicesGridSection from '@/pages/generals/services/sections/service-grid';
import ServicesHeroSection from '@/pages/generals/services/sections/service-hero';
import ProcessSection from '@/pages/generals/services/sections/service-process';

export default function ServicesPage() {
    return (
        <WellcareLayout activeNav="Services">
            <ServicesHeroSection />
            <ServicesGridSection />
            <ProcessSection />
            <CTAsection />
        </WellcareLayout>
    );
}
