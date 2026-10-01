// resources/js/pages/user/records/sections/access-log-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Who has viewed this record" — the patient-facing half of SC-3's access audit
// trail (WELLCARE-COMPLIANCE-PLAN.md §2.3, AU-2).
//
// RA 10173 gives a person the right to be informed about the processing of
// their data, and the Health Privacy Code's access-tracking expectation reaches
// for the same thing. An audit log only the clinic can read satisfies the
// accountability half and none of the transparency half — this section is the
// other half.
//
// Rows are roles and timestamps, never staff names. The guarantor's own visits
// are filtered out server-side; they already know they opened it, and those
// rows would bury the ones that matter.

import { Eye } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { AccessLogEntry } from '../records-data';
import { accessActionLabels, recordsMeta } from '../records-data';

interface AccessLogSectionProps {
    entries: AccessLogEntry[];
}

export function AccessLogSection({
    entries,
}: AccessLogSectionProps): ReactElement {
    const { sections, empty } = recordsMeta;

    return (
        <SectionShell
            title={sections.accessLog}
            icon={<Eye size={17} strokeWidth={1.8} />}
            accent="#7c3aed"
            count={entries.length}
            isEmpty={entries.length === 0}
            emptyText={empty.accessLog}
        >
            <ul
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                }}
            >
                {entries.map((entry) => (
                    <li
                        key={entry.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-3)',
                            flexWrap: 'wrap',
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 10,
                            background: 'var(--wc-gray-50)',
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {entry.role}
                            <span
                                style={{
                                    fontWeight: 400,
                                    color: 'var(--wc-text-secondary)',
                                }}
                            >
                                {' — '}
                                {accessActionLabels[entry.action] ??
                                    entry.action}
                            </span>
                        </span>

                        {entry.at && (
                            <span
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-text-muted)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {entry.at}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </SectionShell>
    );
}
