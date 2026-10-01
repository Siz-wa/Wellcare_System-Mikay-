// resources/js/pages/settings/privacy/sections/consent-manager.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "What you have agreed to" — SC-4 / C-3 in WELLCARE-COMPLIANCE-PLAN.md.
//
// C-3 asked whether a patient can later see what they consented to. The answer
// was no, because nothing was captured. This is the panel that answers it: every
// purpose, the wording, the date, and the version they actually agreed to.
//
// Two details that are doing real work:
//
// • `agreedVersion` is shown when it differs from the current one. Consent to
//   one description of processing is not consent to a different one, and a
//   panel that quietly showed today's wording next to an old tick would be
//   misrepresenting what the person agreed to.
//
// • A non-withdrawable consent renders an explanation, not a disabled button
//   with no reason. Withdrawing data processing collides with the clinic's
//   retention obligation, and a person is owed the reason rather than a greyed
//   control.

import { router } from '@inertiajs/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { SettingsCard } from '@/pages/settings/components/settings-card';

export interface ConsentStatus {
    type: string;
    title: string;
    summary: string;
    body: string;
    required: boolean;
    withdrawable: boolean;
    currentVersion: string;
    granted: boolean;
    agreedVersion: string | null;
    agreedAt: string | null;
    withdrawnAt: string | null;
    needsReconsent: boolean;
    forPatients: string[];
}

interface ConsentManagerProps {
    consents: ConsentStatus[];
}

export function ConsentManager({
    consents,
}: ConsentManagerProps): ReactElement {
    const [expanded, setExpanded] = useState<string | null>(null);

    const withdraw = (type: string) => {
        router.delete(`/settings/privacy/consents/${type}`, {
            preserveScroll: true,
        });
    };

    const agree = (type: string) => {
        router.post(
            `/settings/privacy/consents/${type}`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <SettingsCard
            title="What you have agreed to"
            description="Each purpose is recorded separately, with the date and the version of the notice you saw."
        >
            <ul
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
            >
                {consents.map((consent) => (
                    <li
                        key={consent.type}
                        style={{
                            border: '1px solid var(--wc-gray-200, #e5e7eb)',
                            borderRadius: 10,
                            padding: '12px 14px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        color: 'var(--wc-gray-900, #111827)',
                                    }}
                                >
                                    {consent.granted ? (
                                        <Check
                                            size={15}
                                            strokeWidth={2.4}
                                            color="#16a34a"
                                            aria-label="Agreed"
                                        />
                                    ) : (
                                        <X
                                            size={15}
                                            strokeWidth={2.4}
                                            color="var(--wc-gray-400, #9ca3af)"
                                            aria-label="Not agreed"
                                        />
                                    )}
                                    {consent.title}
                                </span>

                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-gray-600, #4b5563)',
                                    }}
                                >
                                    {consent.granted && consent.agreedAt
                                        ? `Agreed ${consent.agreedAt}`
                                        : consent.withdrawnAt
                                          ? `Withdrawn ${consent.withdrawnAt}`
                                          : 'Not agreed'}
                                </p>

                                {consent.forPatients.length > 0 && (
                                    <p
                                        style={{
                                            margin: '4px 0 0',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-gray-600, #4b5563)',
                                        }}
                                    >
                                        Given for{' '}
                                        {consent.forPatients.join(', ')}
                                    </p>
                                )}

                                {consent.needsReconsent && (
                                    <p
                                        style={{
                                            margin: '4px 0 0',
                                            fontSize: 'var(--text-xs)',
                                            color: '#b45309',
                                        }}
                                    >
                                        You agreed to version{' '}
                                        {consent.agreedVersion}; the current
                                        notice is version{' '}
                                        {consent.currentVersion}. The clinic
                                        will ask you again.
                                    </p>
                                )}
                            </div>

                            {consent.granted &&
                                (consent.withdrawable ? (
                                    <button
                                        type="button"
                                        onClick={() => withdraw(consent.type)}
                                        className="wc-btn wc-btn-sm wc-btn-ghost"
                                    >
                                        Withdraw
                                    </button>
                                ) : (
                                    <span
                                        style={{
                                            maxWidth: 260,
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-gray-500, #6b7280)',
                                        }}
                                    >
                                        Cannot be withdrawn here — the clinic
                                        must keep your medical record. Contact
                                        the clinic to discuss it.
                                    </span>
                                ))}

                            {!consent.granted && (
                                <button
                                    type="button"
                                    onClick={() => agree(consent.type)}
                                    className="wc-btn wc-btn-sm wc-btn-secondary"
                                >
                                    Agree
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setExpanded(
                                    expanded === consent.type
                                        ? null
                                        : consent.type,
                                )
                            }
                            aria-expanded={expanded === consent.type}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 8,
                                padding: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                color: 'var(--wc-blue-600, #0056b3)',
                            }}
                        >
                            {expanded === consent.type
                                ? 'Hide notice'
                                : 'Read the notice'}
                            <ChevronDown
                                size={13}
                                strokeWidth={2}
                                style={{
                                    transform:
                                        expanded === consent.type
                                            ? 'rotate(180deg)'
                                            : undefined,
                                    transition: 'transform 150ms',
                                }}
                            />
                        </button>

                        <div
                            hidden={expanded !== consent.type}
                            style={{
                                marginTop: 8,
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'var(--wc-gray-50, #f9fafb)',
                                fontSize: 'var(--text-sm)',
                                lineHeight: 1.6,
                                color: 'var(--wc-gray-700, #374151)',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {consent.body}
                        </div>
                    </li>
                ))}
            </ul>
        </SettingsCard>
    );
}
