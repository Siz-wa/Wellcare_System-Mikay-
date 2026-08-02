// resources/js/layouts/Navbar.tsx
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { NotificationBell } from '@/design-system/components/notification-bell';
import {
    home,
    about,
    services,
    doctors,
    contact,
    faqs,
    login,
    book,
} from '@/routes';
import { dashboard as patientDashboard } from '@/routes/user';
import type { PageProps } from '@/types';

// ─── Logo ─────────────────────────────────────────────────────────────────────

interface WellcareLogoProps {
    dark?: boolean;
}

export function WellcareLogo({ dark = false }: WellcareLogoProps) {
    return (
        <Link
            href={home.url()}
            className="wc-logo"
            aria-label="Wellcare Clinics — Home"
        >
            <div className="wc-logo__icon">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="371 196 647 635"
                    width="26"
                    height="26"
                    xmlSpace="preserve"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        fill="#ffffff"
                        opacity="1"
                        stroke="none"
                        d="M828.197815,532.614258 C821.634338,532.046509 815.501526,531.171692 809.363892,531.137268 C762.866455,530.877075 716.367981,530.781494 669.869873,530.635620 C668.061218,530.629944 666.252563,530.634888 663.757751,530.634888 C663.757751,528.342102 663.756470,526.421936 663.757996,524.501770 C663.795349,476.836670 664.044434,429.170502 663.793701,381.506897 C663.635315,351.399048 650.741577,327.506653 625.126770,311.772003 C598.522095,295.429321 570.237793,294.433380 542.809753,309.402832 C514.533325,324.835327 499.787415,349.599731 499.540436,382.049835 C499.178986,429.545593 499.349365,477.045471 499.293549,524.543579 C499.291412,526.354980 499.293274,528.166382 499.293274,530.214783 C456.633972,530.214783 414.365173,530.214783 371.762054,530.214783 C371.676727,528.542297 371.539093,527.089478 371.537720,525.636536 C371.495972,481.804657 371.287201,437.972015 371.475006,394.141052 C371.860382,304.204010 424.682465,226.655991 509.214478,196.615311 C584.347961,169.914658 654.283020,182.739136 715.840881,233.723877 C760.153809,270.425690 784.046753,318.625305 789.148560,375.944977 C790.062134,386.208832 789.793274,396.578308 790.053467,406.899475 C790.098755,408.694702 790.059875,410.492035 790.059875,412.747864 C796.087158,412.747864 801.697205,412.789581 807.306458,412.741150 C845.138245,412.414459 880.851318,421.047821 913.318604,440.402039 C975.582520,477.518280 1011.396606,532.235046 1018.060120,604.735901 C1027.391113,706.258362 960.265198,797.705505 865.278809,823.832458 C848.495544,828.448853 831.409241,831.160767 813.997681,831.204834 C765.499695,831.327698 717.001282,831.275330 668.502991,831.292053 C667.185913,831.292480 665.868835,831.292114 664.217285,831.292114 C664.217285,785.816711 664.217285,740.603333 664.217285,694.982117 C666.165527,694.982117 667.955994,694.977844 669.746399,694.982727 C717.411255,695.113159 765.077087,695.499817 812.740723,695.312073 C874.277588,695.069702 913.764526,630.740234 886.041626,575.849792 C874.118286,552.242065 854.564880,538.034302 828.197815,532.614258 z"
                    />
                    <path
                        fill="#ffffff"
                        opacity="1"
                        stroke="none"
                        d="M371.151489,704.000000 C371.151520,684.198608 371.151520,664.897156 371.151520,645.799194 C371.675934,645.392639 371.929565,645.024658 372.175995,645.029358 C392.588013,645.424133 413.113586,642.853455 433.335449,647.956238 C473.455719,658.080017 502.442139,694.768188 502.893066,736.291565 C503.426178,785.379089 467.258209,826.236633 418.432404,830.546631 C403.067108,831.902954 387.481018,830.758301 371.151489,830.758301 C371.151489,788.599487 371.151489,746.549744 371.151489,704.000000 z"
                    />
                </svg>
            </div>
            <span
                className={`wc-logo__wordmark${dark ? 'wc-logo__wordmark--dark' : ''}`}
            >
                WELLCARE <span className="wc-logo__accent">CLINICS</span>
            </span>
        </Link>
    );
}

