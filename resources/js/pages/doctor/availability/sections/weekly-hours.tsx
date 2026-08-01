// resources/js/pages/doctor/availability/sections/weekly-hours.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The seven-day recurring schedule editor. Submitting replaces the whole
// schedule, so a day switched off here really disappears server-side.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
    availabilityMeta,
    dailyCapOptions,
    defaultEndTime,
    defaultSlotDuration,
    defaultStartTime,
    slotDurationOptions,
    weekdays,
} from '../availability-data';
import type { WeeklyBlock } from '../availability-data';

interface DayDraft {
    enabled: boolean;
    startTime: string;
    endTime: string;
    slotDuration: number;
}

interface WeeklyHoursProps {
    weekly: WeeklyBlock[];
    dailyCap: number;
}

function buildDrafts(weekly: WeeklyBlock[]): Record<number, DayDraft> {
    const byDay = new Map(weekly.map((b) => [b.isoDay, b]));

    return Object.fromEntries(
        weekdays.map(({ isoDay }) => {
            const existing = byDay.get(isoDay);

            return [
                isoDay,
                {
                    enabled: Boolean(existing),
                    startTime: existing?.startTime ?? defaultStartTime,
                    endTime: existing?.endTime ?? defaultEndTime,
                    slotDuration: existing?.slotDuration ?? defaultSlotDuration,
                },
            ];
        }),
    );
}

export function WeeklyHours({
    weekly,
    dailyCap,
}: WeeklyHoursProps): ReactElement {
    const meta = availabilityMeta;

    const [drafts, setDrafts] = useState<Record<number, DayDraft>>(() =>
        buildDrafts(weekly),
    );
    const [cap, setCap] = useState<number>(dailyCap);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function update(isoDay: number, patch: Partial<DayDraft>): void {
        setDrafts((current) => ({
            ...current,
            [isoDay]: { ...current[isoDay], ...patch },
        }));
    }

    function handleSave(): void {
        setProcessing(true);
        setErrors({});

        const days = weekdays
            .filter(({ isoDay }) => drafts[isoDay].enabled)
            .map(({ isoDay }) => ({
                iso_day: isoDay,
                start_time: drafts[isoDay].startTime,
                end_time: drafts[isoDay].endTime,
                slot_duration_minutes: drafts[isoDay].slotDuration,
            }));

        router.put(
            '/doctor/availability/weekly',
            { days, daily_cap: cap },
            {
                preserveScroll: true,
                onError: (formErrors) => setErrors(formErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    const anyEnabled = weekdays.some(({ isoDay }) => drafts[isoDay].enabled);
    const firstError = Object.values(errors)[0];

    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-6)',
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
                {meta.weeklyTitle}
            </h2>
            <p
                style={{
                    margin: '0 0 var(--space-5)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-gray-500)',
                }}
            >
                {meta.weeklyHint}
            </p>

            {/* ── Daily patient cap ───────────────────────────────────────── */}
            <div
                style={{
                    marginBottom: 'var(--space-5)',
                    padding: 'var(--space-4)',
                    borderRadius: 12,
                    background: 'var(--wc-gray-50)',
                    border: '1px solid var(--wc-gray-200)',
                }}
            >
                <label
                    htmlFor="daily-cap"
                    style={{
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.capLabel}
                </label>

                <select
                    id="daily-cap"
                    className="wc-input"
                    value={cap}
                    onChange={(e) => setCap(Number(e.target.value))}
                    style={{
                        height: 40,
                        width: 160,
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    {dailyCapOptions.map((n) => (
                        <option key={n} value={n}>
                            {n} {meta.capSuffix}
                        </option>
                    ))}
                </select>

                <p
                    style={{
                        margin: 'var(--space-2) 0 0',
                        fontSize: '12px',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.capHint}
                </p>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                }}
            >
                {weekdays.map(({ isoDay, label, short }) => {
                    const draft = drafts[isoDay];

                    return (
                        <div
                            key={isoDay}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                                flexWrap: 'wrap',
                                padding: 'var(--space-3)',
                                borderRadius: 12,
                                border: '1px solid var(--wc-gray-200)',
                                background: draft.enabled
                                    ? 'var(--wc-white)'
                                    : 'var(--wc-gray-50)',
                            }}
                        >
                            <button
                                type="button"
                                role="switch"
                                aria-checked={draft.enabled}
                                aria-label={`${label} ${draft.enabled ? meta.dayOnLabel : meta.dayOffLabel}`}
                                onClick={() =>
                                    update(isoDay, { enabled: !draft.enabled })
                                }
                                style={{
                                    width: 92,
                                    flexShrink: 0,
                                    padding: '6px 10px',
                                    borderRadius: 999,
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    border: `1.5px solid ${draft.enabled ? 'var(--wc-blue-600)' : 'var(--wc-gray-200)'}`,
                                    background: draft.enabled
                                        ? 'var(--wc-blue-600)'
                                        : 'transparent',
                                    color: draft.enabled
                                        ? '#fff'
                                        : 'var(--wc-gray-500)',
                                }}
                            >
                                {short}
                            </button>

                            {draft.enabled ? (
                                <>
                                    <label
                                        style={{
                                            fontSize: '11px',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {meta.fromLabel}{' '}
                                        <input
                                            type="time"
                                            className="wc-input"
                                            aria-label={`${label} ${meta.fromLabel}`}
                                            value={draft.startTime}
                                            onChange={(e) =>
                                                update(isoDay, {
                                                    startTime: e.target.value,
                                                })
                                            }
                                            style={{
                                                height: 36,
                                                width: 120,
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        />
                                    </label>

                                    <label
                                        style={{
                                            fontSize: '11px',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {meta.toLabel}{' '}
                                        <input
                                            type="time"
                                            className="wc-input"
                                            aria-label={`${label} ${meta.toLabel}`}
                                            value={draft.endTime}
                                            onChange={(e) =>
                                                update(isoDay, {
                                                    endTime: e.target.value,
                                                })
                                            }
                                            style={{
                                                height: 36,
                                                width: 120,
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        />
                                    </label>

                                    <label
                                        style={{
                                            fontSize: '11px',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {meta.slotLabel}{' '}
                                        <select
                                            className="wc-input"
                                            aria-label={`${label} ${meta.slotLabel}`}
                                            value={draft.slotDuration}
                                            onChange={(e) =>
                                                update(isoDay, {
                                                    slotDuration: Number(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                            style={{
                                                height: 36,
                                                width: 104,
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        >
                                            {slotDurationOptions.map((n) => (
                                                <option key={n} value={n}>
                                                    {n} {meta.minutesSuffix}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </>
                            ) : (
                                <span
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-gray-400)',
                                    }}
                                >
                                    {meta.dayOffLabel}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {!anyEnabled && (
                <p
                    style={{
                        margin: 'var(--space-4) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: '#ca8a04',
                    }}
                >
                    {meta.weeklyEmpty}
                </p>
            )}

            {firstError && (
                <p
                    style={{
                        margin: 'var(--space-3) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: '#dc2626',
                    }}
                >
                    {firstError}
                </p>
            )}

            <button
                type="button"
                className="wc-btn wc-btn-primary wc-btn-md"
                onClick={handleSave}
                disabled={processing}
                style={{ marginTop: 'var(--space-5)' }}
            >
                {processing ? meta.savingLabel : meta.saveLabel}
            </button>
        </section>
    );
}
