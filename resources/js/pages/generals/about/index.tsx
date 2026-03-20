// resources/js/pages/user/AboutPage.tsx
import WellcareLayout        from "@/layouts/app-gen-layout";
import AboutHeroSection      from "@/pages/generals/about/sections/about-hero";
import MissionSection        from "@/pages/generals/about/sections/about-mission";
import TimelineSection       from "@/pages/generals/about/sections/about-timeline";
import TeamSection           from "@/pages/generals/about/sections/about-team";
import AccreditationsSection from "@/pages/generals/about/sections/about-accredition";
import AboutCTASection       from "@/pages/generals/about/sections/about-cta";

export default function AboutPage() {
  return (
    <WellcareLayout activeNav="About Us">
      <AboutHeroSection />
      <MissionSection />
      <TimelineSection />
      <TeamSection />
      <AccreditationsSection />
      <AboutCTASection />
    </WellcareLayout>
  );
}