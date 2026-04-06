// resources/js/components/UnderConstruction.tsx
// Drop this into any page that isn't built yet.
//
// Usage:
//   import UnderConstruction from "@/components/UnderConstruction";
//   export default function SomePage() {
//     return <UnderConstruction title="Page Title" />;
//   }
import { LogOut, Settings } from 'lucide-react'
import WellcareLayout from "@/layouts/app-gen-layout";
import { Link, router, usePage } from "@inertiajs/react";
import type { NavLabel } from "@/design-system/components/navbar";
import {logout, contact, home} from "@/routes";
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import type { PageProps } from '@/types';

function LogoutOrContact({ size = "md" }: { size?: "md" | "lg" }) {
  const { auth } = usePage<PageProps>().props;
  const isAuthenticated = !!auth?.user;

  return (
    <Link
      href={isAuthenticated ? logout() : contact.url()}
      className={`wc-btn wc-btn-outline wc-btn-${size} wc-btn-pill`}
    >
      {isAuthenticated ? "Log Out" : "Contact"}
    </Link>
  );
}


// ─── Props ────────────────────────────────────────────────────────────────────
interface UnderConstructionProps {
  title: string;
  description?: string;
  activeNav?: NavLabel;
  eta?: string;
}

// ─── Mascot — cute construction worker robot doctor ───────────────────────────
const Mascot = () => (
  <svg
    width="220"
    height="220"
    viewBox="0 0 220 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* ── Shadow ── */}
    <ellipse cx="110" cy="205" rx="50" ry="8" fill="var(--wc-gray-200)" />

    {/* ── Hard hat ── */}
    <ellipse cx="110" cy="62" rx="46" ry="10" fill="#ca8a04" />
    <rect x="72" y="38" width="76" height="30" rx="38" fill="#ca8a04" />
    <rect x="85" y="44" width="50" height="18" rx="9" fill="#fef3c7" />
    {/* Hat brim stripe */}
    <rect x="64" y="60" width="84" height="7" rx="3.5" fill="#a16207" />
    {/* Cross on hat */}
    <rect x="107" y="47" width="6" height="18" rx="3" fill="#dc2626" />
    <rect x="100" y="54" width="20" height="6" rx="3" fill="#dc2626" />

    {/* ── Head ── */}
    <rect x="72" y="68" width="76" height="72" rx="20" fill="var(--wc-white)" stroke="var(--wc-gray-200)" strokeWidth="2" />

    {/* ── Eyes ── */}
    {/* Left eye */}
    <circle cx="93" cy="95" r="13" fill="var(--wc-blue-50)" stroke="var(--wc-blue-200)" strokeWidth="2" />
    <circle cx="93" cy="95" r="7" fill="var(--wc-blue-600)" />
    <circle cx="96" cy="92" r="2.5" fill="white" />
    {/* Right eye */}
    <circle cx="127" cy="95" r="13" fill="var(--wc-blue-50)" stroke="var(--wc-blue-200)" strokeWidth="2" />
    <circle cx="127" cy="95" r="7" fill="var(--wc-blue-600)" />
    <circle cx="130" cy="92" r="2.5" fill="white" />

    {/* ── Blush ── */}
    <ellipse cx="82" cy="116" rx="9" ry="5" fill="#fca5a5" opacity="0.5" />
    <ellipse cx="138" cy="116" rx="9" ry="5" fill="#fca5a5" opacity="0.5" />

    {/* ── Smile ── */}
    <path d="M97 120 Q110 132 123 120" stroke="var(--wc-gray-400)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* ── Ears / side bolts ── */}
    <rect x="62" y="88" width="12" height="20" rx="6" fill="var(--wc-gray-200)" stroke="var(--wc-gray-300)" strokeWidth="1.5" />
    <rect x="146" y="88" width="12" height="20" rx="6" fill="var(--wc-gray-200)" stroke="var(--wc-gray-300)" strokeWidth="1.5" />

    {/* ── Neck ── */}
    <rect x="100" y="138" width="20" height="14" rx="4" fill="var(--wc-gray-200)" />

    {/* ── Body — doctor coat ── */}
    <rect x="65" y="150" width="90" height="52" rx="16" fill="var(--wc-white)" stroke="var(--wc-gray-200)" strokeWidth="2" />
    {/* Coat lapels */}
    <path d="M110 155 L92 175 L100 175 L110 165 L120 175 L128 175 Z" fill="var(--wc-blue-50)" stroke="var(--wc-blue-100)" strokeWidth="1" />
    {/* Stethoscope */}
    <path d="M93 168 Q88 178 92 185 Q96 192 103 190" stroke="var(--wc-sky-500)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <circle cx="103" cy="191" r="4" fill="var(--wc-sky-500)" />
    {/* Pocket */}
    <rect x="118" y="165" width="22" height="16" rx="4" fill="var(--wc-blue-50)" stroke="var(--wc-blue-100)" strokeWidth="1.5" />
    {/* Pen in pocket */}
    <rect x="122" y="162" width="3" height="12" rx="1.5" fill="var(--wc-blue-600)" />
    <rect x="127" y="162" width="3" height="10" rx="1.5" fill="#dc2626" />

    {/* ── Arms ── */}
    {/* Left arm holding wrench */}
    <rect x="42" y="152" width="24" height="44" rx="12" fill="var(--wc-white)" stroke="var(--wc-gray-200)" strokeWidth="2" />
    {/* Wrench */}
    <rect x="28" y="148" width="22" height="7" rx="3.5" fill="#94a3b8" transform="rotate(-30 28 148)" />
    <circle cx="30" cy="147" r="6" fill="none" stroke="#94a3b8" strokeWidth="4" />
    {/* Right arm waving */}
    <rect x="154" y="152" width="24" height="44" rx="12" fill="var(--wc-white)" stroke="var(--wc-gray-200)" strokeWidth="2" transform="rotate(-15 154 152)" />

    {/* ── Legs ── */}
    <rect x="83" y="198" width="20" height="12" rx="6" fill="var(--wc-blue-600)" />
    <rect x="117" y="198" width="20" height="12" rx="6" fill="var(--wc-blue-600)" />

    {/* ── Floating stars / sparkles ── */}
    <text x="155" y="55" fontSize="16" fill="#ca8a04" opacity="0.8">✦</text>
    <text x="45" y="75" fontSize="12" fill="var(--wc-sky-400)" opacity="0.7">✦</text>
    <text x="168" y="100" fontSize="10" fill="#fca5a5" opacity="0.8">✦</text>
    <text x="38" y="130" fontSize="8" fill="var(--wc-blue-300)" opacity="0.6">✦</text>
  </svg>
);

