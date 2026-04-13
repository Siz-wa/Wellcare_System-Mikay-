// resources/js/pages/user/dashboard/components/stat-cards.tsx
import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedValue } from "@/hooks/use-animated-value";
import { statCards } from "../dashboard-data";
import { StatIcon } from "../icons";

export function StatCards(): ReactElement {
  const { ref, inView } = useInView(0.2);

  return (
    <div
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "24px",
        marginBottom: "24px"
      }}
    >
      {statCards.map((stat) => {
        const animatedValue = useAnimatedValue(stat.target, inView, {
          duration: 1200,
          decimals: 0,
        });

        return (
          <div
            key={stat.id}
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "32px",
              border: "1px solid #e3e3e3",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              {/* Studio Icon Block */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: stat.iconBg,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#ffffff"
                }}
              >
                <StatIcon iconKey={stat.iconKey} />
              </div>

              {/* Studio Delta Label (Graph arrow + percent) */}
              <div
                style={{
                  color: stat.positive ? "#10b981" : "#ef4444",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: stat.positive ? 'none' : 'rotate(180deg)' }}>
                   <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                   <polyline points="17 6 23 6 23 12"></polyline>
                 </svg>
                {stat.delta}
              </div>
            </div>

            {/* Typography matches Studio exactly */}
            <p style={{
              marginTop: "24px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#70757a",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "24px 0 6px 0"
            }}>
              {stat.label}
            </p>

            <p style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#1f1f1f",
            }}>
              {animatedValue} <span style={{fontSize: "10px", fontWeight: 700, color: "#70757a", textTransform: "uppercase", letterSpacing: "0.1em", verticalAlign: "middle", marginLeft: "6px"}}>UNITS</span>
            </p>

            {/* Studio Progress Bar */}
            <div style={{
              marginTop: "24px",
              height: 6,
              backgroundColor: "#f1f3f4",
              borderRadius: 9999,
              overflow: "hidden",
            }}>
              <div style={{
                width: stat.positive ? "75%" : "40%",
                height: "100%",
                backgroundColor: stat.iconBg,
                borderRadius: 9999,
                transition: "width 1200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}