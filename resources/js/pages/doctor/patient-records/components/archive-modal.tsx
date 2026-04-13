// resources/js/pages/user/components/archive-modal.tsx

import { type ReactElement, useEffect } from "react";
import type { Patient } from "../patient-records-data";
import { AvatarTile } from "../../layout/components/avatar-tile";
import { 
  IconArcBox, IconX, IconArcDoc, IconClock, 
  IconArcShield, IconArcDownload, IconArcExport, 
  IconArcFolder, IconSearch, IconFilter, IconChevronRight 
} from "../../icons";

export function ArchiveModal({ patient, onClose }: { patient: Patient, onClose: () => void }): ReactElement {
  
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on backdrop click (if backdrop is clicked directly)
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="wc-modal-backdrop" onClick={handleBackdrop}>
      <div className="wc-modal-content">
        
        {/* ── HEADER ── */}
        <header className="wc-modal-header">
          <div style={{ position: 'relative' }}>
            <AvatarTile initials="" color="var(--wc-blue-50)" shape="rounded" size={52} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconArcBox />
            </div>
          </div>
          <div style={{ flex: 1, marginLeft: '8px' }}>
            <h2 className="wc-display" style={{ fontSize: "1.5rem", margin: 0, fontWeight: 800 }}>Medical Record Archive</h2>
            <p className="wc-label" style={{ color: "var(--wc-blue-600)", marginTop: "4px", fontSize: '11px' }}>
              PATIENT: {patient.name.toUpperCase()} • ID: {patient.patientId}
            </p>
          </div>
          <button onClick={onClose} className="wc-btn wc-btn-xs wc-btn-outline" style={{ borderRadius: "10px", padding: '10px' }}>
            <IconX />
          </button>
        </header>

        {/* ── BODY ── */}
        <div className="wc-modal-body">
          
          {/* Spacious Sidebar */}
          <aside className="wc-archive-sidebar">
            <section>
              <p className="wc-label" style={{ color: "var(--wc-gray-400)", marginBottom: "20px" }}>Archive Summary</p>
              <SummaryStat icon={<IconArcDoc />} label="Documents" value={patient.docCount} />
              <SummaryStat icon={<IconClock />} label="Total Visits" value="12" />
              <SummaryStat icon={<IconArcShield />} label="Privacy" value="SECURE" isBadge />
            </section>

            <section>
              <p className="wc-label" style={{ color: "var(--wc-gray-400)", marginBottom: "20px" }}>Quick Actions</p>
              {/* Spacious action buttons */}
              <button className="wc-btn wc-btn-sm wc-btn-outline" style={{ width: "100%", justifyContent: "space-between", marginBottom: "12px", background: "#fff", padding: '12px 16px' }}>
                <span>Download All</span> <IconArcDownload />
              </button>
              <button className="wc-btn wc-btn-sm wc-btn-outline" style={{ width: "100%", justifyContent: "space-between", background: "#fff", padding: '12px 16px' }}>
                <span>Export to PDF</span> <IconArcExport />
              </button>
            </section>
          </aside>

          {/* Main List Area with spacious side padding */}
          <main className="wc-archive-main">
             <div style={{ padding: "24px var(--space-8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="wc-label" style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--wc-gray-500)", textTransform: 'none' }}>
                  <IconArcFolder /> Digital Health Records
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                   <button className="wc-btn wc-btn-xs wc-btn-outline" style={{ background: "#fff", padding: '8px' }}><IconSearch /></button>
                   <button className="wc-btn wc-btn-xs wc-btn-outline" style={{ background: "#fff", padding: '8px' }}><IconFilter /></button>
                </div>
             </div>

             <div className="wc-archive-list">
                {/* Spacious rows using the new class */}
                <RecordRow title="Annual Physical Examination Report" date="24 MAR 2026" type="PDF" size="2.4 MB" />
                <RecordRow title="Complete Blood Count (CBC) Results" date="22 MAR 2026" type="PDF" size="1.1 MB" />
                <RecordRow title="Chest X-Ray Imaging (DICOM)" date="15 FEB 2026" type="IMG" size="15.8 MB" />
                <RecordRow title="Cardiology Consultation Summary" date="10 JAN 2026" type="DOC" size="850 KB" />
             </div>
          </main>
        </div>

        {/* ── FOOTER ── */}
        <footer className="wc-modal-footer">
          <button onClick={onClose} className="wc-btn wc-btn-md wc-btn-outline">Close Archive</button>
          <button className="wc-btn wc-btn-md wc-btn-primary" style={{ borderRadius: "var(--radius-xl)" }}>Request Record Update</button>
        </footer>
      </div>
    </div>
  );
}

// ── Small Sub-components (Inline) ────────────────────────────────────────────

function SummaryStat({ icon, label, value, isBadge }: any) {
  return (
    <div className="wc-stat-card">
      <div className="wc-label" style={{ display: "flex", alignItems: "center", gap: "10px", textTransform: 'none', color: "var(--wc-gray-600)", fontSize: '12px' }}>
        {icon} {label}
      </div>
      <b style={{ 
        fontSize: "12px", 
        color: isBadge ? "var(--wc-success)" : "var(--wc-dark)",
        background: isBadge ? "var(--wc-success-light)" : "transparent",
        padding: isBadge ? "4px 10px" : "0",
        borderRadius: isBadge ? "8px" : "0",
        letterSpacing: isBadge ? '0.04em' : 'normal'
      }}>{value}</b>
    </div>
  );
}

function RecordRow({ title, date, type, size, active }: any) {
  return (
    // Active class is handled via template literal
    <div className={`wc-archive-item ${active ? 'wc-archive-item--active' : ''}`}>
      <AvatarTile initials="" color={active ? "var(--wc-blue-100)" : "var(--wc-gray-100)"} size={44} shape="rounded" />
      {/* Icon overlaid over AvatarTile for specific design look */}
      <div style={{ position: 'absolute', marginLeft: '14px', color: active ? 'var(--wc-blue-600)' : 'var(--wc-gray-400)' }}>
        <IconArcDoc />
      </div>
      <div style={{ flex: 1, marginLeft: '10px' }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: active ? "var(--wc-blue-700)" : "var(--wc-dark)" }}>{title}</div>
        <div style={{ fontSize: "11px", color: "var(--wc-gray-400)", fontWeight: 600, marginTop: "4px" }}>
          {date} • {type} • {size}
        </div>
      </div>
      <IconChevronRight />
    </div>
  );
}