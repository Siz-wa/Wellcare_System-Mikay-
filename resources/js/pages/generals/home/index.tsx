// resources/js/pages/user/HomePage.tsx
import CTASection from '@/design-system/components/CTA/CTA';
import WellcareLayout from '@/layouts/app-gen-layout';
import DoctorsSection from '@/pages/generals/home/sections/doctors-section';
import HeroSection from '@/pages/generals/home/sections/hero-section';
import ServicesSection from '@/pages/generals/home/sections/service-section';
import StatsSection from '@/pages/generals/home/sections/stats-section';
import TestimonialsSection from '@/pages/generals/home/sections/testimonials-section';
import WhyUsSection from '@/pages/generals/home/sections/why-us-section';

export default function HomePage() {
    return (
        <WellcareLayout activeNav="Home">
            <HeroSection />
            <StatsSection />
            <ServicesSection />
            <WhyUsSection />
            <DoctorsSection />
            <TestimonialsSection />
            <CTASection />
        </WellcareLayout>
    );
}
