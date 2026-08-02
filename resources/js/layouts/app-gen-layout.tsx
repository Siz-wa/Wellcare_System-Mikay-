// resources/js/layouts/WellcareLayout.tsx
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Footer from '@/design-system/components/footer';
import Navbar from '@/design-system/components/navbar';
import type {NavLabel} from '@/design-system/components/navbar';

// ─── Props ────────────────────────────────────────────────────────────────────
interface WellcareLayoutProps {
    children: ReactNode;
    /** Must match one of the nav link labels defined in Navbar.tsx */
    activeNav?: NavLabel;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function WellcareLayout({
    children,
    activeNav,
}: WellcareLayoutProps) {
    return (
        <>
            {/* .wc-page → min-height: 100vh, flex-col, padding-top: var(--header-height) */}
            <div className="wc-page">
                <Navbar active={activeNav} />

                {/* .wc-page__content → flex: 1 so footer always sticks to bottom */}
                <main className="wc-page__content">{children}</main>

                <Footer />
            </div>
        </>
    );
}
