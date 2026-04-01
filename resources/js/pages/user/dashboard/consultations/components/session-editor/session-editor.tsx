// resources/js/pages/user/consultations/components/session-editor/session-editor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Consultation Session Editor — full-screen modal with backdrop blur.
// Tabs: SOAP Notes · Patient Vitals · Prescription
// Footer: Auto-save indicator · Discard · Finalize Consultation

import { useState, useEffect, useCallback } from "react";
import type { ReactElement }                from "react";
import {
  consultationsMeta,
  sessionTabs,
  emptySoap,
  defaultVitals,
  defaultMedications,
} from "../../consultations-data";
import type { SessionTab, SoapFields, VitalsFields, Medication } from "../../consultations-data";
import { SoapNotes }      from "./soap-notes";
import { PatientVitals }  from "./patient-vitals";
import { Prescription }   from "./prescription";
import {
  IconX,
  IconSoap,
  IconVitals,
  IconPrescription,
  IconHistory,
} from "@/pages/user/dashboard/icons";

// ── Tab icon resolver ─────────────────────────────────────────────────────────

function TabIcon({ iconKey }: { iconKey: "soap" | "vitals" | "prescription" }): ReactElement {
  if (iconKey === "soap")         return <IconSoap />;
  if (iconKey === "vitals")       return <IconVitals />;
  return <IconPrescription />;
}

// ── Session Editor ────────────────────────────────────────────────────────────

interface SessionEditorProps {
  onClose: () => void;
}

