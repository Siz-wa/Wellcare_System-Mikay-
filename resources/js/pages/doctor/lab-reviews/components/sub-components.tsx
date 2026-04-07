// resources/js/pages/user/lab-reviews/components/sub-components.tsx

import { ReactElement } from "react";
import { Parameter } from "./type";
import { IconCheck, IconPlus } from "@/pages/doctor/icons";

export const SectionHeader = ({ title }: { title: string }) => (
  <h3 style={{ margin: "0 0 16px 0", fontSize: "10px", fontWeight: 800, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
    {title}
  </h3>
);

export const InfoTile = ({ label, value, icon }: { label: string; value: string; icon: ReactElement }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
    <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--wc-gray-400)" }}>
      {icon}
    </div>
    <div style={{ lineHeight: 1.2 }}>
      <p style={{ margin: 0, fontSize: "10px", color: "var(--wc-gray-400)", fontWeight: 700, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--wc-dark)" }}>{value}</p>
    </div>
  </div>
);

export const ParameterRow = ({ param }: { param: Parameter }) => {
  const isAbnormal = param.status === "abnormal";
  return (
    <tr style={{ background: "var(--wc-gray-50)" }}>
      <td style={{ padding: "14px 16px", fontWeight: 600, borderRadius: "12px 0 0 12px", border: "1px solid var(--wc-gray-100)", borderRight: "none" }}>{param.name}</td>
      <td style={{ padding: "14px 0", fontWeight: 700, borderTop: "1px solid var(--wc-gray-100)", borderBottom: "1px solid var(--wc-gray-100)" }}>
        {param.result} <span style={{ fontSize: "10px", color: "var(--wc-gray-400)" }}>{param.unit}</span>
      </td>
      <td style={{ padding: "14px 0", color: "var(--wc-gray-500)", borderTop: "1px solid var(--wc-gray-100)", borderBottom: "1px solid var(--wc-gray-100)" }}>{param.refRange}</td>
      <td style={{ padding: "14px 16px", textAlign: "center", borderRadius: "0 12px 12px 0", border: "1px solid var(--wc-gray-100)", borderLeft: "none", color: isAbnormal ? "var(--wc-error)" : "var(--wc-success)" }}>
        {isAbnormal ? <IconPlus /> : <IconCheck />}
      </td>
    </tr>
  );
};