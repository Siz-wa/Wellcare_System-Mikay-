// resources/js/pages/user/HomePage.tsx
import WellcareLayout from "@/layouts/app-gen-layout";
import HeroSection        from "@/pages/generals/home/sections/hero-section";
import StatsSection       from "@/pages/generals/home/sections/stats-section";
import ServicesSection    from "@/pages/generals/home/sections/service-section";
import WhyUsSection       from "@/pages/generals/home/sections/why-us-section";
import DoctorsSection     from "@/pages/generals/home/sections/doctors-section";
import TestimonialsSection from "@/pages/generals/home/sections/testimonials-section";
import CTASection         from "@/pages/generals/home/sections/CTA-sections";


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