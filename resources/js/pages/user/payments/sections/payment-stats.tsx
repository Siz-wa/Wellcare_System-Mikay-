// resources/js/pages/user/payments/sections/payment-stats.tsx

import { CheckCircle2, Receipt, Search, Wallet } from 'lucide-react';
import type { ReactElement } from 'react';
import type { PaymentStats } from '../payments-data';
import { paymentsMeta } from '../payments-data';

interface PaymentStatsRowProps {
    stats: PaymentStats;
}

export function PaymentStatsRow({ stats }: PaymentStatsRowProps): ReactElement {
    const { statsLabels } = paymentsMeta;

    const cards = [
        {
            label: statsLabels.total,
            value: stats.total,
            icon: <Receipt size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
        {
            label: statsLabels.owed,
            value: stats.owed,
            icon: <Wallet size={18} strokeWidth={1.8} />,
            color: '#b45309',
            bg: '#fffbeb',
        },
        {
            label: statsLabels.checking,
            value: stats.checking,
            icon: <Search size={18} strokeWidth={1.8} />,
            color: '#1d4ed8',
            bg: '#eff6ff',
        },
        {
            label: statsLabels.settled,
            value: stats.settled,
            icon: <CheckCircle2 size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
    ];

    // Two up on a phone, then as many as fit. `auto-fit` with a 180px minimum
    // cannot place two columns in a 358px content box, so on the device most of
    // this portal is read on it produced one tall column of counts and pushed
    // the actual list below the fold.
    return (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        background: '#fff',
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-lg, 12px)',
                        padding: 'var(--space-4) var(--space-5)',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            color: card.color,
                            background: card.bg,
                            flexShrink: 0,
                        }}
                    >
                        {card.icon}
                    </span>
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xl)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {card.value}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {card.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
