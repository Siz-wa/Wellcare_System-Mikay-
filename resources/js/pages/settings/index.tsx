// resources/js/Pages/Settings/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Settings overview page — route: /settings
// Acts as the entry point; renders the shared nav and defaults to Profile panel.
// Refactored to use Wellcare DashboardLayout & AppSidebar.

import type { ReactElement } from "react";
import { Head } from "@inertiajs/react";
import { DashboardLayout } from "../doctor/layout/dashboard-layout";
import { doctorTabs, settingsPageMeta } from "./settings-data";
import SettingsNav from "./components/settings-nav";
import ProfileForm from "./components/shared/profile-form";

export default function SettingsIndex(): ReactElement {
    const meta = settingsPageMeta;

    return (
        <DashboardLayout activeId="settings">
            <Head title="Settings" />
            
            {/* Screen reader only title */}
            <h1 className="sr-only">Settings</h1>

            {/* ── Main Settings Wrapper ────────────────────────────────────────── */}
            <div style={{ 
                padding: "var(--space-8) var(--space-10)", 
                maxWidth: "1280px", 
                margin: "0 auto",
                width: "100%"
            }}>
                
                {/* ── Header Section ───────────────────────────────────────────── */}
                <div style={{ marginBottom: "var(--space-8)" }}>
                    <h2 style={{
                        margin: "0 0 var(--space-1)",
                        fontSize: "var(--text-3xl)", 
                        fontWeight: 800,
                        letterSpacing: "-0.03em", 
                        lineHeight: 1.15,
                        color: "var(--wc-dark)",
                    }}>
                        {meta.pageTitle}
                    </h2>
                    <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--wc-gray-500)", lineHeight: 1.5 }}>
                        {meta.pageSubtitle}
                    </p>
                </div>

                {/* ── Two-column layout: Local Nav + Content ────────────────────── */}
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "280px 1fr", 
                    gap: "var(--space-8)", 
                    alignItems: "flex-start" 
                }}>

                    {/* Shared Internal Navigation (Inertia Links) */}
                    <SettingsNav tabs={doctorTabs} activeHref="/settings/profile" />

                    {/* ── Default Content Card (Profile) ─────────────────────────── */}
                    <main style={{
                        background: "#fff",
                        borderRadius: "var(--radius-3xl)",
                        border: "1px solid var(--wc-gray-100)",
                        padding: "var(--space-8)",
                        boxShadow: "var(--shadow-sm)",
                        minHeight: "600px"
                    }}>
                        {/* Panel Internal Header */}
                        <div style={{
                            marginBottom: "var(--space-8)",
                            paddingBottom: "var(--space-6)",
                            borderBottom: "1px solid var(--wc-gray-100)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: "var(--radius-xl)",
                                    background: "var(--wc-blue-50)", display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    color: "var(--wc-blue-600)",
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--wc-dark)" }}>
                                        Profile Information
                                    </h3>
                                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
                                        Update your display name, specialization, and contact details
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Default form for the Index landing page */}
                        <ProfileForm />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}