// ─── Arrow left icon ──────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function UnderConstruction({
  title,
  description,
  activeNav,
  eta,
}: UnderConstructionProps) {
const cleanup = useMobileNavigation();
  const handleLogout = () => {
        cleanup();
        router.flushAll();
    };
  
  return (
    <WellcareLayout activeNav={activeNav}>
      <section className="wc-section">
        <div className="wc-container max-w-[560px] mx-auto text-center">

          {/* Mascot */}
          <div className="flex justify-center mb-2">
            <Mascot />
          </div>

          {/* Badge */}
          <span className="wc-badge wc-badge-warning mb-5 inline-flex">
            Under Construction
          </span>

          {/* Heading */}
          <h1 className="text-[clamp(1.875rem,4vw,2.25rem)] mb-4">
            {title}
          </h1>

          {/* Description */}
          <p
            className="text-lg leading-relaxed mb-6"
            style={{ color: "var(--wc-gray-500)" }}
          >
            {description ?? "This page is currently being built. Check back soon — we're working on it!"}
          </p>

          {/* ETA */}
          {eta && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-sm font-semibold mb-6"
              style={{
                background: "var(--wc-blue-50)",
                color: "var(--wc-blue-700)",
                border: "1.5px solid var(--wc-blue-100)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {eta}
            </div>
          )}

          <hr className="wc-divider mb-8" />

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={home.url()} className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill">
              <ArrowLeftIcon /> Back to Home
            </Link>
             <LogoutOrContact size='lg'/>
          </div>

        </div>
      </section>
    </WellcareLayout>
  );
}