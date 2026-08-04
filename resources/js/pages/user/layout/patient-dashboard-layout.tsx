// resources/js/layouts/app/PatientDashboardLayout.tsx
import { router } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { PatientAppSidebar } from '@/pages/user/layout/components/PatientAppSidebar';
import { patientDashboardMeta } from '@/pages/user/layout/patient-dashboard-data';

interface PatientDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

/**
 * The patient shell.
 *
 * The sidebar collapses to an off-canvas drawer below 768px, and that is not
 * polish — the patient is the party who is always on a phone, and this layout
 * previously rendered a hard `width: 260, flexShrink: 0` sidebar with no media
 * query anywhere. On a 390px handset that left roughly 66px of content width,
 * so the video consultation the patient had joined was a sliver a thumb wide.
 *
 * `useIsMobile()` is SSR-safe (its server snapshot is `false`), so the desktop
 * layout is what renders during `npm run build:ssr`.
 */
export function PatientDashboardLayout({
    activeId,
    children,
}: PatientDashboardLayoutProps): ReactElement {
    const isMobile = useIsMobile();
    const [navOpen, setNavOpen] = useState(false);

    // Close the drawer once a navigation completes, or tapping a nav item
    // leaves it hanging over the page it just opened. Subscribing to the router
    // rather than reacting to `url` in an effect body keeps this out of
    // react-hooks/set-state-in-effect and is the same thing semantically.
    useEffect(() => router.on('navigate', () => setNavOpen(false)), []);

    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--wc-gray-50)',
                fontFamily: "var(--font-sans,'DM Sans')",
            }}
        >
            {!isMobile && <PatientAppSidebar activeId={activeId} />}

            {isMobile && navOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setNavOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 200,
                            border: 'none',
                            background: 'rgba(15,23,42,0.45)',
                        }}
                    />
                    <div
                        style={{
                            position: 'fixed',
                            insetBlock: 0,
                            insetInlineStart: 0,
                            zIndex: 201,
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <PatientAppSidebar activeId={activeId} />
                    </div>
                </>
            )}

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    position: 'relative',
                }}
            >
                <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                    <AppTopbar
                        searchPlaceholder={
                            patientDashboardMeta.searchPlaceholder
                        }
                    />
                </div>

                {isMobile && (
                    <button
                        type="button"
                        aria-label="Open menu"
                        aria-expanded={navOpen}
                        onClick={() => setNavOpen((open) => !open)}
                        className="wc-btn wc-btn-sm wc-btn-pill"
                        style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            margin: 'var(--space-3) 0 0 var(--space-4)',
                            background: 'var(--wc-white)',
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        {navOpen ? <X size={16} /> : <Menu size={16} />}
                        Menu
                    </button>
                )}

                <main
                    style={{
                        flex: 1,
                        // A phone cannot spare 64px of horizontal padding.
                        padding: isMobile ? 'var(--space-4)' : 'var(--space-8)',
                        paddingTop: isMobile
                            ? 'var(--space-4)'
                            : 'var(--space-6)',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
