// resources/js/pages/user/ContactPage.tsx
import WellcareLayout       from "@/layouts/app-gen-layout";
import ContactHeroSection   from "@/pages/generals/contact/sections/contact-hero";
import ContactInfoSection   from "@/pages/generals/contact/sections/contact-info";
import ContactFormSection   from "@/pages/generals/contact/sections/contact-form";


export default function ContactPage() {
  return (
    <WellcareLayout activeNav="Contact">
      <ContactHeroSection />
      <ContactInfoSection />
      <ContactFormSection />
   
    </WellcareLayout>
  );
}