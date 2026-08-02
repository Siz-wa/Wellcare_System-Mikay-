// resources/js/pages/nurse/dashboard/sections/quick-links.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Entry points into the four nurse workspaces.

import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactElement } from 'react';
import { nurseDashboardPageMeta } from '../dashboard-data';

export function QuickLinks(): ReactElement {
    const meta = nurseDashboardPageMeta;

    return (
        <section>
            <h2
                style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--wc-dark)',
                    fontFamily: "var(--font-display,'Bricolage Grotesque')",
                }}
            >
                {meta.quickLinksTitle}
            </h2>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 'var(--space-4)',
                }}
            >
                {meta.quickLinks.map((link) => (
                    <Link
                        key={link.id}
                        href={link.href}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-5)',
                            background: 'var(--wc-white)',
                            border: '1px solid var(--wc-gray-200)',
                            borderRadius: 16,
                            textDecoration: 'none',
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 700,
                                    color: 'var(--wc-dark)',
                                }}
                            >
                                {link.label}
                            </p>
                            <p
                                style={{
                                    margin: '2px 0 0',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                {link.description}
                            </p>
                        </div>
                        <ArrowRight
                            size={16}
                            strokeWidth={2}
                            color="var(--wc-blue-600)"
                        />
                    </Link>
                ))}
            </div>
        </section>
    );
}
