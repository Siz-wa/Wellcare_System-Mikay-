// resources/js/pages/user/doctors/sections/DoctorsGridSection.tsx
import { useState, useMemo } from "react";
import { Link } from "@inertiajs/react";
import { useInView } from "@/hooks/useInView";
import { doctorsData, specialties } from "./doctors-data";
import type { Specialty } from "./doctors-data";
import SearchInput from "@/design-system/components/search-input";
import { index as bookIndex } from "@/routes/book"; 

// ─── Icons ────────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function DoctorsGridSection() {
  const { ref, inView } = useInView();
  const [activeSpecialty, setActiveSpecialty] = useState<Specialty>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return doctorsData.filter((d) => {
      const matchesSpecialty = activeSpecialty === "All" || d.specialty === activeSpecialty;
      const matchesSearch =
        search.trim() === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase());
      return matchesSpecialty && matchesSearch;
    });
  }, [activeSpecialty, search]);

  function getBookHref(id: string): string {
  if (id === 'reliever-inhouse') return `${bookIndex.url()}?service=inhouse`;
  return `${bookIndex.url()}?doctor=${id}`;
}

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">

        {/* ── Controls: search + filter ── */}
        <div
          ref={ref}
          className="mb-10 transition-all duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(16px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          {/* Search bar */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or specialization…"
            className="mb-6"
          />

          {/* Specialty filter pills */}
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => {
              const isActive = activeSpecialty === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSpecialty(s)}
                  className="px-4 py-2 rounded-[var(--radius-full)] text-sm font-semibold transition-all duration-[var(--duration-base)]"
                  style={{
                    background: isActive ? "var(--wc-blue-600)" : "var(--wc-white)",
                    color: isActive ? "#ffffff" : "var(--wc-gray-600)",
                    border: `1.5px solid ${isActive ? "var(--wc-blue-600)" : "var(--wc-gray-200)"}`,
                    boxShadow: isActive ? "var(--shadow-brand)" : "var(--shadow-sm)",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Result count ── */}
        <p className="text-sm font-medium mb-8" style={{ color: "var(--wc-gray-400)" }}>
          Showing {filtered.length} doctor{filtered.length !== 1 ? "s" : ""}
          {activeSpecialty !== "All" ? ` in ${activeSpecialty}` : ""}
          {search.trim() !== "" ? ` matching "${search}"` : ""}
        </p>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg" style={{ color: "var(--wc-gray-400)" }}>
              No doctors found. Try a different search or filter.
            </p>
          </div>
        )}

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className="wc-card wc-card-hover flex flex-col transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${Math.min(i * 50, 400)}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body flex flex-col flex-1 gap-0">

                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-display font-extrabold text-xl mb-4 shadow-[var(--shadow-md)] flex-shrink-0"
                  style={{ background: doc.color, color: "#ffffff" }}
                >
                  {doc.initials}
                </div>

                {/* Specialization label */}
                <p
                  className="text-[10px] font-bold uppercase tracking-[var(--tracking-widest)] mb-1"
                  style={{ color: doc.color }}
                >
                  {doc.specialization}
                </p>

                {/* Name */}
                <h3 className="text-sm mb-4 leading-snug">{doc.name}</h3>

                {/* Schedules */}
                <div className="flex flex-col gap-2 flex-1 mb-5">
                  {doc.schedules.map((sched, si) => (
                    <div
                      key={si}
                      className="rounded-[var(--radius-lg)] px-3 py-2"
                      style={{ background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: "var(--wc-blue-600)" }}
                        >
                          <CalendarIcon />
                        </span>
                        <div>
                          <p
                            className="text-xs font-semibold leading-tight"
                            style={{ color: "var(--wc-gray-700)" }}
                          >
                            {sched.days}
                          </p>
                          <p
                            className="text-xs leading-tight mt-0.5"
                            style={{ color: "var(--wc-gray-400)" }}
                          >
                            {sched.hours}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Book button */}
                <Link
                  href={getBookHref(doc.id)}
                  className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill w-full justify-center mt-auto"
                >
                  Book Appointment <ArrowRight />
                </Link>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}