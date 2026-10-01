// resources/js/pages/user/dashboard/components/status-badge.tsx

import type { ReactElement } from 'react';
import { statusTone } from '../dashboard-data';

export function StatusBadge({ status }: { status: string }): ReactElement {
    const tone = statusTone(status);

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: tone.bg,
                color: tone.color,
                fontSize: 'var(--text-xs)',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}
        >
            {tone.label}
        </span>
    );
}
