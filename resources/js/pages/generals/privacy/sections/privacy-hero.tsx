// resources/js/pages/user/privacy/sections/PrivacyHeroSection.tsx

import { useInView } from "@/hooks/useInView";
import { privacyHeroData } from "@/pages/generals/privacy/sections/privacy-data";

export default function PrivacyHeroSection() {
    const { ref, inView } = useInView();
    const { pill, heading, body, lastUpdated } = privacyHeroData;

    return (
        <section className="wc-section">
            <div className="wc-container">
                <div
                    ref={ref}
                    className="max-w-[680px] transition-all duration-700"
                    style={{
                        opacity: inView ? 1 : 0,
                        transform: inView ? "translateY(0)" : "translateY(20px)",
                        transitionTimingFunction: "var(--ease-out)",
                    }}
                >
                    <span className="wc-pill wc-pill-primary mb-4 inline-block">{pill}</span>
                    <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] mb-5">
                        {heading.plain}{" "}
                        <span className="wc-gradient-text">{heading.gradient}</span>
                    </h1>
                    <p className="text-lg leading-relaxed mb-4">{body}</p>
                    <span className="wc-badge wc-badge-neutral text-xs">{lastUpdated}</span>
                </div>
            </div>
        </section>
    );
}