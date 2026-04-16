// resources/js/pages/hr/hmo-applications/components/applications-table.tsx
import { useState, type ReactElement } from "react";
import type { HmoApplication, LoaStatus } from "../../hr-data";
import { hrMeta }                         from "../../hr-data";
import { LoaReviewModal }                 from "./loa-review-modal";

// ── Icons ─────────────────────────────────────────────────────────────────────

const SearchIcon = (): ReactElement => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const EyeIcon = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<LoaStatus, { bg: string; color: string; border: string; label: string }> = {
  pending:  { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "PENDING"  },
  approved: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "APPROVED" },
  rejected: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "REJECTED" },
};

type FilterTab = "all" | LoaStatus;

interface Props {
  applications: HmoApplication[];
  visible:      boolean;
}

export function ApplicationsTable({ applications, visible }: Props): ReactElement {
  const [activeFilter,  setActiveFilter]  = useState<FilterTab>("all");
  const [query,         setQuery]         = useState("");
  const [selectedApp,   setSelectedApp]   = useState<HmoApplication | null>(null);
  const [apps,          setApps]          = useState(applications);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: `All (${apps.length})`                                 },
    { key: "pending",  label: `Pending (${apps.filter(a => a.status === "pending").length})`  },
    { key: "approved", label: `Approved (${apps.filter(a => a.status === "approved").length})` },
    { key: "rejected", label: `Rejected (${apps.filter(a => a.status === "rejected").length})` },
  ];

  const filtered = apps.filter(a => {
    const matchTab   = activeFilter === "all" || a.status === activeFilter;
    const matchQuery = !query.trim() ||
      a.patientName.toLowerCase().includes(query.toLowerCase()) ||
      a.hmoProvider.toLowerCase().includes(query.toLowerCase()) ||
      a.doctor.toLowerCase().includes(query.toLowerCase());
    return matchTab && matchQuery;
  });

  const handleApprove = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "approved" as LoaStatus, loaNumber: `LOA-2026-${Math.floor(1000 + Math.random() * 9000)}`, approvedBy: hrMeta.userName } : a));
  };

  const handleReject = (id: string, reason: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" as LoaStatus, rejectedReason: reason } : a));
  };

  const AVATAR_COLORS = ["#0056b3", "#7c3aed", "#16a34a", "#ca8a04", "#0284c7", "#c2410c"];

  return (
    <>
      <div style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 80ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 80ms",
      }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: "var(--space-4)" }}>
          <span style={{ position: "absolute", left: "var(--space-4)", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex", pointerEvents: "none" }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            className="wc-input"
            placeholder={hrMeta.searchPlaceholder2}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: "calc(var(--space-4) + 22px)", fontSize: "var(--text-sm)", background: "var(--wc-white)", border: "1px solid var(--wc-gray-200)" }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding:      "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-full)",
                border:       activeFilter === tab.key ? "none" : "1px solid var(--wc-gray-200)",
                background:   activeFilter === tab.key ? "var(--wc-blue-600)" : "var(--wc-white)",
                color:        activeFilter === tab.key ? "#fff" : "#64748b",
                fontSize:     "var(--text-sm)",
                fontWeight:   activeFilter === tab.key ? 700 : 500,
                cursor:       "pointer",
                transition:   "all 150ms ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="wc-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.4fr 1fr 100px 100px", gap: "var(--space-4)", padding: "var(--space-4) var(--space-6)", background: "var(--wc-gray-50)", borderBottom: "1px solid var(--wc-gray-200)" }}>
            {["Patient", "HMO Provider", "Doctor / Specialty", "Submitted", "Status", "Action"].map(h => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "var(--text-sm)" }}>
                {activeFilter === "all" ? hrMeta.emptyAll : hrMeta.emptyPending}
              </p>
            </div>
          ) : (
            filtered.map((app, i) => {
              const cfg = STATUS_CFG[app.status];
              return (
                <div
                  key={app.id}
                  style={{
                    display:      "grid",
                    gridTemplateColumns: "2fr 1.2fr 1.4fr 1fr 100px 100px",
                    gap:          "var(--space-4)",
                    padding:      "var(--space-4) var(--space-6)",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--wc-gray-100)" : "none",
                    alignItems:   "center",
                    transition:   "background 150ms ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--wc-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Patient */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0 }}>
                      {app.initials}
                    </div>
                    <div>
                      <p style={{ margin: "0 0 1px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a" }}>
                        {app.patientName}
                      </p>
                      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>
                        {app.patientNumber}
                      </p>
                    </div>
                  </div>

                  {/* HMO */}
                  <div>
                    <p style={{ margin: "0 0 1px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a" }}>
                      {app.hmoProvider}
                    </p>
                    <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>
                      {app.hmoCardNumber}
                    </p>
                  </div>

                  {/* Doctor */}
                  <div>
                    <p style={{ margin: "0 0 1px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {app.doctor}
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>
                      {app.specialty}
                    </p>
                  </div>

                  {/* Submitted */}
                  <span style={{ fontSize: "var(--text-xs)", color: "#64748b" }}>
                    {app.submittedDate}
                  </span>

                  {/* Status badge */}
                  <span style={{ display: "inline-flex", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-lg)", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {cfg.label}
                  </span>

                  {/* Action */}
                  <button
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    style={{
                      display:      "inline-flex",
                      alignItems:   "center",
                      gap:          "var(--space-1)",
                      padding:      "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-lg)",
                      border:       `1px solid ${app.status === "pending" ? "var(--wc-blue-200)" : "var(--wc-gray-200)"}`,
                      background:   app.status === "pending" ? "var(--wc-blue-50)" : "var(--wc-white)",
                      color:        app.status === "pending" ? "var(--wc-blue-600)" : "#64748b",
                      fontSize:     "var(--text-xs)",
                      fontWeight:   700,
                      cursor:       "pointer",
                      transition:   "all 150ms ease",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = app.status === "pending" ? "var(--wc-blue-100)" : "var(--wc-gray-100)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = app.status === "pending" ? "var(--wc-blue-50)" : "var(--wc-white)"; }}
                  >
                    <EyeIcon />
                    {app.status === "pending" ? hrMeta.reviewLabel : hrMeta.viewLabel}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Review modal */}
      {selectedApp && (
        <LoaReviewModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}