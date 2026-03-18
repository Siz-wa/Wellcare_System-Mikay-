import type { ReactNode } from "react";
import Navbar, { type NavLabel } from "@/design-system/components/navbar";
import Footer from "@/design-system/components/footer";

// ─── Styles ───────────────────────────────────────────────────────────────────
// resources/css/app.css already imports tokens → base → components.
// No inline styles or <style> tags needed anywhere in this tree.

// ─── Props ────────────────────────────────────────────────────────────────────
interface WellcareLayoutProps {
  children: ReactNode;
  /** Must match one of the nav link labels defined in Navbar.tsx */
  activeNav?: NavLabel;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function WellcareLayout({
  children,
  activeNav = "Home",
}: WellcareLayoutProps) {
  return (
    // .wc-page → min-height: 100vh, flex-col, padding-top: var(--header-height)
    <div className="wc-page">
      <Navbar active={activeNav} />

      {/* .wc-page__content → flex: 1 so footer always sticks to bottom */}
      <main className="wc-page__content">
        {children}
      </main>

      <Footer />
    </div>
  );
}

// ─── Usage ────────────────────────────────────────────────────────────────────
//
// Placed at:  resources/js/layouts/WellcareLayout.tsx
// Navbar   →  resources/js/layouts/Navbar.tsx
// Footer   →  resources/js/layouts/Footer.tsx
//
// In any page file:
//
//   import WellcareLayout from "@/layouts/WellcareLayout";
//
//   export default function ServicesPage() {
//     return (
//       <WellcareLayout activeNav="Services">
//         <section className="wc-section wc-container">
//           …page content…
//         </section>
//       </WellcareLayout>
//     );
//   }