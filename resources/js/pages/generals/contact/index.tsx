// resources/js/pages/user/ContactPage.tsx
import WellcareLayout from '@/layouts/app-gen-layout';
import ContactFormSection from '@/pages/generals/contact/sections/contact-form';
import ContactHeroSection from '@/pages/generals/contact/sections/contact-hero';
import ContactInfoSection from '@/pages/generals/contact/sections/contact-info';

export default function ContactPage() {
    return (
        <WellcareLayout activeNav="Contact">
            <ContactHeroSection />
            <ContactInfoSection />
            <ContactFormSection />
        </WellcareLayout>
    );
}
