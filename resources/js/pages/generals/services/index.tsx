// resources/js/pages/user/ServicesPage.tsx
import WellcareLayout      from "@/layouts/app-gen-layout";
import ServicesHeroSection from "@/pages/generals/services/sections/service-hero";
import ServicesGridSection from "@/pages/generals/services/sections/service-grid";
import ProcessSection      from "@/pages/generals/services/sections/service-process";
import ServicesCtaSection  from "@/pages/generals/services/sections/service-cta";

export default function ServicesPage() {
  return (
    <WellcareLayout activeNav="Services">
      <ServicesHeroSection />
      <ServicesGridSection />
      <ProcessSection />
      <ServicesCtaSection />
    </WellcareLayout>
  );
}