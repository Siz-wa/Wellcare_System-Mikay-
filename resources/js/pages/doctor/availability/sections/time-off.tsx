// resources/js/pages/doctor/availability/sections/time-off.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Specific-date blackouts. A date block overrides the weekly schedule entirely
// for that day, which is how BookingService resolves availability.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { availabilityMeta } from '../availability-data';
import type { TimeOffEntry } from '../availability-data';

interface TimeOffProps {
    entries: TimeOffEntry[];
}

export function TimeOff({ entries }: TimeOffProps): ReactElement {
    const meta = availabilityMeta;

    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleAdd(): void {
        setProcessing(true);
        setErrors({});

        router.post(
            '/doctor/availability/time-off',
            { date, reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDate('');
                    setReason('');
                },
                onError: (formErrors) => setErrors(formErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function handleRemove(id: number): void {
        router.delete(`/doctor/availability/${id}`, { preserveScroll: true });
    }

    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                padding: 'var(--space-6)',
            }}
        >
            <h2
                style={{
                    margin: '0 0 var(--space-1)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    color: 'var(--wc-dark)',
                    fontFamily: "var(--font-display,'Bricolage Grotesque')",
                }}
            >
                {meta.timeOffTitle}
            </h2>
            <p
                style={{
                    margin: '0 0 var(--space-5)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-gray-500)',
                }}
            >
                {meta.timeOffHint}
            </p>

            {/* ── Existing entries ─────────────────────────────────────────── */}
            {entries.length === 0 ? (
                <p
                    style={{
                        margin: '0 0 var(--space-5)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.timeOffEmpty}
                </p>
            ) : (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                    {entries.map((entry, i) => (
                        <div
                            key={entry.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                                padding: 'var(--space-3) 0',
                                borderBottom:
                                    i === entries.length - 1
                                        ? 'none'
                                        : '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <span
                                style={{
                                    flex: 1,
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    color: 'var(--wc-dark)',
                                }}
                            >
                                {entry.label}
                            </span>

                            <span
                                style={{
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                }}
                            >
                                {meta.timeOffBadge}
                            </span>

                            <button
                                type="button"
                                onClick={() => handleRemove(entry.id)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--wc-gray-500)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                {meta.timeOffRemoveLabel}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add a new one ────────────────────────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                }}
            >
                <input
                    type="date"
                    className="wc-input"
                    aria-label={meta.timeOffDateLabel}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                        height: 40,
                        width: 170,
                        fontSize: 'var(--text-sm)',
                    }}
                />

                <input
                    type="text"
                    className="wc-input"
                    aria-label={meta.timeOffReasonLabel}
                    placeholder={meta.timeOffReasonPlaceholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                        flex: '1 1 220px',
                        height: 40,
                        fontSize: 'var(--text-sm)',
                    }}
                />

                <button
                    type="button"
                    className="wc-btn wc-btn-outline wc-btn-md"
                    onClick={handleAdd}
                    disabled={processing || !date}
                    style={{ flexShrink: 0, height: 40 }}
                >
                    {processing
                        ? meta.timeOffAddingLabel
                        : meta.timeOffAddLabel}
                </button>
            </div>

            {errors.date && (
                <p
                    style={{
                        margin: 'var(--space-2) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: '#dc2626',
                    }}
                >
                    {errors.date}
                </p>
            )}
        </section>
    );
}
