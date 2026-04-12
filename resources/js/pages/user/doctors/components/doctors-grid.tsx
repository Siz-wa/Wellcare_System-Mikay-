// resources/js/pages/patient/doctors/components/doctors-grid.tsx
import type { ReactElement } from "react";
import { mockCareDoctors }   from "../../patient-data";
import { DoctorCard }        from "./doctor-card";

interface Props { visible: boolean; }

export function DoctorsGrid({ visible }: Props): ReactElement {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap:                 "var(--space-5)",
        alignItems:          "start",
      }}
    >
      {mockCareDoctors.map((doctor, i) => (
        <DoctorCard
          key={doctor.id}
          doctor={doctor}
          index={i}
          visible={visible}
        />
      ))}
    </div>
  );
}