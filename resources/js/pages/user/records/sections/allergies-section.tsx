// resources/js/pages/user/records/sections/allergies-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Safety-critical, so it sits at the top of the record and is colour-coded by
// severity — matching how the doctor surface treats allergies.

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { Allergy } from '../records-data';
import { recordsMeta, severityStyles } from '../records-data';

interface AllergiesSectionProps {
    allergies: Allergy[];
}

export function AllergiesSection({
    allergies,
}: AllergiesSectionProps): ReactElement {
    const { labels, sections, empty } = recordsMeta;

    return (
        <SectionShell
            title={sections.allergies}
            icon={<AlertTriangle size={17} strokeWidth={1.8} />}
            accent="#dc2626"
            count={allergies.length}
            isEmpty={allergies.length === 0}
            emptyText={empty.allergies}
        >
            <ul
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                }}
            >
                {allergies.map((allergy) => {
                    const style = severityStyles[allergy.severity];

                    return (
                        <li
                            key={allergy.id}
                            style={{
                                padding: 'var(--space-4)',
                                borderRadius: 10,
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: 'var(--wc-gray-900)',
                                    }}
                                >
                                    {allergy.allergen}
                                </span>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '.05em',
                                        color: style.color,
                                        border: `1px solid ${style.color}33`,
                                        borderRadius: 999,
                                        padding: '2px 8px',
                                    }}
                                >
                                    {style.label}
                                </span>
                            </div>

                            {allergy.reaction && (
                                <p
                                    style={{
                                        margin: '6px 0 0',
                                        fontSize: 13,
                                        color: 'var(--wc-gray-700)',
                                    }}
                                >
                                    {labels.reaction}: {allergy.reaction}
                                </p>
                            )}

                            {allergy.notes && (
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 13,
                                        color: 'var(--wc-gray-600)',
                                    }}
                                >
                                    {allergy.notes}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </SectionShell>
    );
}
