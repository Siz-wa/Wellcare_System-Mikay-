// resources/js/pages/user/DoctorsPage.tsx
import WellcareLayout        from "@/layouts/app-gen-layout";
import DoctorsHeroSection    from "@/pages/generals/doctors/sections/doctors-hero";
import DoctorsGridSection    from "@/pages/generals/doctors/sections/doctors-grid";
import WhyOurDoctorsSection  from "@/pages/generals/doctors/sections/doctors-why";
import DoctorsCtaSection     from "@/pages/generals/doctors/sections/doctors-cta";

export default function DoctorsPage() {
  return (
    <WellcareLayout activeNav="Doctors">
      <DoctorsHeroSection />
      <DoctorsGridSection />
      <WhyOurDoctorsSection />
      <DoctorsCtaSection />
    </WellcareLayout>
  );
}