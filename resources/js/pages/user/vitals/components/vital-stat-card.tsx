// resources/js/pages/patient/vitals/components/vital-stat-card.tsx
import type { ReactElement } from "react";
import type { VitalCard }    from "../../patient-data";

const VitalIcons: Record<string, ReactElement> = {
  heart:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  scale:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="14.5" y2="14.5"/></svg>,
  ruler:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.3 15.3l-5-5L14.7 11.9l2.2 2.2-1.4 1.4-2.2-2.2-1.4 1.4 2.2 2.2-1.4 1.4-2.2-2.2-1.4 1.4 2.2 2.2-3.7 3.7c-.4.4-1 .4-1.4 0l-7.1-7.1c-.4-.4-.4-1 0-1.4l15-15c.4-.4 1-.4 1.4 0l1 1c.4.4.4 1 0 1.4l-1.6 1.6 1.4 1.4 1.6-1.6c.4-.4 1-.4 1.4 0l1 1c.4.4.4 1 0 1.4l-1.6 1.6 1.4 1.4 1.6-1.6c.4-.4 1-.4 1.4 0l.9.9c.5.4.5 1.1.1 1.5z"/></svg>,
  activity: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

/**
 * Updated TrendIcon to handle optional trend prop
 */
function TrendIcon({ trend }: { trend?: "up" | "down" | "stable" }) {
  if (!trend) return null;
  if (trend === "up") return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  if (trend === "down") return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

interface Props { vital: VitalCard; visible: boolean; index: number; }

export function VitalStatCard({ vital, visible, index }: Props): ReactElement {
  const trendBg    = vital.trend === "up" ? "rgba(22, 163, 74, 0.1)" : vital.trend === "down" ? "rgba(220, 38, 38, 0.1)" : "rgba(100, 116, 139, 0.1)";
  const trendColor = vital.trend === "up" ? "#16a34a" : vital.trend === "down" ? "#dc2626" : "#64748b";

  return (
    <div className="wc-card" style={{
      padding: "var(--space-6)",
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 400ms cubic-bezier(0.16,1,0.3,1) ${100 + index * 60}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${100 + index * 60}ms`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ 
          width: 56, height: 56, backgroundColor: vital.colorAccent, 
          borderRadius: 16, display: "flex", alignItems: "center", 
          justifyContent: "center", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", 
          flexShrink: 0, color: "#fff" 
        }}>
          {VitalIcons[vital.icon]}
        </div>
        
        {/* Guarding both trendLabel and trend to prevent type errors */}
        {vital.trendLabel && vital.trend && (
          <div style={{ 
            backgroundColor: trendBg, color: trendColor, fontSize: "12px", 
            fontWeight: 700, padding: "5px 12px", borderRadius: 9999, 
            display: "inline-flex", alignItems: "center", gap: "4px" 
          }}>
            <TrendIcon trend={vital.trend} />
            {vital.trendLabel}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "28px" }}>
        <span style={{ fontSize: "32px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: "#1e2937" }}>
          {vital.value}
        </span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "#94a3b8" }}>
          {vital.unit}
        </span>
      </div>
    </div>
  );
}