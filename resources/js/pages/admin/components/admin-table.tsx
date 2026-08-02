// resources/js/pages/admin/components/admin-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A minimal table shell for the admin lists.
//
// The design system exports no table primitive (see @/design-system), and
// every admin page needs the same one, so it lives here rather than being
// re-invented four times. Card chrome comes from the design system; only the
// table itself is local.
//
// The horizontal scroll wrapper is load-bearing: these tables are wide and the
// page body must never scroll sideways.

import type { ReactElement, ReactNode } from 'react';

interface AdminTableProps {
    columns: string[];
    /** Rendered when there are no rows — never leave an empty table body. */
    emptyMessage: string;
    isEmpty: boolean;
    children: ReactNode;
}

export function AdminTable({
    columns,
    emptyMessage,
    isEmpty,
    children,
}: AdminTableProps): ReactElement {
    if (isEmpty) {
        return (
            <div
                style={{
                    padding: 'var(--space-10) var(--space-6)',
                    textAlign: 'center',
                    color: 'var(--wc-gray-500)',
                    fontSize: 'var(--text-sm)',
                }}
            >
                {emptyMessage}
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 'var(--text-sm)',
                }}
            >
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column}
                                style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color: 'var(--wc-gray-500)',
                                    borderBottom: '1px solid #e2e8f0',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

export function AdminTableCell({
    children,
    nowrap = false,
}: {
    children: ReactNode;
    nowrap?: boolean;
}): ReactElement {
    return (
        <td
            style={{
                padding: '12px',
                borderBottom: '1px solid #f1f5f9',
                color: 'var(--wc-dark)',
                verticalAlign: 'middle',
                whiteSpace: nowrap ? 'nowrap' : 'normal',
            }}
        >
            {children}
        </td>
    );
}
