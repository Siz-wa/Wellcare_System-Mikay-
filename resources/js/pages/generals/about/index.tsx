// resources/js/pages/user/AboutPage.tsx
import CTAsection from '@/design-system/components/CTA/CTA';
import WellcareLayout from '@/layouts/app-gen-layout';
import AccreditationsSection from '@/pages/generals/about/sections/about-accredition';
import AboutHeroSection from '@/pages/generals/about/sections/about-hero';
import MissionSection from '@/pages/generals/about/sections/about-mission';
import TeamSection from '@/pages/generals/about/sections/about-team';
import TimelineSection from '@/pages/generals/about/sections/about-timeline';

export default function AboutPage() {
    return (
        <WellcareLayout activeNav="About Us">
            <AboutHeroSection />
            <MissionSection />
            <TimelineSection />
            <TeamSection />
            <AccreditationsSection />
            <CTAsection />
        </WellcareLayout>
    );
}
