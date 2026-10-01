// resources/js/pages/hr/payment-verifications/payment-verifications.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR — the settlement queue for self-paid video consultations. Composition only.
//
// Sits beside the LOA queue because it is the same job: a financial finding
// about a booking, read off a document the clinic holds rather than anything in
// this application. The LOA queue asks "will the insurer pay?"; this asks "did
// this patient pay?"

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Alert } from '@/design-system';
import { HRDashboardLayout } from '@/pages/hr/layout/hr-dashboard-layout';
import type { PageProps } from '@/types';
import type { DecisionKind } from './components/decision-dialog';
import { DecisionDialog } from './components/decision-dialog';
import type {
    DecidedPayment,
    QueuePayment,
    QueueStats,
} from './payment-verifications-data';
import { queueMeta } from './payment-verifications-data';
import { DecisionHistory } from './sections/decision-history';
import { PaymentQueue } from './sections/payment-queue';
import { QueueStatsRow } from './sections/queue-stats';

interface PageData extends PageProps {
    /** Declared by a patient, waiting on a human to check it. */
    payments: QueuePayment[];
    /** Owed with nothing declared — what the sweeper will release. */
    outstanding: QueuePayment[];
    /** The last 50 decisions, newest first. */
    history: DecidedPayment[];
    stats: QueueStats;
    /**
     * True for HR, false for an administrator viewing the queue.
     *
     * GV-3, the same rule the LOA queue follows: the account that provisions
     * users and credentials doctors may SEE this backlog but must not decide
     * it. Whoever creates accounts should not also be the one confirming that
     * money arrived.
     */
    canDecide: boolean;
}

export default function PaymentVerificationsPage({
    payments,
    outstanding,
    history,
    stats,
    canDecide,
}: PageData): ReactElement {
    const [decision, setDecision] = useState<{
        payment: QueuePayment;
        kind: DecisionKind;
    } | null>(null);

    return (
        <HRDashboardLayout activeId="payment-verifications">
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {queueMeta.title}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                        maxWidth: 680,
                    }}
                >
                    {queueMeta.subtitle}
                </p>
            </header>

            <QueueStatsRow stats={stats} />

            <div style={{ marginBottom: 'var(--space-5)' }}>
                <Alert variant="info">{queueMeta.disclaimer}</Alert>
            </div>

            {!canDecide && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                    <Alert variant="warning">{queueMeta.readOnlyNotice}</Alert>
                </div>
            )}

            <PaymentQueue
                payments={payments}
                outstanding={outstanding}
                canDecide={canDecide}
                onDecide={(payment, kind) => setDecision({ payment, kind })}
            />

            <DecisionHistory history={history} />

            {decision && (
                <DecisionDialog
                    payment={decision.payment}
                    kind={decision.kind}
                    onClose={() => setDecision(null)}
                />
            )}
        </HRDashboardLayout>
    );
}
