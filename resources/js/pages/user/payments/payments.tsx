// resources/js/pages/user/payments/payments.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Settling a video consultation. Composition only.
//
// Only self-paid VIDEO consultations reach this page. An in-person visit is
// paid at the clinic cashier as it always has been, and a covered one is
// settled by the HMO, PhilHealth or company account — the empty state says so,
// because a page that is blank for most patients has to explain why.

import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import type {
    PaymentChannel,
    PaymentRecord,
    PaymentStats,
} from './payments-data';
import { paymentsMeta } from './payments-data';
import { PaymentList } from './sections/payment-list';
import { PaymentStatsRow } from './sections/payment-stats';

interface PageData extends PageProps {
    payments: PaymentRecord[];
    stats: PaymentStats;
    channels: PaymentChannel[];
}

export default function PaymentsPage({
    payments,
    stats,
    channels,
}: PageData): ReactElement {
    // Only worth naming the patient on each card when the account covers more
    // than one person — the same rule the LOA and lab results pages use.
    const showPatientNames =
        new Set(payments.map((payment) => payment.patientName)).size > 1;

    return (
        <PatientDashboardLayout activeId="payments">
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
                    {paymentsMeta.title}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                        maxWidth: 640,
                    }}
                >
                    {paymentsMeta.subtitle}
                </p>
            </header>

            {payments.length > 0 && <PaymentStatsRow stats={stats} />}

            <PaymentList
                payments={payments}
                channels={channels}
                showPatientNames={showPatientNames}
            />
        </PatientDashboardLayout>
    );
}
