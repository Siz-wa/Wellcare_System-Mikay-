import { WellcareLogo } from "@/design-system/components/navbar";
import { registerBrandData, onboardingSteps } from "./register-data";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface RegisterBrandPanelProps {
  currentStep: number;
}

export default function RegisterBrandPanel({ currentStep }: RegisterBrandPanelProps) {
  const { pill, heading, desc, copyright, benefits } = registerBrandData;

  return (
    <div
      className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--wc-blue-900) 0%, var(--wc-blue-700) 55%, var(--wc-blue-600) 100%)",
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(0,168,232,0.2) 0%, transparent 55%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ border: "2px solid var(--wc-white)" }} />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10" style={{ border: "2px solid var(--wc-white)" }} />

      {/* Logo */}
      <div className="relative z-10">
        <WellcareLogo dark />
      </div>

      {/* Centre content */}
      <div className="relative z-10">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-[var(--tracking-widest)] uppercase mb-6"
          style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.25)" }}
        >
          {pill}
        </span>

        {/* Heading — inline style overrides base.css h2 global */}
        <h2
          className="text-[clamp(2rem,3.5vw,2.75rem)] leading-tight mb-5 tracking-[-0.03em]"
          style={{ color: "#ffffff", fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          {heading.line1}<br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--wc-sky-400), #ffffff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {heading.line2}
          </span>
        </h2>

        {/* Desc — inline style overrides base.css p global */}
        <p className="text-base leading-relaxed mb-10 max-w-[340px]" style={{ color: "rgba(255,255,255,0.70)" }}>
          {desc}
        </p>

        {/* Step progress */}
        <div className="flex flex-col gap-3 mb-10">
          {onboardingSteps.map((step) => {
            const isDone    = step.id < currentStep;
            const isActive  = step.id === currentStep;
            return (
              <div key={step.id} className="flex items-center gap-3">
                {/* Step indicator */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-300"
                  style={{
                    background: isDone
                      ? "var(--wc-sky-500)"
                      : isActive
                        ? "#ffffff"
                        : "rgba(255,255,255,0.15)",
                    color: isDone
                      ? "#ffffff"
                      : isActive
                        ? "var(--wc-blue-700)"
                        : "rgba(255,255,255,0.5)",
                  }}
                >
                  {isDone ? <CheckIcon /> : step.id}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="flex flex-col gap-2">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2">
              <span style={{ color: "var(--wc-sky-400)" }}><CheckIcon /></span>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <p className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        {copyright}
      </p>
    </div>
  );
}