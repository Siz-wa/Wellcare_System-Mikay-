// resources/js/pages/user/payments/components/channel-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The clinic's own accounts, as published by config/payments.php.
//
// This is where the money actually goes, and the app is not in the path. The
// patient opens their own GCash, Maya or banking app — or walks to the cashier
// — and comes back with a reference number. Presenting the accounts plainly is
// the whole feature; anything that looked like a checkout button here would be
// claiming to do something this system deliberately does not do.

import { Landmark } from 'lucide-react';
import type { ReactElement } from 'react';
import type { PaymentChannel } from '../payments-data';
import { paymentsMeta } from '../payments-data';

interface ChannelListProps {
    channels: PaymentChannel[];
}

export function ChannelList({ channels }: ChannelListProps): ReactElement {
    const { form } = paymentsMeta;

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-3)',
            }}
        >
            {channels.map((channel) => (
                <div
                    key={channel.value}
                    style={{
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-lg, 12px)',
                        padding: 'var(--space-4)',
                        background: 'var(--wc-gray-50)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            marginBottom: 6,
                        }}
                    >
                        <Landmark
                            size={16}
                            strokeWidth={1.8}
                            aria-hidden="true"
                            style={{ color: 'var(--wc-blue-600)' }}
                        />
                        <span
                            style={{
                                fontWeight: 700,
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {channel.label}
                        </span>
                    </div>

                    {channel.accountNumber ? (
                        <dl style={{ margin: '0 0 8px' }}>
                            <dt style={termStyle}>{form.accountNumber}</dt>
                            <dd
                                style={{
                                    ...valueStyle,
                                    // The number the patient copies by hand
                                    // into another app. Tabular figures and a
                                    // wider track make a mis-keyed digit far
                                    // less likely.
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '0.04em',
                                    fontSize: 'var(--text-base)',
                                }}
                            >
                                {channel.accountNumber}
                            </dd>
                            {channel.accountName && (
                                <>
                                    <dt style={termStyle}>
                                        {form.accountName}
                                    </dt>
                                    <dd style={valueStyle}>
                                        {channel.accountName}
                                    </dd>
                                </>
                            )}
                        </dl>
                    ) : (
                        <p
                            style={{
                                ...termStyle,
                                margin: '0 0 8px',
                                fontStyle: 'italic',
                            }}
                        >
                            {form.payAtDesk}
                        </p>
                    )}

                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-xs)',
                            lineHeight: 1.5,
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {channel.instructions}
                    </p>
                </div>
            ))}
        </div>
    );
}

const termStyle = {
    margin: 0,
    fontSize: 'var(--text-xs)',
    color: 'var(--wc-text-muted)',
} as const;

const valueStyle = {
    margin: '0 0 6px',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--wc-text-primary)',
} as const;
