import { Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    about,
    services,
    contact,
    doctors,
    privacy,
    terms,
    cookies,
} from '@/routes';
import { WellcareLogo } from './navbar';

const QUICK_LINKS = [
    { label: 'About Us', href: about.url() },
    { label: 'Our Specialists', href: doctors.url() },
    { label: 'Health Services', href: services.url() },
    { label: 'Contact Us', href: contact.url() },
] as const;

const LEGALS = [
    { label: 'Privacy Policy', href: privacy.url() },
    { label: 'Terms of Use', href: terms.url() },
    { label: 'Cookie Policy', href: cookies.url() },
] as const;

const SOCIAL_LINKS = [
    {
        label: 'Facebook',
        href: 'https://facebook.com/wellcareclinics',
        icon: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
            >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
        ),
    },
    {
        label: 'Twitter / X',
        href: 'https://twitter.com/wellcareclinics',
        icon: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
            >
                <path
                    d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66
                 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0
                 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
                />
            </svg>
        ),
    },
    {
        label: 'Instagram',
        href: 'https://instagram.com/wellcareclinics',
        icon: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
        ),
    },
] as const;

export default function Footer() {
    const [email, setEmail] = useState('');

    return (
        <footer className="wc-footer">
            <div className="wc-footer__inner">
                {/* ── Main 4-col grid ── */}
                <div className="wc-footer__grid">
                    {/* Col 1 — Brand */}
                    <div className="wc-footer__brand">
                        <WellcareLogo dark />
                        <p className="wc-footer__tagline">
                            Providing accessible, high-quality healthcare and
                            diagnostic services to our community for over 15
                            years.
                        </p>
                        <div className="wc-footer__social">
                            {SOCIAL_LINKS.map((s) => (
                                // External URLs — <a> with target="_blank" is correct
                                <a
                                    key={s.label}
                                    href={s.href}
                                    className="wc-footer__social-link"
                                    aria-label={s.label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Col 2 — Quick Links */}
                    <div className="wc-footer__col">
                        <h4 className="wc-footer__heading">Quick Links</h4>
                        <ul className="wc-footer__links">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.label}>
                                    {/* Internal routes — <Link> for SPA navigation */}
                                    <Link
                                        href={link.href}
                                        className="wc-footer__link"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3 — Contact Us */}
                    <div className="wc-footer__col">
                        <h4 className="wc-footer__heading">Contact Us</h4>
                        <ul className="wc-footer__contact-list">
                            <li className="wc-footer__contact-item">
                                <span
                                    className="wc-footer__contact-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                </span>
                                <address className="wc-footer__address">
                                    Waltermart Aguinaldo Highway,
                                    <br />
                                    Dasmariñas City, Cavite
                                </address>
                            </li>

                            <li className="wc-footer__contact-item">
                                <span
                                    className="wc-footer__contact-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path
                                            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                             A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39
                             A2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361
                             1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0
                             6.29 6.29l1.27-.62a2 2 0 0 1 2.11.45c.907.339 1.85.573
                             2.81.7A2 2 0 0 1 22 16.92z"
                                        />
                                    </svg>
                                </span>
                                {/* tel: protocol — <a> is correct, not <Link> */}
                                <a
                                    href="tel:+63464167068"
                                    className="wc-footer__link"
                                >
                                    Tel# (046) 450-5116/424-9312 <br />{' '}
                                    0917-185-6604/0998-982-2384
                                </a>
                            </li>

                            <li className="wc-footer__contact-item">
                                <span
                                    className="wc-footer__contact-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </span>
                                {/* mailto: protocol — <a> is correct, not <Link> */}
                                <a
                                    href="mailto:csrpat.wellcareclinics@gmail.com"
                                    className="wc-footer__link"
                                >
                                    csrpat.wellcareclinics@gmail.com
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Col 4 — Newsletter */}
                </div>

                {/* ── Bottom bar ── */}
                <div className="wc-footer__bottom">
                    <span className="wc-footer__copyright">
                        © 2026 Wellcare Clinics &amp; Laboratories, Inc. All
                        rights reserved.
                    </span>
                    <nav
                        className="wc-footer__legal-links"
                        aria-label="Legal links"
                    >
                        {LEGALS.map((s) => (
                            // External URLs — <a> with target="_blank" is correct
                            <Link
                                key={s.label}
                                href={s.href}
                                className="wc-footer__legal-link"
                                aria-label={s.label}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {s.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    );
}
