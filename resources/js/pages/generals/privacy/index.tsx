// resources/js/pages/user/PrivacyPage.tsx

import { Head } from "@inertiajs/react";
import WellcareLayout from "@/layouts/app-gen-layout";
import PrivacyHeroSection   from "@/pages/generals/privacy/sections/privacy-hero";
import PrivacyContentSection from "@/pages/generals/privacy/sections/privacy-content";


export default function PrivacyPage() {
    return (
        <WellcareLayout>
            <Head title="Privacy Policy — Wellcare Clinics" />
            <PrivacyHeroSection />
            <PrivacyContentSection />
        </WellcareLayout>
    );
}