// resources/js/pages/doctor/consultations/session-editor/lab-orders.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lab Tests tab — the DFD process 5 "lab test request" arrow.
// Ordering here drops the test into the nurse's queue at /nurse/lab-queue.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Select } from '@/design-system';
import {
    labOrderStatusColors,
    labOrdersCopy,
    labOrderStatusLabels,
    labSeverityColors,
    labTestPresets,
} from '../consultations-data';
import type { LabOrder } from '../consultations-data';

interface LabOrdersProps {
    /**
     * Always a real appointment. A lab test is ordered against a booking, and
     * the editor can no longer be opened without one — see the
     * `sessionOriginNote` comment in consultations-data.ts.
     */
    appointmentId: number;
    orders: LabOrder[];
    /**
     * Fires once the order is actually on file. Without a confirmation the
     * doctor has no signal the click landed, and the natural response is to
     * click again — which is how the same test ended up ordered twice.
     */
    onOrdered?: (testName: string) => void;
    /**
     * Keep the page mounted across the order. Required inside the video room:
     * a remount there tears down the peer connection and drops the call.
     */
    preserveState?: boolean;
}

const LABEL_STYLE = {
    display: 'block',
    marginBottom: 'var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: 'var(--wc-text-muted)',
};

// ── One previously ordered test ───────────────────────────────────────────────

function OrderRow({
    order,
    isLast,
}: {
    order: LabOrder;
    isLast: boolean;
}): ReactElement {
    // Severity wins over workflow state once it exists — a critical result is the
    // thing the doctor needs to see, not the fact that it is "ready for review".
    const accent = order.severity
        ? labSeverityColors[order.severity]
        : labOrderStatusColors[order.status];

    const badge = order.severity
        ? order.severity.toUpperCase()
        : labOrderStatusLabels[order.status].toUpperCase();

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderBottom: isLast ? 'none' : '1px solid var(--wc-gray-100)',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                    }}
                >
                    {order.testName}
                </p>
                {order.requestedAt && (
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {order.requestedAt}
                    </p>
                )}
            </div>

            <span
                style={{
                    flexShrink: 0,
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    background: `${accent}15`,
                    color: accent,
                }}
            >
                {badge}
            </span>
        </div>
    );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function LabOrders({
    appointmentId,
    orders,
    onOrdered,
    preserveState = false,
}: LabOrdersProps): ReactElement {
    const copy = labOrdersCopy;

    const [preset, setPreset] = useState<string>(labTestPresets[0]);
    const [customName, setCustomName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** The test just requested, so the confirmation names it. */
    const [lastOrdered, setLastOrdered] = useState<string | null>(null);

    const isCustom = preset === copy.customOption;
    const testName = isCustom ? customName.trim() : preset;

    function handleRequest(): void {
        if (appointmentId === null) {
            return;
        }

        if (!testName) {
            setError(copy.customPlaceholder);

            return;
        }

        setProcessing(true);
        setError(null);
        setLastOrdered(null);

        router.post(
            `/doctor/consultations/${appointmentId}/lab-request`,
            { test_name: testName },
            {
                preserveScroll: true,
                preserveState,
                onSuccess: () => {
                    setCustomName('');
                    setPreset(labTestPresets[0]);
                    setLastOrdered(testName);
                    onOrdered?.(testName);
                },
                onError: (errors) =>
                    setError(
                        errors.test_name ?? 'Could not request that test.',
                    ),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-6)',
            }}
        >
            {/* ── Already ordered ──────────────────────────────────────────────── */}
            <div>
                <span style={LABEL_STYLE}>{copy.existingTitle}</span>

                {orders.length === 0 ? (
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {copy.emptyMessage}
                    </p>
                ) : (
                    <div>
                        {orders.map((order, i) => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                isLast={i === orders.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Request a new one ────────────────────────────────────────────── */}
            <div
                style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--wc-gray-200)',
                    background: 'var(--wc-gray-50)',
                }}
            >
                <span style={LABEL_STYLE}>{copy.requestTitle}</span>

                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        flexWrap: 'wrap',
                    }}
                >
                    <Select
                        aria-label={copy.presetLabel}
                        value={preset}
                        onChange={setPreset}
                        style={{ flex: '2 1 200px' }}
                        options={[
                            ...labTestPresets.map((name) => ({
                                value: name,
                                label: name,
                            })),
                            {
                                value: copy.customOption,
                                label: copy.customOption,
                            },
                        ]}
                    />

                    <button
                        type="button"
                        className="wc-btn wc-btn-primary wc-btn-md"
                        onClick={handleRequest}
                        disabled={processing}
                        style={{ flexShrink: 0 }}
                    >
                        {processing ? copy.submittingLabel : copy.submitLabel}
                    </button>
                </div>

                {isCustom && (
                    <input
                        className="wc-input"
                        aria-label={copy.customPlaceholder}
                        placeholder={copy.customPlaceholder}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        style={{
                            marginTop: 'var(--space-2)',
                            width: '100%',
                            fontSize: 'var(--text-sm)',
                        }}
                    />
                )}

                {error ? (
                    <p
                        style={{
                            margin: 'var(--space-2) 0 0',
                            fontSize: 'var(--text-sm)',
                            color: '#dc2626',
                        }}
                    >
                        {error}
                    </p>
                ) : lastOrdered ? (
                    <p
                        style={{
                            margin: 'var(--space-2) 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {lastOrdered}: {copy.successHint}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
