// resources/js/pages/user/book-appointment/sections/step-coverage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Coverage, Doctor & Time
//
// Fix: SERVICE_TO_SPECIALTIES now maps to DB specialty slugs (e.g. "cardiology")
// not display strings (e.g. "Internal Medicine"), so the filter actually works.

import type { ReactElement }                                  from "react";
import { useMemo, useEffect, useState }                       from "react";
import type { BookingFormData, CoverageOption, DoctorOption } from "./bookingdata";
import {
  coverageOptions, hmoOptions,
  STEP_HEADINGS, SERVICE_TO_SPECIALTIES, HMO_NOTICE,
}                                                             from "./bookingdata";
import { sanitizeHmoId, makePasteHandler }                    from "../utils/sanitizers";

const HMO_MAX = 20;

interface StepCoverageProps {
  data:    BookingFormData;
  errors:  Record<string, string | undefined>;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
  doctors: DoctorOption[];
}

// ── Label helper ──────────────────────────────────────────────────────────────
// Converts DB specialty slug → readable label for the filter dropdown
function specialtyLabel(slug: string): string {
  const map: Record<string, string> = {
    general:          "General / Family Medicine",
    internal_medicine:"Internal Medicine",
    pediatrics:       "Pediatrics",
    cardiology:       "Cardiology",
    dermatology:      "Dermatology",
    orthopedics:      "Orthopedics",
    obstetrics:       "OB-Gynecology",
  };
  return map[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function StepCoverage({
  data, errors, setData, valid, onNext, onBack, doctors,
}: StepCoverageProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[3];

  const [docSearch,        setDocSearch]        = useState("");
  const [specialtyFilter,  setSpecialtyFilter]  = useState("all");
  const [currentPage,      setCurrentPage]      = useState(1);
  const DOCS_PER_PAGE = 9;

  const [availability,      setAvailability]      = useState<Record<number, number | null>>({});
  const [loadingAvail,      setLoadingAvail]       = useState(false);
  const [doctorSlots,       setDoctorSlots]        = useState<string[]>([]);
  const [slotsLoading,      setSlotsLoading]       = useState(false);
  const [doctorHasSchedule, setDoctorHasSchedule]  = useState<boolean | null>(null);

  // 1. Fetch per-doctor slot counts on date change
  useEffect(() => {
    if (!data.appointmentDate) { setAvailability({}); return; }
    setLoadingAvail(true);
    fetch(`/appointments/doctor-availability?date=${data.appointmentDate}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<number, number | null> = {};
        for (const [id, info] of Object.entries(d.availability ?? {})) {
          const i = info as any;
          map[Number(id)] = i.no_schedule ? null : (i.available_slots ?? 0);
        }
        setAvailability(map);
      })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [data.appointmentDate]);

  // 2. Fetch actual slot list when doctor + date are both set
  useEffect(() => {
    if (!data.doctorId || !data.appointmentDate) {
      setDoctorSlots([]);
      setDoctorHasSchedule(null);
      setData("appointmentTime", "");
      return;
    }
    setSlotsLoading(true);
    fetch(`/appointments/slots?doctor_id=${data.doctorId}&date=${data.appointmentDate}`)
      .then(r => r.json())
      .then(d => {
        setDoctorSlots(d.slots ?? []);
        setDoctorHasSchedule(d.has_schedule === true);
        if (data.appointmentTime && !(d.slots ?? []).includes(data.appointmentTime)) {
          setData("appointmentTime", "");
        }
      })
      .catch(() => { setDoctorSlots([]); setDoctorHasSchedule(null); })
      .finally(() => setSlotsLoading(false));
  }, [data.doctorId, data.appointmentDate]);

  const hasFetched       = data.doctorId !== null && data.appointmentDate !== "" && !slotsLoading && doctorHasSchedule !== null;
  const doctorNoSchedule = hasFetched && doctorHasSchedule === false;
  const doctorFullyBooked= hasFetched && doctorHasSchedule === true && doctorSlots.length === 0;
  const showSlots        = hasFetched && doctorHasSchedule === true && doctorSlots.length > 0;

  const allSpecialties = useMemo(
    () => [...new Set(doctors.map(d => d.specialty).filter(Boolean))].sort(),
    [doctors]
  );

  // ── THE FIX: compare d.specialty against SERVICE_TO_SPECIALTIES slugs ──────
  const filteredDoctors = useMemo<DoctorOption[]>(() => {
    // Get the allowed specialty slugs for the chosen service (null = show all)
    const serviceSpecialties: string[] | null = SERVICE_TO_SPECIALTIES[data.service] ?? null;

    let list = serviceSpecialties
      ? doctors.filter(d => serviceSpecialties.includes(d.specialty))
      : doctors;

    if (specialtyFilter !== "all") {
      list = list.filter(d => d.specialty === specialtyFilter);
    }

    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data.service, doctors, specialtyFilter, docSearch]);

  const totalPages   = Math.max(1, Math.ceil(filteredDoctors.length / DOCS_PER_PAGE));
  const safePage     = Math.min(currentPage, totalPages);
  const pagedDoctors = filteredDoctors.slice((safePage - 1) * DOCS_PER_PAGE, safePage * DOCS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [docSearch, specialtyFilter, data.service]);

  const handleCoverageChange = (value: string) => {
    setData("coverage", value);
    if (value !== "hmo") { setData("hmo", ""); setData("hmoId", ""); }
  };

  const handleDoctorSelect = (id: number | null) => {
    setData("doctorId", id);
    setData("appointmentTime", "");
  };

  const doctorIsValid = data.doctorId === null || filteredDoctors.some(d => d.id === data.doctorId);
  if (!doctorIsValid) handleDoctorSelect(null);

  // ── Service restriction notice ────────────────────────────────────────────
  const serviceSpecialties = SERVICE_TO_SPECIALTIES[data.service] ?? null;
  const isFiltered = serviceSpecialties !== null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span style={{ color: "var(--wc-blue-600)", display: "block", marginBottom: "var(--space-2)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Step 3 of 4
        </span>
        <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--wc-dark)" }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--wc-gray-500)" }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

        {/* ── Mode of Coverage ── */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
            Mode of Coverage <span style={{ color: "var(--wc-error)" }}>*</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
            {coverageOptions.map((o: CoverageOption) => {
              const isActive = data.coverage === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleCoverageChange(o.value)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: isActive ? "2px solid var(--wc-blue-600)" : "1.5px solid var(--wc-gray-200)",
                    background: isActive ? "var(--wc-blue-50)" : "#fff",
                    color: isActive ? "var(--wc-blue-700)" : "var(--wc-gray-600)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                    boxShadow: isActive ? "0 0 0 4px rgba(37,99,235,0.08)" : "none",
                  }}
                >
                  {/* Icon */}
                  {o.value === "cash" && (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
                      <path d="M6 12h.01M18 12h.01"/>
                    </svg>
                  )}
                  {o.value === "hmo" && (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  )}
                  {o.value === "philhealth" && (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  )}
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
          {errors.coverage && (
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--wc-error)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errors.coverage}
            </p>
          )}
        </div>

        {/* ── HMO notice ── */}
        {data.coverage === "hmo" && (
          <div style={{ padding: "14px 18px", borderRadius: "12px", background: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <svg width="16" height="16" fill="none" stroke="#7c3aed" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#5b21b6", lineHeight: 1.6 }}>{HMO_NOTICE}</p>
          </div>
        )}

        {/* ── HMO fields ── */}
        {data.coverage === "hmo" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                HMO Provider <span style={{ color: "var(--wc-error)" }}>*</span>
              </label>
              <select
                className={`wc-input wc-select${errors.hmo ? " wc-input-error" : ""}`}
                value={data.hmo}
                onChange={e => setData("hmo", e.target.value)}
              >
                {hmoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.hmo && (
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--wc-error)", fontWeight: 600 }}>{errors.hmo}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                HMO ID Number <span style={{ color: "var(--wc-error)" }}>*</span>
              </label>
              <input
                className={`wc-input${errors.hmoId ? " wc-input-error" : ""}`}
                type="text"
                placeholder="e.g. MC-123456"
                value={data.hmoId}
                onChange={e => setData("hmoId", sanitizeHmoId(e.target.value))}
                onPaste={makePasteHandler(sanitizeHmoId, v => setData("hmoId", v))}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                {errors.hmoId
                  ? <p style={{ margin: 0, fontSize: "11px", color: "var(--wc-error)", fontWeight: 600 }}>{errors.hmoId}</p>
                  : <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>Uppercase letters, numbers, hyphens</span>
                }
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: data.hmoId.length >= HMO_MAX ? "var(--wc-error)" : "var(--wc-gray-400)" }}>
                  {data.hmoId.length} / {HMO_MAX}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Preferred Doctor ── */}
        <div>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Preferred Doctor
              </label>
              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 500, color: "var(--wc-gray-400)" }}>
                {filteredDoctors.length} {filteredDoctors.length === 1 ? "result" : "results"}
                {isFiltered && (
                  <span style={{ marginLeft: "6px", padding: "2px 8px", borderRadius: "100px", background: "var(--wc-blue-50)", color: "var(--wc-blue-600)", fontSize: "10px", fontWeight: 700 }}>
                    Filtered by service
                  </span>
                )}
              </span>
            </div>
            {loadingAvail && data.appointmentDate && (
              <span style={{ fontSize: "11px", color: "var(--wc-gray-400)", fontStyle: "italic" }}>Checking availability…</span>
            )}
            {!loadingAvail && data.appointmentDate && (
              <span style={{ fontSize: "11px", color: "var(--wc-gray-400)" }}>Availability for {data.appointmentDate}</span>
            )}
          </div>

          {/* Service filter notice */}
          {isFiltered && filteredDoctors.length === 0 && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fefce8", border: "1px solid #fef08a", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" fill="none" stroke="#a16207" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#92400e" }}>
                No doctors available for the selected service. You may choose <strong>Next Available</strong> to be assigned automatically.
              </p>
            </div>
          )}

          {/* Filter bar — only show specialty filter if no service restriction */}
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--wc-gray-400)", display: "flex", pointerEvents: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="search"
                className="wc-input"
                placeholder="Search by name or specialty…"
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                style={{ paddingLeft: "36px", fontSize: "var(--text-sm)", height: 40 }}
              />
            </div>
            {/* Only show specialty dropdown when service has no restriction (null) */}
            {!isFiltered && (
              <select
                className="wc-input wc-select"
                value={specialtyFilter}
                onChange={e => setSpecialtyFilter(e.target.value)}
                style={{ fontSize: "var(--text-sm)", minWidth: 180, height: 40 }}
              >
                <option value="all">All Specialties</option>
                {allSpecialties.map(s => (
                  <option key={s} value={s}>{specialtyLabel(s)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Doctor grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-3)" }}>

            {/* Next Available card */}
            <button
              type="button"
              onClick={() => handleDoctorSelect(null)}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                textAlign: "left",
                border: data.doctorId === null ? "2px solid var(--wc-blue-600)" : "1.5px solid var(--wc-gray-200)",
                background: data.doctorId === null ? "var(--wc-blue-50)" : "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: data.doctorId === null ? "0 0 0 4px rgba(37,99,235,0.08)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="var(--wc-gray-500)" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: data.doctorId === null ? "var(--wc-blue-600)" : "var(--wc-dark)" }}>
                    Next Available
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--wc-gray-400)", lineHeight: 1.4 }}>
                    Assign me to any available doctor
                  </p>
                </div>
              </div>
            </button>

            {pagedDoctors.map(doc => {
              const isSelected    = data.doctorId === doc.id;
              const rawSlot       = data.appointmentDate ? availability[doc.id] : undefined;
              const hasFetchedDoc = data.appointmentDate && rawSlot !== undefined;
              const slotCount     = rawSlot ?? -1;
              const isFullyBooked = hasFetchedDoc && rawSlot === 0;
              const hasAvailData  = hasFetchedDoc && rawSlot !== null;

              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleDoctorSelect(doc.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    textAlign: "left",
                    border: isSelected
                      ? `2px solid ${isFullyBooked ? "#f97316" : "var(--wc-blue-600)"}`
                      : "1.5px solid var(--wc-gray-200)",
                    background: isSelected ? (isFullyBooked ? "#fff7ed" : "var(--wc-blue-50)") : "#fff",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                    opacity: isFullyBooked ? 0.75 : 1,
                    boxShadow: isSelected ? `0 0 0 4px ${isFullyBooked ? "rgba(249,115,22,0.1)" : "rgba(37,99,235,0.08)"}` : "none",
                  }}
                >
                  {/* Badge */}
                  {isFullyBooked && (
                    <span style={{ position: "absolute", top: 8, right: 8, fontSize: "9px", fontWeight: 800, background: "#fed7aa", color: "#c2410c", padding: "2px 8px", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Fully Booked
                    </span>
                  )}
                  {!isFullyBooked && hasAvailData && slotCount > 0 && (
                    <span style={{ position: "absolute", top: 8, right: 8, fontSize: "9px", fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: "100px" }}>
                      {slotCount} slots
                    </span>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: doc.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0, letterSpacing: "0.02em" }}>
                      {doc.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: "var(--text-sm)",
                        fontWeight: 700,
                        color: isSelected ? (isFullyBooked ? "#c2410c" : "var(--wc-blue-600)") : "var(--wc-dark)",
                        // Reserve space so badge doesn't overlap name
                        paddingRight: hasAvailData ? "52px" : 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {doc.name}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
                        {specialtyLabel(doc.specialty)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{ width: 32, height: 32, borderRadius: "8px", border: "1.5px solid var(--wc-gray-200)", background: safePage === 1 ? "var(--wc-gray-100)" : "#fff", cursor: safePage === 1 ? "not-allowed" : "pointer", opacity: safePage === 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--wc-gray-600)" }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="10 4 4 8 10 12"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  style={{ width: 32, height: 32, borderRadius: "8px", border: page === safePage ? "2px solid var(--wc-blue-600)" : "1.5px solid var(--wc-gray-200)", background: page === safePage ? "var(--wc-blue-600)" : "#fff", color: page === safePage ? "#fff" : "var(--wc-gray-600)", cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: page === safePage ? 700 : 500 }}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{ width: 32, height: 32, borderRadius: "8px", border: "1.5px solid var(--wc-gray-200)", background: safePage === totalPages ? "var(--wc-gray-100)" : "#fff", cursor: safePage === totalPages ? "not-allowed" : "pointer", opacity: safePage === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--wc-gray-600)" }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="4 4 10 8 4 12"/></svg>
              </button>
            </div>
          )}

          {!data.appointmentDate && (
            <p style={{ margin: "10px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>
              Select a date in Step 2 to see real-time availability.
            </p>
          )}
        </div>

        {/* ── Inline Time Slot Picker ── */}
        {data.doctorId !== null && data.appointmentDate && (
          <div style={{ padding: "var(--space-5)", borderRadius: "14px", border: "1.5px solid var(--wc-gray-200)", background: "#fafafa" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "var(--space-4)" }}>
              Preferred Time <span style={{ color: "var(--wc-error)" }}>*</span>
            </label>

            {slotsLoading && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>Checking available times…</p>
            )}

            {!slotsLoading && doctorNoSchedule && (
              <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="14" height="14" fill="none" stroke="#c2410c" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#c2410c", fontWeight: 600 }}>
                  This doctor has no availability configured for {data.appointmentDate}. Please choose a different date or select another doctor.
                </p>
              </div>
            )}

            {!slotsLoading && doctorFullyBooked && (
              <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fee2e2", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="14" height="14" fill="none" stroke="#b91c1c" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#b91c1c", fontWeight: 600 }}>
                  This doctor is fully booked on {data.appointmentDate}. Please choose a different date or another doctor.
                </p>
              </div>
            )}

            {!slotsLoading && showSlots && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "var(--space-2)" }}>
                  {doctorSlots.map(slot => {
                    const isChosen = data.appointmentTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setData("appointmentTime", slot)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: "10px",
                          border: isChosen ? "2px solid var(--wc-blue-600)" : "1.5px solid var(--wc-gray-200)",
                          background: isChosen ? "var(--wc-blue-600)" : "#fff",
                          color: isChosen ? "#fff" : "var(--wc-dark)",
                          fontSize: "var(--text-sm)",
                          fontWeight: isChosen ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textAlign: "center",
                          boxShadow: isChosen ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {errors.appointmentTime && (
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--wc-error)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errors.appointmentTime}
                  </p>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* Step nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-8)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ height: 48, padding: "0 24px", borderRadius: "100px", border: "1.5px solid var(--wc-gray-200)", background: "#fff", color: "var(--wc-gray-600)", fontWeight: 700, fontSize: "var(--text-sm)", cursor: "pointer" }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{ height: 48, padding: "0 28px", borderRadius: "100px", background: "var(--wc-blue-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: "var(--text-sm)", cursor: "pointer" }}
        >
          Review Appointment →
        </button>
      </div>
    </div>
  );
}