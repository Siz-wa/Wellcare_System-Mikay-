// resources/js/pages/generals/faqs/index.tsx
import WellcareLayout      from "@/layouts/app-gen-layout";
import FaqsHeroSection     from "@/pages/generals/faq/sections/faq-hero";
import FaqsAccordionSection from "@/pages/generals/faq/sections/faq-accordion";
import FaqsCtaSection      from "@/pages/generals/faq/sections/faq-cta";

export default function FaqsPage() {
  return (
    <WellcareLayout>
      <FaqsHeroSection />
      <FaqsAccordionSection />
      <FaqsCtaSection />
    </WellcareLayout>
  );
}