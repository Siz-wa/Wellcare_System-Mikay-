// resources/js/pages/user/DoctorsPage.tsx
import WellcareLayout        from "@/layouts/app-gen-layout";
import DoctorsHeroSection    from "@/pages/generals/doctors/sections/doctors-hero";
import DoctorsGridSection    from "@/pages/generals/doctors/sections/doctors-grid";
import WhyOurDoctorsSection  from "@/pages/generals/doctors/sections/doctors-why";
import CTASection from "@/design-system/components/CTA/CTA";


export default function DoctorsPage() {
  return (
    <WellcareLayout activeNav="Doctors">
      <DoctorsHeroSection />
      <WhyOurDoctorsSection />
      <DoctorsGridSection />
      <CTASection />
    </WellcareLayout>
  );
}