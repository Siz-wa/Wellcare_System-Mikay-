// resources/js/pages/user/home/sections/DoctorsSection.tsx
import { useInView } from "@/hooks/useInView";
import { doctorsData } from "@/pages/generals/home/sections/homedata";

export default function DoctorsSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, viewAllHref, doctors } = doctorsData;

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">

        {/* Header */}
        <div
          ref={ref}
          className="text-center max-w-[640px] mx-auto mb-12 transition-all duration-600"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <span className="wc-pill wc-pill-primary">{pill}</span>
          <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
            {heading.plain}<span className="wc-gradient-text">{heading.gradient}</span>
          </h2>
          <p className="text-lg text-[var(--wc-gray-500)] leading-relaxed">{desc}</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {doctors.map((doc, i) => (
            <div
              key={doc.name}
              className="wc-card wc-card-hover transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${100 + i * 90}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-display font-extrabold text-xl text-white mx-auto mb-4 shadow-[var(--shadow-lg)]"
                  style={{ background: doc.color }}
                >
                  {doc.initials}
                </div>
                <h3 className="text-base text-[var(--wc-dark)] mb-1">{doc.name}</h3>
                <p className="text-sm text-[var(--wc-gray-400)] mb-5">{doc.specialty}</p>
                <div className="flex items-center justify-between">
                  <span className="wc-badge wc-badge-primary">Available</span>
                  <a href="/book" className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill">Book</a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View all */}
        <div className="text-center">
          <a href={viewAllHref} className="wc-btn wc-btn-ghost wc-btn-md">
            View all specialists →
          </a>
        </div>

      </div>
    </section>
  );
}