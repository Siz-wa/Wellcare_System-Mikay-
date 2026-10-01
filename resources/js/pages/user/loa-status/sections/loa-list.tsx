// resources/js/pages/user/loa-status/sections/loa-list.tsx

import { ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { LoaCard } from '../components/loa-card';
import type { LoaRequest } from '../loa-status-data';
import { loaStatusMeta } from '../loa-status-data';

interface LoaListProps {
    requests: LoaRequest[];
    showPatientNames: boolean;
}

export function LoaList({
    requests,
    showPatientNames,
}: LoaListProps): ReactElement {
    if (requests.length === 0) {
        return <EmptyRequests />;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
            }}
        >
            {requests.map((request) => (
                <LoaCard
                    key={request.id}
                    request={request}
                    showPatientName={showPatientNames}
                />
            ))}
        </div>
    );
}

function EmptyRequests(): ReactElement {
    const { empty } = loaStatusMeta;

    return (
        <div
            style={{
                background: '#fff',
                border: '1px dashed var(--wc-gray-300)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-10) var(--space-6)',
                textAlign: 'center',
            }}
        >
            <ShieldCheck
                size={32}
                strokeWidth={1.5}
                style={{ color: 'var(--wc-text-muted)' }}
            />
            <h2
                style={{
                    margin: 'var(--space-4) 0 0',
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    color: 'var(--wc-text-primary)',
                }}
            >
                {empty.title}
            </h2>
            <p
                style={{
                    margin: '6px auto 0',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-muted)',
                    maxWidth: 460,
                }}
            >
                {empty.body}
            </p>
        </div>
    );
}