export function SessionEditor({ onClose }: SessionEditorProps): ReactElement {
  const meta = consultationsMeta;

  const [activeTab,    setActiveTab]    = useState<SessionTab>("soap");
  const [soap,         setSoap]         = useState<SoapFields>({ ...emptySoap });
  const [vitals,       setVitals]       = useState<VitalsFields>({ ...defaultVitals });
  const [medications,  setMedications]  = useState<Medication[]>([...defaultMedications]);
  const [autoSaving,   setAutoSaving]   = useState(false);
  const [mountAnim,    setMountAnim]    = useState(false);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMountAnim(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Simulate auto-save on field changes
  useEffect(() => {
    setAutoSaving(true);
    const t = setTimeout(() => setAutoSaving(false), 1200);
    return () => clearTimeout(t);
  }, [soap, vitals, medications]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSoapChange = useCallback((key: keyof SoapFields, value: string): void => {
    setSoap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleVitalsChange = useCallback((key: keyof VitalsFields, value: string): void => {
    setVitals((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAddMed = useCallback((med: Medication): void => {
    setMedications((prev) => [...prev, med]);
  }, []);

  const handleRemoveMed = useCallback((id: string): void => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex:     "var(--z-modal)",
          opacity:    mountAnim ? 1 : 0,
          transition: "opacity var(--duration-slow) var(--ease-out)",
        }}
      />

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={meta.editorTitle}
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        "var(--z-modal)",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          padding:       "var(--space-8)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width:         "100%",
            maxWidth:      860,
            maxHeight:     "calc(100vh - var(--space-16))",
            background:    "var(--wc-white)",
            borderRadius:  "var(--radius-3xl)",
            boxShadow:     "var(--shadow-2xl)",
            display:       "flex",
            flexDirection: "column",
            overflow:      "hidden",
            pointerEvents: "auto",
            opacity:       mountAnim ? 1 : 0,
            transform:     mountAnim ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
            transition:    "opacity var(--duration-slow) var(--ease-out), transform var(--duration-slow) var(--ease-out)",
          }}
        >
          {/* ── Modal header ──────────────────────────────────────────────── */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "var(--space-5) var(--space-6)",
            borderBottom:   "1px solid var(--wc-gray-100)",
            flexShrink:     0,
          }}>
            {/* Logo mark + title */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{
                width:          36,
                height:         36,
                borderRadius:   "var(--radius-lg)",
                background:     "var(--wc-blue-50)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "var(--wc-blue-600)",
                flexShrink:     0,
              }}>
                <IconVitals />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-dark)", lineHeight: 1.2 }}>
                  {meta.editorTitle}
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", letterSpacing: "0.05em" }}>
                  {meta.editorPatientLabel}{" "}
                  <span style={{ color: "var(--wc-blue-600)", fontWeight: 700 }}>
                    {meta.editorPatientEmpty}
                  </span>
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          36,
                height:         36,
                borderRadius:   "var(--radius-full)",
                border:         "1px solid var(--wc-gray-200)",
                background:     "var(--wc-white)",
                color:          "var(--wc-gray-500)",
                cursor:         "pointer",
                transition:     "background var(--duration-fast) var(--ease-out)",
                flexShrink:     0,
              }}
            >
              <IconX />
            </button>
          </div>

          {/* ── Modal body: left sidebar tabs + right content ─────────────── */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Left tab sidebar */}
            <div style={{
              width:         180,
              flexShrink:    0,
              borderRight:   "1px solid var(--wc-gray-100)",
              padding:       "var(--space-4) var(--space-3)",
              display:       "flex",
              flexDirection: "column",
              gap:           "var(--space-1)",
              overflowY:     "auto",
            }}>
              {sessionTabs.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      gap:            "var(--space-3)",
                      padding:        "var(--space-3) var(--space-4)",
                      borderRadius:   "var(--radius-lg)",
                      border:         "none",
                      background:     isActive ? "var(--wc-blue-600)" : "transparent",
                      color:          isActive ? "#ffffff" : "var(--wc-gray-600)",
                      fontSize:       "var(--text-sm)",
                      fontWeight:     isActive ? 700 : 500,
                      cursor:         "pointer",
                      textAlign:      "left",
                      transition:     "all var(--duration-base) var(--ease-out)",
                      letterSpacing:  "0.01em",
                      fontFamily:     "var(--font-sans, 'DM Sans')",
                    }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>
                      <TabIcon iconKey={tab.iconKey} />
                    </span>
                    {tab.label}
                  </button>
                );
              })}

              {/* Past History — bottom of sidebar */}
              <div style={{ marginTop: "auto", paddingTop: "var(--space-4)", borderTop: "1px solid var(--wc-gray-100)" }}>
                <button
                  type="button"
                  style={{
                    display:    "flex",
                    alignItems: "center",
                    gap:        "var(--space-2)",
                    padding:    "var(--space-2) var(--space-4)",
                    border:     "none",
                    background: "transparent",
                    color:      "var(--wc-gray-500)",
                    fontSize:   "var(--text-xs)",
                    fontWeight: 600,
                    cursor:     "pointer",
                    letterSpacing: "0.04em",
                    fontFamily: "var(--font-sans, 'DM Sans')",
                  }}
                >
                  <IconHistory />
                  {meta.pastHistoryLabel}
                </button>
              </div>
            </div>

            {/* Right content area */}
            <div style={{
              flex:      1,
              padding:   "var(--space-5)",
              overflowY: "auto",
              display:   "flex",
              flexDirection: "column",
              minWidth:  0,
            }}>
              {activeTab === "soap" && (
                <SoapNotes values={soap} onChange={handleSoapChange} />
              )}
              {activeTab === "vitals" && (
                <PatientVitals values={vitals} onChange={handleVitalsChange} />
              )}
              {activeTab === "prescription" && (
                <Prescription
                  medications={medications}
                  onAdd={handleAddMed}
                  onRemove={handleRemoveMed}
                />
              )}
            </div>
          </div>

          {/* ── Modal footer ──────────────────────────────────────────────── */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "var(--space-4) var(--space-6)",
            borderTop:      "1px solid var(--wc-gray-100)",
            flexShrink:     0,
            background:     "var(--wc-white)",
          }}>
            {/* Auto-save indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{
                width:        8,
                height:       8,
                borderRadius: "var(--radius-full)",
                background:   autoSaving ? "#ca8a04" : "#16a34a",
                flexShrink:   0,
                transition:   "background var(--duration-base) var(--ease-out)",
              }} />
              <span style={{
                fontSize:   "var(--text-xs)",
                fontWeight: 500,
                color:      "var(--wc-gray-500)",
              }}>
                {meta.autoSaveLabel}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding:      "var(--space-3) var(--space-6)",
                  borderRadius: "var(--radius-full)",
                  border:       "1px solid var(--wc-gray-200)",
                  background:   "var(--wc-white)",
                  color:        "var(--wc-gray-600)",
                  fontSize:     "var(--text-sm)",
                  fontWeight:   600,
                  cursor:       "pointer",
                  fontFamily:   "var(--font-sans, 'DM Sans')",
                }}
              >
                {meta.discardLabel}
              </button>
              <button
                type="button"
                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <IconVitals />
                {meta.finalizeLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}