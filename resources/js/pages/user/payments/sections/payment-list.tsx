// resources/js/pages/user/payments/sections/payment-list.tsx

import { Wallet } from 'lucide-react';
import type { ReactElement } from 'react';
import { PaymentCard } from '../components/payment-card';
import type { PaymentChannel, PaymentRecord } from '../payments-data';
import { paymentsMeta } from '../payments-data';

interface PaymentListProps {
    payments: PaymentRecord[];
    channels: PaymentChannel[];
    showPatientNames: boolean;
}

export function PaymentList({
    payments,
    channels,
    showPatientNames,
}: PaymentListProps): ReactElement {
    if (payments.length === 0) {
        return <EmptyPayments />;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
            }}
        >
            {payments.map((payment) => (
                <PaymentCard
                    key={payment.id}
                    payment={payment}
                    channels={channels}
                    showPatientName={showPatientNames}
                />
            ))}
        </div>
    );
}

function EmptyPayments(): ReactElement {
    const { empty } = paymentsMeta;

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
            <Wallet
                size={28}
                strokeWidth={1.5}
                aria-hidden="true"
                // The semantic token, not the raw ramp — gray-400 is 2.56:1
                // on white and TypographyScaleTest bans it outright.
                style={{ color: 'var(--wc-text-muted)' }}
            />
            <h2
                style={{
                    margin: 'var(--space-3) 0 4px',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--wc-text-primary)',
                }}
            >
                {empty.title}
            </h2>
            <p
                style={{
                    margin: '0 auto',
                    maxWidth: 520,
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.6,
                    color: 'var(--wc-text-muted)',
                }}
            >
                {empty.body}
            </p>
        </div>
    );
}
