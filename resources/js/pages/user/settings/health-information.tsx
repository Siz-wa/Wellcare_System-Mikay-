// resources/js/pages/user/settings/health-information.tsx
// Route: /user/settings/health-information  →  inertia('user/settings/health-information')

import type { ReactElement }      from "react";
import { Head }                   from "@inertiajs/react";
import { PatientSettingsLayout }  from "./patient-settings-layout";
import HealthInformationForm      from "@/pages/settings/components/patient/health-information-form";

export default function PatientHealthInformation(): ReactElement {
  return (
    <>
      <Head title="Settings — Health Information" />
      <PatientSettingsLayout
        activeId="health-information"
        pageTitle="Settings"
        panelIcon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        }
        panelTitle="Health Information"
        panelSubtitle="Keep your medical details up to date for accurate records"
      >
        <HealthInformationForm />
      </PatientSettingsLayout>
    </>
  );
}