// resources/js/pages/doctor/dashboard/consultations/components/consultation-detail-modal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Consultation Summary Modal — tabbed clinical record view.
//
// Industry practice applied:
//   • Tabs mirror the session editor (Overview / SOAP / Vitals / Prescriptions)
//     so doctors don't have to re-learn a different layout.
//   • "Past History" slides in as a right-side panel without closing the modal
//     or navigating away — doctors can compare current vs past inline.
//   • History is fetched lazily (only when the panel is opened) to avoid
//     loading irrelevant data on every summary open.
//   • No data is shown if it was never recorded — empty states are explicit
//     so the doctor knows the difference between "not recorded" and "normal".
//   • SOAP is the primary clinical record — it gets its own prominent tab.

import type { ReactElement }    from "react";
import { useState, useEffect }  from "react";
import { IconClock, IconCheck, IconSchedule } from "@/pages/doctor/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prescription { medication: string; dosage: string; duration: string; }

interface SoapData {
  subjective: string;
  objective:  string;
  assessment: string;
  plan:       string;
}

interface VitalsData {
  bloodPressure:    string;
  heartRate:        string;
  temperature:      string;
  oxygenSaturation: string;
  weight:           string;
  height:           string;
}

interface HistoryVisit {
  id:            number;
  date:          string;
  time:          string;
  service:       string;
  coverage:      string;
  soap:          SoapData | null;
  vitals:        VitalsData | null;
  prescriptions: { name: string; instructions: string }[];
}

interface Consultation {
  id:             number;
  patientName:    string;
  patientId:      string;
  date:           string;
  time:           string;
  type:           string;
  diagnosis:      string;
  notes:          string;         // patient's booking notes (additionalInfo)
  prescriptions:  Prescription[];
  avatarColor:    string;
  initials:       string;
  rawStatus?:     string;
  coverage?:      string;
  age?:           number;
  gender?:        string;
  contactNumber?: string;
  email?:         string;
  soap?:          SoapData | null;
  vitals?:        VitalsData | null;
}

interface ModalProps {
  consultation: Consultation;
  onClose:      () => void;
}

type SummaryTab = "overview" | "soap" | "vitals";

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }): ReactElement {
  return (
    <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 800, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {title}
    </p>
  );
}

function EmptyNote({ text }: { text: string }): ReactElement {
  return (
    <p style={{ margin: 0, fontSize: "13px", color: "var(--wc-gray-300)", fontStyle: "italic" }}>{text}</p>
  );
}

function VitalChip({ label, value, unit }: { label: string; value: string; unit: string }): ReactElement {
  const hasValue = value?.trim();
  return (
    <div style={{ padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)", background: hasValue ? "var(--wc-white)" : "var(--wc-gray-50)" }}>
      <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      {hasValue
        ? <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--wc-dark)", letterSpacing: "-0.02em" }}>{value} <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--wc-gray-400)" }}>{unit}</span></p>
        : <p style={{ margin: 0, fontSize: "13px", color: "var(--wc-gray-300)", fontStyle: "italic" }}>Not recorded</p>
      }
    </div>
  );
}

