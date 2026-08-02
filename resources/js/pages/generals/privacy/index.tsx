// resources/js/pages/user/PrivacyPage.tsx

import { Head } from '@inertiajs/react';
import WellcareLayout from '@/layouts/app-gen-layout';
import PrivacyContentSection from '@/pages/generals/privacy/sections/privacy-content';
import PrivacyHeroSection from '@/pages/generals/privacy/sections/privacy-hero';

export default function PrivacyPage() {
    return (
        <WellcareLayout>
            <Head title="Privacy Policy — Wellcare Clinics" />
            <PrivacyHeroSection />
            <PrivacyContentSection />
        </WellcareLayout>
    );
}
