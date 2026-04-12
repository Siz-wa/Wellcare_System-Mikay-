// resources/js/pages/user/settings/index.tsx
// Route: /user/settings  →  inertia('user/settings/index')

import type { ReactElement }         from "react";
import { Head, usePage }             from "@inertiajs/react";
import { PatientSettingsLayout }     from "./patient-settings-layout";
import PatientProfileForm            from "./components/patient-profile-form";

interface Props { mustVerifyEmail?: boolean; status?: string; }

export default function PatientSettingsIndex({ mustVerifyEmail, status }: Props): ReactElement {
  const { auth } = usePage<{ auth: { user: { name: string; email: string } } }>().props;

  return (
    <>
      <Head title="Settings — Profile" />
      <PatientSettingsLayout
        activeId="profile"
        pageTitle="Settings"
        panelIcon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        }
        panelTitle="Profile Information"
        panelSubtitle="Update your personal details and contact information"
      >
        <PatientProfileForm
          displayName={auth?.user?.name ?? ""}
          email={auth?.user?.email ?? ""}
          mustVerifyEmail={mustVerifyEmail}
          verificationStatus={status}
        />
      </PatientSettingsLayout>
    </>
  );
}