function SoapBlock({ label, value, color }: { label: string; value: string; color: string }): ReactElement {
  return (
    <div style={{ borderRadius: "12px", border: "1px solid var(--wc-gray-100)", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", gap: "8px", background: "var(--wc-gray-50)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      </div>
      <div style={{ padding: "12px 14px", background: "var(--wc-white)", minHeight: "60px" }}>
        {value?.trim()
          ? <p style={{ margin: 0, fontSize: "13px", color: "var(--wc-gray-700)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</p>
          : <EmptyNote text="Not recorded" />
        }
      </div>
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ email, excludeId, onClose }: { email: string; excludeId: number; onClose: () => void }): ReactElement {
  const [history,  setHistory]  = useState<HistoryVisit[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/dashboard/consultations/patient-history?email=${encodeURIComponent(email)}&exclude_id=${excludeId}`)
      .then((r) => r.json())
      .then((data) => { setHistory(data.history ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [email, excludeId]);

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0,
      width: "360px",
      background: "var(--wc-white)",
      borderLeft: "1px solid var(--wc-gray-100)",
      display: "flex", flexDirection: "column",
      zIndex: 10,
      boxShadow: "-8px 0 24px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--wc-dark)" }}>Past History</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--wc-gray-400)" }}>Previous completed consultations</p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wc-gray-400)", padding: "4px", borderRadius: "6px" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 4L4 12M4 4l8 8"/></svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--wc-gray-400)" }}>Loading history…</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "var(--wc-gray-500)" }}>No previous visits</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-400)" }}>This patient has no other completed consultations on record.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map((visit) => {
              const isOpen = expanded === visit.id;
              const hasSoap = visit.soap && Object.values(visit.soap).some(v => v?.trim());
              return (
                <div key={visit.id} style={{ borderRadius: "12px", border: `1px solid ${isOpen ? "var(--wc-blue-200)" : "var(--wc-gray-100)"}`, overflow: "hidden", transition: "border-color 0.15s ease" }}>
                  {/* Visit header — always visible */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : visit.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", background: isOpen ? "var(--wc-blue-50)" : "var(--wc-gray-50)",
                      border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s ease",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--wc-dark)" }}>{visit.service}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--wc-gray-400)" }}>{visit.date} · {visit.time}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {hasSoap && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--wc-blue-600)", background: "var(--wc-blue-50)", padding: "2px 8px", borderRadius: "100px", border: "1px solid var(--wc-blue-100)" }}>
                          SOAP
                        </span>
                      )}
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", color: "var(--wc-gray-400)", flexShrink: 0 }}>
                        <polyline points="2 5 7 10 12 5"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: "14px", background: "var(--wc-white)", display: "flex", flexDirection: "column", gap: "12px" }}>

                      {/* Vitals row */}
                      {visit.vitals && Object.values(visit.vitals).some(v => v?.trim()) && (
                        <div>
                          <SectionHeader title="Vitals" />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                            {visit.vitals.bloodPressure    && <div style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}><p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>BP</p><p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--wc-dark)" }}>{visit.vitals.bloodPressure}</p></div>}
                            {visit.vitals.heartRate        && <div style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}><p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>HR</p><p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--wc-dark)" }}>{visit.vitals.heartRate} bpm</p></div>}
                            {visit.vitals.temperature      && <div style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}><p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>Temp</p><p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--wc-dark)" }}>{visit.vitals.temperature}°C</p></div>}
                          </div>
                        </div>
                      )}

                      {/* SOAP assessment (most clinically relevant) */}
                      {visit.soap?.assessment?.trim() && (
                        <div>
                          <SectionHeader title="Assessment" />
                          <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-700)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{visit.soap.assessment}</p>
                        </div>
                      )}

                      {/* Plan */}
                      {visit.soap?.plan?.trim() && (
                        <div>
                          <SectionHeader title="Plan" />
                          <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-700)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{visit.soap.plan}</p>
                        </div>
                      )}

                      {/* Prescriptions */}
                      {visit.prescriptions.length > 0 && (
                        <div>
                          <SectionHeader title="Prescriptions" />
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {visit.prescriptions.map((rx, i) => (
                              <div key={i} style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}>
                                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--wc-dark)" }}>{rx.name}</p>
                                {rx.instructions && <p style={{ margin: "1px 0 0", fontSize: "11px", color: "var(--wc-gray-400)" }}>{rx.instructions}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasSoap && visit.prescriptions.length === 0 && !visit.vitals && (
                        <EmptyNote text="No clinical data recorded for this visit." />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function ConsultationDetailModal({ consultation, onClose }: ModalProps): ReactElement {
  const [tab,         setTab]         = useState<SummaryTab>("overview");
  const [showHistory, setShowHistory] = useState(false);

  const statusLabel = consultation.rawStatus === "checked_in"  ? "Checked In"
    : consultation.rawStatus === "in_progress" ? "In Progress" : "Completed";

  const statusColor = consultation.rawStatus === "completed"
    ? { bg: "#dcfce7", text: "#15803d" }
    : { bg: "#dbeafe", text: "#1d4ed8" };

  const tabs: { key: SummaryTab; label: string }[] = [
    { key: "overview",      label: "Overview"      },
    { key: "soap",          label: "SOAP Notes"    },
    { key: "vitals",        label: "Vitals"        },

  ];

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "#fff", width: "100%", maxWidth: "960px", maxHeight: "90vh", borderRadius: "24px", overflow: "hidden", position: "relative", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.12)", border: "1px solid var(--wc-gray-100)", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Modal header ── */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--wc-gray-100)", flexShrink: 0 }}>

          {/* Top row: patient + actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "12px", background: consultation.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {consultation.initials}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--wc-dark)", letterSpacing: "-0.02em" }}>{consultation.patientName}</h2>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "100px", background: statusColor.bg, color: statusColor.text }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "3px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-400)", fontWeight: 500 }}>{consultation.patientId}</p>
                  {consultation.age && (
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-400)", fontWeight: 500 }}>
                      {consultation.age} yrs · <span style={{ textTransform: "capitalize" }}>{consultation.gender}</span>
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--wc-gray-400)", fontWeight: 500 }}>
                    <IconSchedule />
                    {consultation.date} · {consultation.time}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {/* Past History toggle */}
              <button
                onClick={() => setShowHistory((s) => !s)}
                style={{
                  height: "36px", padding: "0 16px", borderRadius: "10px",
                  border: `1px solid ${showHistory ? "var(--wc-blue-600)" : "var(--wc-gray-200)"}`,
                  background: showHistory ? "var(--wc-blue-600)" : "transparent",
                  color: showHistory ? "#fff" : "var(--wc-gray-600)",
                  fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Past History
              </button>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "10px", border: "1px solid var(--wc-gray-200)", background: "none", cursor: "pointer", color: "var(--wc-gray-400)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 4L4 12M4 4l8 8"/></svg>
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: "4px" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  fontSize: "13px",
                  fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? "var(--wc-blue-600)" : "var(--wc-gray-500)",
                  cursor: "pointer",
                  borderBottom: tab === t.key ? "2px solid var(--wc-blue-600)" : "2px solid transparent",
                  transition: "all 0.15s ease",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Modal body ── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Service + coverage + patient type */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)", background: "var(--wc-gray-50)" }}>
                    <SectionHeader title="Service" />
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--wc-dark)" }}>{consultation.diagnosis}</p>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)", background: "var(--wc-gray-50)" }}>
                    <SectionHeader title="Coverage" />
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--wc-dark)", textTransform: "capitalize" }}>{consultation.coverage || "—"}</p>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)", background: "var(--wc-gray-50)" }}>
                    <SectionHeader title="Patient Type" />
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--wc-dark)" }}>{consultation.type}</p>
                  </div>
                </div>

                {/* Assessment (most important SOAP field — surfaced on overview) */}
                <div style={{ padding: "18px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)" }}>
                  <SectionHeader title="Assessment / Diagnosis" />
                  {consultation.soap?.assessment?.trim()
                    ? <p style={{ margin: 0, fontSize: "14px", color: "var(--wc-gray-700)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{consultation.soap.assessment}</p>
                    : <EmptyNote text="No assessment recorded. Open the session editor to add clinical notes." />
                  }
                </div>

                {/* Quick vitals snapshot */}
                {consultation.vitals && Object.values(consultation.vitals).some(v => v?.trim()) && (
                  <div style={{ padding: "18px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)" }}>
                    <SectionHeader title="Vitals Snapshot" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {consultation.vitals.bloodPressure    && <VitalChip label="Blood Pressure"    value={consultation.vitals.bloodPressure}    unit="mmHg" />}
                      {consultation.vitals.heartRate        && <VitalChip label="Heart Rate"        value={consultation.vitals.heartRate}        unit="bpm"  />}
                      {consultation.vitals.temperature      && <VitalChip label="Temperature"       value={consultation.vitals.temperature}      unit="°C"   />}
                      {consultation.vitals.oxygenSaturation && <VitalChip label="O₂ Saturation"    value={consultation.vitals.oxygenSaturation} unit="%"    />}
                      {consultation.vitals.weight           && <VitalChip label="Weight"            value={consultation.vitals.weight}           unit="kg"   />}
                      {consultation.vitals.height           && <VitalChip label="Height"            value={consultation.vitals.height}           unit="cm"   />}
                    </div>
                  </div>
                )}

                {/* Patient booking notes */}
                {consultation.notes?.trim() && (
                  <div style={{ padding: "18px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)" }}>
                    <SectionHeader title="Patient Notes (from booking)" />
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--wc-gray-600)", lineHeight: 1.6 }}>{consultation.notes}</p>
                  </div>
                )}

                {/* Contact */}
                {consultation.contactNumber && (
                  <div style={{ padding: "14px 18px", borderRadius: "12px", border: "1px solid var(--wc-gray-100)", background: "var(--wc-gray-50)", display: "flex", gap: "24px" }}>
                    <div><SectionHeader title="Contact" /><p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--wc-dark)" }}>{consultation.contactNumber}</p></div>
                    {consultation.email && <div><SectionHeader title="Email" /><p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--wc-dark)" }}>{consultation.email}</p></div>}
                  </div>
                )}
              </div>
            )}

            {/* ── SOAP NOTES ── */}
            {tab === "soap" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <SoapBlock label="Subjective"  value={consultation.soap?.subjective  ?? ""} color="var(--wc-sky-500)"  />
                <SoapBlock label="Objective"   value={consultation.soap?.objective   ?? ""} color="#16a34a"            />
                <SoapBlock label="Assessment"  value={consultation.soap?.assessment  ?? ""} color="var(--wc-blue-600)" />
                <SoapBlock label="Plan"        value={consultation.soap?.plan        ?? ""} color="#ca8a04"            />
              </div>
            )}

            {/* ── VITALS ── */}
            {tab === "vitals" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                <VitalChip label="Blood Pressure"    value={consultation.vitals?.bloodPressure    ?? ""} unit="mmHg" />
                <VitalChip label="Heart Rate"        value={consultation.vitals?.heartRate        ?? ""} unit="bpm"  />
                <VitalChip label="Temperature"       value={consultation.vitals?.temperature      ?? ""} unit="°C"   />
                <VitalChip label="O₂ Saturation"     value={consultation.vitals?.oxygenSaturation ?? ""} unit="%"    />
                <VitalChip label="Weight"            value={consultation.vitals?.weight           ?? ""} unit="kg"   />
                <VitalChip label="Height"            value={consultation.vitals?.height           ?? ""} unit="cm"   />
              </div>
            )}


          </div>

          {/* ── Past History slide-in panel ── */}
          {showHistory && consultation.email && (
            <HistoryPanel
              email={consultation.email}
              excludeId={consultation.id}
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--wc-gray-100)", display: "flex", justifyContent: "flex-end", gap: "10px", flexShrink: 0 }}>
          <button onClick={onClose} style={{ height: "40px", padding: "0 20px", borderRadius: "10px", background: "var(--wc-gray-50)", color: "var(--wc-dark)", fontWeight: 700, border: "1px solid var(--wc-gray-100)", cursor: "pointer", fontSize: "13px" }}>
            Close
          </button>
          <button onClick={() => window.print()} style={{ height: "40px", padding: "0 20px", borderRadius: "10px", background: "var(--wc-blue-600)", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Summary
          </button>
        </div>
      </div>
    </div>
  );
}