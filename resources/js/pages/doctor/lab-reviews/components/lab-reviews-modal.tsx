// resources/js/pages/user/lab-reviews/components/LaboratoryResultModal.tsx

import { useState, ReactElement } from "react";
import { LabResultDetail } from "./type";
import { SectionHeader, InfoTile, ParameterRow } from "./sub-components";
import { IconCheck, IconClock, IconPlus, IconBell } from "@/pages/doctor/icons";
import { LabResultStatus } from "../lab-reviews-data";

// Type definition for the status config to fix the "any" index error
interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  icon: ReactElement;
}

export function LaboratoryResultModal({ 
  result, 
  onClose, 
  onValidate 
}: { 
  result: LabResultDetail; 
  onClose: () => void; 
  onValidate: (id: string, notes: string) => void 
}) {
  const [notes, setNotes] = useState(result.interpretation);

  // Explicitly typing the record with LabResultStatus keys
  const statusConfig: Record<LabResultStatus, StatusStyle> = {
    pending:  { label: "Pending",  color: "var(--wc-blue-600)", bg: "#eff6ff", icon: <IconClock /> },
    critical: { label: "Critical", color: "var(--wc-error)",    bg: "#fef2f2", icon: <IconBell /> },
    normal:   { label: "Normal",   color: "var(--wc-success)",  bg: "#f0fdf4", icon: <IconCheck /> },
    reviewed: { label: "Reviewed", color: "var(--wc-gray-600)", bg: "var(--wc-gray-50)", icon: <IconCheck /> },
  };

  const currentStatus = statusConfig[result.status];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        
        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <header style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={styles.iconBox}><IconBell /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>Lab Result</h2>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--wc-gray-400)", fontWeight: 700 }}>{result.test}</p>
            </div>
          </header>

          <div style={styles.bento}>
            <SectionHeader title="Patient Info" />
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <InfoTile label="Patient" value={result.name} icon={<IconPlus />} />
              <InfoTile label="Reported" value={result.timeAgo} icon={<IconClock />} />
            </div>
          </div>

          <div style={{ ...styles.bento, background: currentStatus.bg, borderColor: "transparent" }}>
            <SectionHeader title="Overall Status" />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: currentStatus.color, fontWeight: 700 }}>
              {currentStatus.icon} {currentStatus.label.toUpperCase()}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={styles.bento}>
            <SectionHeader title="Test Parameters" />
            <table style={{ width: "100%", borderSpacing: "0 10px", borderCollapse: "separate" }}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={{ textAlign: "left", paddingLeft: "16px" }}>Parameter</th>
                  <th style={{ textAlign: "left" }}>Result</th>
                  <th style={{ textAlign: "left" }}>Reference</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.testParameters.map((p, i) => <ParameterRow key={i} param={p} />)}
              </tbody>
            </table>
          </div>

          <div style={{ ...styles.bento, flex: 1, display: "flex", flexDirection: "column" }}>
            <SectionHeader title="Doctor's Interpretation" />
            <textarea 
              style={styles.textarea} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter clinical findings..."
            />
          </div>

          <footer style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", fontWeight: 700, cursor: "pointer", color: "var(--wc-gray-500)" }}>Close</button>
            <button 
              onClick={() => onValidate(result.id, notes)} 
              className="wc-btn wc-btn-primary wc-btn-pill"
              style={{ padding: "0 24px", height: "44px" }}
            >
              Validate Result
            </button>
          </footer>
        </main>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  container: { background: "#fff", width: "90%", maxWidth: "1000px", borderRadius: "32px", padding: "40px", display: "grid", gridTemplateColumns: "280px 1fr", gap: "32px", border: "1px solid var(--wc-gray-100)" },
  bento: { padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px" },
  iconBox: { width: 56, height: 56, borderRadius: "14px", background: "#f0fdf4", border: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--wc-blue-600)" },
  tableHeader: { color: "var(--wc-gray-400)", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" },
  textarea: { width: "100%", flex: 1, border: "none", background: "var(--wc-gray-50)", borderRadius: "12px", padding: "16px", fontSize: "14px", outline: "none", resize: "none" }
};