// ─── Nav links ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { label: 'Home', href: home.url() },
    { label: 'About Us', href: about.url() },
    { label: 'Services', href: services.url() },
    { label: 'Doctors', href: doctors.url() },
    { label: 'Contact', href: contact.url() },
    { label: 'FAQs', href: faqs.url() },
] as const;

export type NavLabel = (typeof NAV_LINKS)[number]['label'];

// ─── Role → dashboard URL ─────────────────────────────────────────────────────
// Determines which dashboard to redirect to based on the user's primary role.

function getDashboardUrl(roles: string[]): string {
    if (roles.includes('doctor')) {
return '/doctor/appointments';
}

    if (roles.includes('hr')) {
return '/hr/dashboard';
}

    if (roles.includes('admin')) {
return '/hr/dashboard';
}

    if (roles.includes('user')) {
return '/user/dashboard';
}

    return '/user/dashboard';
}

// ─── CTA button ───────────────────────────────────────────────────────────────

function CtaButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
    const { auth } = usePage<PageProps>().props;
    const isAuthenticated = !!auth?.user;
    const roles = (auth?.user as any)?.roles ?? [];
    const dashUrl = getDashboardUrl(roles);

    return (
        <Link
            href={isAuthenticated ? dashUrl : login.url()}
            className={`wc-btn wc-btn-primary wc-btn-${size} wc-btn-pill`}
        >
            {isAuthenticated ? 'Dashboard' : 'Log In'}
        </Link>
    );
}

// ─── Hamburger ────────────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden="true"
        >
            {open ? (
                <>
                    <line
                        x1="3"
                        y1="3"
                        x2="19"
                        y2="19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <line
                        x1="19"
                        y1="3"
                        x2="3"
                        y2="19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </>
            ) : (
                <>
                    <line
                        x1="3"
                        y1="6"
                        x2="19"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <line
                        x1="3"
                        y1="11"
                        x2="19"
                        y2="11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <line
                        x1="3"
                        y1="16"
                        x2="19"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </>
            )}
        </svg>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NavbarProps {
    active?: NavLabel;
}

export default function Navbar({ active }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { url, props } = usePage<PageProps>();

    const { auth } = props;
    const isAuthenticated = !!auth?.user;
    const resolvedActive =
        active ?? NAV_LINKS.find((l) => l.href === url)?.label;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 768) {
setMobileOpen(false);
}
        };
        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [url]);

    return (
        <>
            <header
                className={`wc-navbar${scrolled ? 'wc-navbar--scrolled' : ''}`}
            >
                <div className="wc-navbar__inner">
                    <WellcareLogo />

                    <nav
                        className="wc-navbar__links"
                        aria-label="Main navigation"
                    >
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className={`wc-navbar__nav-link${resolvedActive === link.label ? 'wc-navbar__nav-link--active' : ''}`}
                                aria-current={
                                    resolvedActive === link.label
                                        ? 'page'
                                        : undefined
                                }
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="wc-navbar__actions">
                        {isAuthenticated && <NotificationBell />}
                        <span className="wc-navbar__cta">
                            <CtaButton size="md" />
                        </span>
                        <button
                            type="button"
                            className="wc-navbar__hamburger"
                            onClick={() => setMobileOpen((p) => !p)}
                            aria-label={
                                mobileOpen
                                    ? 'Close navigation menu'
                                    : 'Open navigation menu'
                            }
                            aria-expanded={mobileOpen}
                            aria-controls="wc-mobile-drawer"
                        >
                            <HamburgerIcon open={mobileOpen} />
                        </button>
                    </div>
                </div>
            </header>

            {mobileOpen && (
                <div
                    id="wc-mobile-drawer"
                    className="wc-navbar__mobile-drawer"
                    role="navigation"
                    aria-label="Mobile navigation"
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className={`wc-navbar__nav-link wc-navbar__nav-link--mobile${resolvedActive === link.label ? 'wc-navbar__nav-link--active' : ''}`}
                            aria-current={
                                resolvedActive === link.label
                                    ? 'page'
                                    : undefined
                            }
                        >
                            {link.label}
                        </Link>
                    ))}
                    <CtaButton size="lg" />
                </div>
            )}
        </>
    );
}
