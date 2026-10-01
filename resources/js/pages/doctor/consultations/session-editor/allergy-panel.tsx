// resources/js/pages/doctor/consultations/session-editor/allergy-panel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Task 1.1 — the allergy list beside the prescription form, and the warning
// shown when the server refuses a prescription that contradicts it.
//
// Two states, deliberately different in weight:
//
//   • Resting — the chart's recorded allergies, always visible while
//     prescribing. Informational. This is what should stop most conflicts
//     before they are ever typed.
//   • Refused — the server matched a prescription against one of them and
//     rolled the save back. Loud, names exactly what matched, and requires the
//     prescriber to write a justification before the save can go through.
//
// The override exists because the checker is name matching over a short
// ingredient table, not a clinical authority. A prescriber who knows the
// patient tolerates the drug must be able to proceed — a check that cannot be
// overridden is one that gets worked around. What it must not do is let them
// through silently, which is why the reason is required and audited.

import type { ReactElement } from 'react';
import type { AllergyConflict, RecordedAllergy } from '../consultations-data';

interface AllergyPanelProps {
    allergies: RecordedAllergy[];
    conflicts: AllergyConflict[];
    reason: string;
    onReasonChange: (value: string) => void;
}

const SEVERITY_COLOR: Record<RecordedAllergy['severity'], string> = {
    mild: 'var(--wc-amber-600, #b45309)',
    moderate: 'var(--wc-orange-600, #c2410c)',
    severe: 'var(--wc-red-600, #b91c1c)',
};

/** How the server graded the match, in words a prescriber can act on. */
const MATCH_LABEL: Record<
    AllergyConflict['conflicts'][number]['match'],
    string
> = {
    direct: 'Direct match',
    family: 'Same drug family',
    cross_reactive: 'Possible cross-reactivity',
};

export function AllergyPanel({
    allergies,
    conflicts,
    reason,
    onReasonChange,
}: AllergyPanelProps): ReactElement | null {
    const hasConflicts = conflicts.length > 0;

    if (allergies.length === 0 && !hasConflicts) {
        // Nothing recorded and nothing matched. Deliberately renders nothing
        // rather than "No known allergies" — an absent record is not the same
        // clinical statement as a confirmed negative, and printing the latter
        // from the former would be inventing a finding.
        return null;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
            }}
        >
            {/* ── Refused save ─────────────────────────────────────────── */}
            {hasConflicts && (
                <div
                    role="alert"
                    style={{
                        borderRadius: 'var(--radius-2xl)',
                        border: '2px solid var(--wc-red-600, #b91c1c)',
                        background: 'var(--wc-red-50, #fef2f2)',
                        padding: 'var(--space-5)',
                    }}
                >
                    <p
                        style={{
                            margin: '0 0 var(--space-2)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 800,
                            color: 'var(--wc-red-700, #991b1b)',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Prescription not saved — allergy conflict
                    </p>

                    {conflicts.map((conflict) => (
                        <div
                            key={conflict.name}
                            style={{ marginBottom: 'var(--space-3)' }}
                        >
                            <p
                                style={{
                                    margin: '0 0 var(--space-1)',
                                    fontSize: 'var(--text-base)',
                                    fontWeight: 700,
                                    color: 'var(--wc-text-primary)',
                                }}
                            >
                                {conflict.name}
                            </p>
                            <ul
                                style={{
                                    margin: 0,
                                    paddingLeft: '1.1rem',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-gray-700, #374151)',
                                }}
                            >
                                {conflict.conflicts.map((c, i) => (
                                    <li
                                        key={`${c.allergen}-${i}`}
                                        style={{ marginBottom: 2 }}
                                    >
                                        <strong
                                            style={{
                                                color: SEVERITY_COLOR[
                                                    c.severity
                                                ],
                                            }}
                                        >
                                            {c.allergen} ({c.severity})
                                        </strong>{' '}
                                        — {MATCH_LABEL[c.match]}
                                        {c.reaction
                                            ? `. Recorded reaction: ${c.reaction}.`
                                            : '.'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <label
                        style={{
                            display: 'block',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--wc-text-primary)',
                            marginBottom: 'var(--space-1)',
                        }}
                    >
                        To prescribe anyway, record your clinical reason
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        rows={2}
                        minLength={10}
                        maxLength={500}
                        placeholder="e.g. Patient has tolerated this drug since the allergy was recorded; reaction was a mild rash in 2019."
                        style={{
                            width: '100%',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--wc-gray-300, #d1d5db)',
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                    />
                    <p
                        style={{
                            margin: 'var(--space-2) 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-gray-600, #4b5563)',
                        }}
                    >
                        At least 10 characters. Saving again with a reason will
                        record the override against your account in the audit
                        trail.
                    </p>
                </div>
            )}

            {/* ── Resting: what the chart says ─────────────────────────── */}
            {allergies.length > 0 && (
                <div
                    style={{
                        borderRadius: 'var(--radius-2xl)',
                        border: '1px solid var(--wc-red-200, #fecaca)',
                        background: 'var(--wc-white)',
                        padding: 'var(--space-4) var(--space-5)',
                    }}
                >
                    <p
                        style={{
                            margin: '0 0 var(--space-2)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--wc-red-700, #991b1b)',
                        }}
                    >
                        Recorded allergies
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-2)',
                        }}
                    >
                        {allergies.map((a, i) => (
                            <span
                                key={`${a.allergen}-${i}`}
                                title={
                                    a.reaction
                                        ? `Reaction: ${a.reaction}`
                                        : undefined
                                }
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    border: `1px solid ${SEVERITY_COLOR[a.severity]}`,
                                    color: SEVERITY_COLOR[a.severity],
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                }}
                            >
                                {a.allergen}
                                <span
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 500,
                                        opacity: 0.8,
                                    }}
                                >
                                    {a.severity}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
