// resources/js/pages/settings/profile.tsx
// Route: /settings/profile  (doctor)

import type { ReactElement } from "react";
import { Head, usePage }     from "@inertiajs/react";
import { SettingsLayout }    from "./components/settings-layout";
import { doctorTabs }        from "./settings-data";
import ProfileForm           from "./components/shared/profile-form";

interface Props { mustVerifyEmail?: boolean; status?: string; }

export default function Profile({ mustVerifyEmail, status }: Props): ReactElement {
  const { auth } = usePage<{ auth: { user: { name: string; email: string } } }>().props;

  return (
    <>
      <Head title="Profile Settings" />
      <SettingsLayout
        tabs={doctorTabs}
        activeHref="/settings/profile"
        panelIcon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        }
        panelTitle="Profile Information"
        panelSubtitle="Update your display name, specialization, and contact details"
      >
        <ProfileForm
          displayName={auth?.user?.name ?? ""}
          email={auth?.user?.email ?? ""}
          mustVerifyEmail={mustVerifyEmail}
          verificationStatus={status}
        />
      </SettingsLayout>
    </>
  );
}