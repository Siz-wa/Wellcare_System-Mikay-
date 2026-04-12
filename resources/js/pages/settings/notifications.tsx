// resources/js/pages/settings/notifications.tsx
// Route: /settings/notifications  (doctor)

import type { ReactElement } from "react";
import { Head }              from "@inertiajs/react";
import { SettingsLayout }    from "./components/settings-layout";
import { doctorTabs }        from "./settings-data";
import NotificationsForm     from "./components/shared/notifications-form";

export default function Notifications(): ReactElement {
  return (
    <>
      <Head title="Notification Settings" />
      <SettingsLayout
        tabs={doctorTabs}
        activeHref="/settings/notifications"
        panelIcon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        }
        panelTitle="Notification Preferences"
        panelSubtitle="Choose how and when Wellcare sends you updates"
      >
        <NotificationsForm />
      </SettingsLayout>
    </>
  );
}