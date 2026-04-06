// resources/js/layouts/WellcareLayout.tsx
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { router } from "@inertiajs/react";
import Navbar, { type NavLabel } from "@/design-system/components/navbar";
import Footer from "@/design-system/components/footer";

// ─── Styles ───────────────────────────────────────────────────────────────────
// resources/css/app.css already imports tokens → base → components.

// ─── Page Progress Bar ────────────────────────────────────────────────────────
// Listens to Inertia router events and animates a thin loading bar at the
// very top of the page on every navigation. No external library needed.
function PageProgressBar() {
  const [visible,  setVisible]  = useState(false);
  const [width,    setWidth]    = useState(0);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const fakeRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fakeRef.current)  clearInterval(fakeRef.current);
  };

  const start = () => {
    clear();
    setComplete(false);
    setWidth(0);
    setVisible(true);

    // Fake crawl to ~85% — slows down as it approaches the limit
    let current = 0;
    fakeRef.current = setInterval(() => {
      const step = current < 30 ? 8
                 : current < 60 ? 4
                 : current < 80 ? 1.5
                 : 0.3;
      current = Math.min(current + step, 85);
      setWidth(current);
    }, 100);
  };

  const finish = () => {
    clear();
    setWidth(100);
    setComplete(true);
    // Hide after the fill animation completes
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
      setComplete(false);
    }, 400);
  };

  useEffect(() => {
    const offStart  = router.on("start",  start);
    const offFinish = router.on("finish", finish);
    return () => {
      offStart();
      offFinish();
      clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position:     "fixed",
        top:          0,
        left:         0,
        zIndex:       "var(--z-toast)" as unknown as number,
        width:        `${width}%`,
        height:       "3px",
        background:   "linear-gradient(90deg, var(--wc-blue-600), var(--wc-sky-500))",
        boxShadow:    "0 0 8px rgba(0, 168, 232, 0.6)",
        borderRadius: "0 2px 2px 0",
        // Smooth crawl during load; instant snap to 100 on finish
        transition:   complete
          ? "width 200ms var(--ease-out)"
          : "width 100ms linear",
      }}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface WellcareLayoutProps {
  children:   ReactNode;
  /** Must match one of the nav link labels defined in Navbar.tsx */
  activeNav?: NavLabel;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function WellcareLayout({
  children,
  activeNav,
}: WellcareLayoutProps) {
  return (
    <>
      {/* Mounts once — listens to all Inertia navigations automatically */}
      <PageProgressBar />

      {/* .wc-page → min-height: 100vh, flex-col, padding-top: var(--header-height) */}
      <div className="wc-page">
        <Navbar active={activeNav} />

        {/* .wc-page__content → flex: 1 so footer always sticks to bottom */}
        <main className="wc-page__content">
          {children}
        </main>

        <Footer />
      </div>
    </>
  );
}