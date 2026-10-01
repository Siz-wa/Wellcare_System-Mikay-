// resources/js/pages/dpo/components/access-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One row of the record access log. Shared by the DPO dashboard's break-glass
// panel and the full access-log table.

import type { ReactElement } from 'react';
import { Badge } from '@/design-system';
import { AdminTableCell } from '@/pages/admin/components/admin-table';
import { actionLabels } from '@/pages/dpo/dpo-data';
import type { AccessLogRow } from '@/pages/dpo/dpo-data';

/**
 * The care-relationship column, which is the reason this screen exists.
 *
 * Three states, rendered as three different things rather than as a boolean
 * with a blank. Collapsing "not applicable" into "no" would fill the
 * break-glass filter with roster searches and make the review worthless.
 */
export function CareRelationshipBadge({
    value,
}: {
    value: boolean | null;
}): ReactElement {
    if (value === null) {
        return (
            <span
                style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--wc-text-muted)',
                }}
                title="Not applicable — this read was not scoped to one patient, or the reader was the account holder."
            >
                —
            </span>
        );
    }

    if (value) {
        return <Badge variant="success">In care</Badge>;
    }

    return (
        <Badge variant="error" dot>
            Break-glass
        </Badge>
    );
}

export function AccessRow({ row }: { row: AccessLogRow }): ReactElement {
    return (
        <tr>
            <AdminTableCell>
                <div style={{ fontWeight: 600 }}>{row.actor}</div>
                <div
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {/* Role AT THE TIME, denormalised on the log row. Reading it
                        back off the live user would rewrite history whenever
                        somebody changed jobs. */}
                    {row.actorRole ?? 'unknown role'}
                </div>
            </AdminTableCell>

            <AdminTableCell>
                {row.patient ?? (
                    <span style={{ color: 'var(--wc-text-muted)' }}>
                        Not patient-scoped
                    </span>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                <Badge variant="neutral">
                    {actionLabels[row.action] ?? row.action}
                </Badge>
                {row.subjectType && (
                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {row.subjectType}
                    </div>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                <CareRelationshipBadge value={row.careRelationship} />
            </AdminTableCell>

            <AdminTableCell nowrap>
                <div>{row.at}</div>
                <div
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {row.ago}
                </div>
            </AdminTableCell>

            <AdminTableCell nowrap>
                <div
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {row.ip ?? '—'}
                </div>
                <div
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {row.route ?? '—'}
                </div>
            </AdminTableCell>
        </tr>
    );
}
