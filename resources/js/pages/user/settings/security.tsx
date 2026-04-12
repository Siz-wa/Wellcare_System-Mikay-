// resources/js/pages/user/settings/security.tsx
// Route: /user/settings/security  →  inertia('user/settings/security')

import type { ReactElement }      from "react";
import { Head }                   from "@inertiajs/react";
import { PatientSettingsLayout }  from "./patient-settings-layout";
import SecurityForm               from "@/pages/settings/components/shared/security-form";

interface Props {
  canManageTwoFactor?:   boolean;
  requiresConfirmation?: boolean;
  twoFactorEnabled?:     boolean;
}

export default function PatientSecurity({
  canManageTwoFactor = false, requiresConfirmation = false, twoFactorEnabled = false,
}: Props): ReactElement {
  return (
    <>
      <Head title="Settings — Security" />
      <PatientSettingsLayout
        activeId="security"
        pageTitle="Settings"
        panelIcon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        }
        panelTitle="Security"
        panelSubtitle="Manage your password and two-factor authentication"
      >
        <SecurityForm
          twoFactorEnabled={twoFactorEnabled}
          canManageTwoFactor={canManageTwoFactor}
          requiresConfirmation={requiresConfirmation}
        />
      </PatientSettingsLayout>
    </>
  );
}