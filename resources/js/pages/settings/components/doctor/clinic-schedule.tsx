// resources/js/pages/user/settings/components/doctor/clinic-schedule.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Doctor-specific settings panel with DashboardLayout.
// Updated sizing and placement to match Profile Information card.

import { type ReactElement, useState } from "react";
import { Head } from "@inertiajs/react";
import { DashboardLayout } from "@/pages/doctor/layout/dashboard-layout";
import SettingsNav from "../../components/settings-nav";
import { doctorTabs } from "../../settings-data";
import { clinicScheduleStrings } from "../../settings-data";

// ── Day Toggle ────────────────────────────────────────────────────────────────

function DayToggle({
  value, label, active, onToggle,
}: { value: string; label: string; active: boolean; onToggle: (v: string) => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      style={{
        width: 42, height: 42, borderRadius: "var(--radius-lg)",
        border: active ? "none" : "1px solid var(--wc-gray-200)",
        background: active ? "var(--wc-blue-600)" : "#fff",
        color: active ? "#fff" : "var(--wc-gray-500)",
        fontSize: "13px", fontWeight: 700,
        cursor: "pointer",
        transition: "all var(--duration-base) var(--ease-out)",
        boxShadow: active ? "var(--shadow-brand)" : "none",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </button>
  );
}

// ── Select Field ──────────────────────────────────────────────────────────────

function SelectField({
  id, label, options, defaultValue,
}: {
  id: string; label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "14px", fontWeight: 600, color: "var(--wc-gray-700)" }}>
        {label}
      </label>
      <select
        id={id} name={id}
        defaultValue={defaultValue}
        className="wc-input"
        style={{ width: "100%", height: "42px", fontSize: "14px", cursor: "pointer" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Time Field ────────────────────────────────────────────────────────────────

function TimeField({ id, label, defaultValue }: { id: string; label: string; defaultValue?: string }): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "14px", fontWeight: 600, color: "var(--wc-gray-700)" }}>
        {label}
      </label>
      <input
        id={id} name={id} type="time"
        defaultValue={defaultValue}
        className="wc-input"
        style={{ width: "100%", height: "42px", fontSize: "14px" }}
      />
    </div>
  );
}

// ── Number Field ──────────────────────────────────────────────────────────────

function NumberField({ id, label, defaultValue, min, max }: { id: string; label: string; defaultValue?: number; min?: number; max?: number }): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "14px", fontWeight: 600, color: "var(--wc-gray-700)" }}>
        {label}
      </label>
      <input
        id={id} name={id} type="number"
        defaultValue={defaultValue}
        min={min} max={max}
        className="wc-input"
        style={{ width: "100%", height: "42px", fontSize: "14px" }}
      />
    </div>
  );
}

// ── Clinic Schedule Panel ─────────────────────────────────────────────────────

interface ClinicScheduleProps {
  activeDays?:    string[];
  startTime?:     string;
  endTime?:       string;
  breakStart?:    string;
  breakEnd?:      string;
  slotDuration?:  string;
  maxPatients?:   number;
  preferredHmo?:  string;
  status?:        string;
}

export default function ClinicSchedule({
  activeDays   = ["mon", "tue", "wed", "thu", "fri"],
  startTime    = "08:00",
  endTime      = "17:00",
  breakStart   = "12:00",
  breakEnd     = "13:00",
  slotDuration = "30",
  maxPatients  = 20,
  preferredHmo = "hmo",
  status       = "active",
}: ClinicScheduleProps): ReactElement {
  const s = clinicScheduleStrings;
  const [days, setDays] = useState<string[]>(activeDays);
  const [saved, setSaved] = useState(false);

  const toggleDay = (d: string) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout activeId="settings">
      <Head title="Clinic Schedule" />

      <div style={{ padding: "var(--space-8) var(--space-10)" }}>
        
        {/* ── Page Header ── */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--wc-dark)" }}>Settings</h2>
          <p style={{ color: "var(--wc-gray-500)" }}>Manage your account and clinic preferences</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--space-8)", alignItems: "start" }}>
          
          {/* ── Sidebar Nav ── */}
          <SettingsNav tabs={doctorTabs} activeHref="/settings/clinic-schedule" />

          {/* ── Main Content Panel (Matches Profile Information card) ── */}
          <div style={{ 
            background: "#fff", 
            padding: "var(--space-8)", 
            borderRadius: "var(--radius-3xl)",
            border: "1px solid var(--wc-gray-100)",
            boxShadow: "var(--shadow-sm)",
            maxWidth: "800px", // Limits the width to prevent stretching
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

              {/* ── Availability status ─────────────────────────────────────────── */}
              <div style={{
                background: "var(--wc-gray-50)", borderRadius: "var(--radius-2xl)",
                padding: "var(--space-5) var(--space-6)", border: "1px solid var(--wc-gray-200)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: "var(--space-4)",
              }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--wc-dark)" }}>
                    {s.statusLabel}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-500)" }}>
                    Controls your visibility in the scheduling system
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {s.statusOptions.map(opt => {
                    const isActive = status === opt.value;
                    const colors: Record<string, string> = {
                      active: "var(--wc-blue-600)",
                      on_leave: "#ca8a04",
                      unavailable: "var(--wc-error)",
                    };
                    return (
                      <span
                        key={opt.value}
                        style={{
                          padding: "6px 14px", borderRadius: "var(--radius-full)",
                          fontSize: "12px", fontWeight: 700,
                          background: isActive ? colors[opt.value] : "transparent",
                          color: isActive ? "#fff" : "var(--wc-gray-400)",
                          border: isActive ? "none" : "1px solid var(--wc-gray-200)",
                          transition: "all var(--duration-base) var(--ease-out)",
                        }}
                      >
                        {opt.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* ── Working days ────────────────────────────────────────────────── */}
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--wc-gray-700)" }}>
                  {s.daysLabel}
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {s.days.map(d => (
                    <DayToggle
                      key={d.value}
                      value={d.value}
                      label={d.label}
                      active={days.includes(d.value)}
                      onToggle={toggleDay}
                    />
                  ))}
                </div>
              </div>

              {/* ── Time + slot grid (2 Columns) ─────────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <TimeField id="start_time"   label={s.startTimeLabel}  defaultValue={startTime} />
                <TimeField id="end_time"     label={s.endTimeLabel}    defaultValue={endTime} />
                <TimeField id="break_start"  label={s.breakStartLabel} defaultValue={breakStart} />
                <TimeField id="break_end"    label={s.breakEndLabel}   defaultValue={breakEnd} />
                <SelectField id="slot_duration" label={s.slotDurationLabel} options={s.slotOptions} defaultValue={slotDuration} />
                <NumberField id="max_patients"  label={s.maxPatientsLabel}  defaultValue={maxPatients} min={1} max={100} />
              </div>

              {/* ── HMO / Payment preference ────────────────────────────────────── */}
              <div style={{ maxWidth: "300px" }}>
                <SelectField id="preferred_hmo" label={s.preferredHmoLabel} options={s.hmoOptions} defaultValue={preferredHmo} />
              </div>

              {/* ── Action Area ─────────────────────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingTop: "var(--space-6)", borderTop: "1px solid var(--wc-gray-100)" }}>
                <button type="button" onClick={handleSave} className="wc-btn wc-btn-primary wc-btn-md" style={{ padding: "0 24px", height: "44px" }}>
                  {s.saveLabel}
                </button>
                {saved && (
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Schedule saved successfully!
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}