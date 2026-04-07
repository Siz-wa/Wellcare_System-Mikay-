import { ReactElement, useState } from "react";
import { AppSidebar } from "../layout/AppSidebar";
import { AppTopbar }  from "../layout/AppTopbar";
import { PageHeader } from "../layout/components/page-header";
import { SETTINGS_TABS, USER_MOCK } from "./settings-data";
import { ProfileForm } from "./components/profile-form";
import { SettingsNav } from "./components/settings-nav";

export default function SettingsPage(): ReactElement {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--wc-gray-50)" }}>
      {/* Fixed Sidebar */}
      <AppSidebar activeId="settings" />

      {/* Main Content Scrollable Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflowY: "auto" }}>
        
        <AppTopbar />

        <div style={{ padding: "var(--space-8) var(--space-10)", maxWidth: "1200px" }}>
          <PageHeader 
            title="Account Settings" 
            subtitle="Manage your profile information, security, and notification preferences."
          />

          <div className="wc-settings-grid">
            <SettingsNav 
              tabs={SETTINGS_TABS} 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />

            <main className="wc-settings-card">
              {activeTab === 'profile' && <ProfileForm user={USER_MOCK} />}
              {activeTab !== 'profile' && (
                <div style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--wc-gray-400)' }}>
                  Section for {activeTab} is coming soon.
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}