// resources/js/pages/auth/register/components/consent-checkbox.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One consent purpose, one checkbox — SC-4 / C-1 in WELLCARE-COMPLIANCE-PLAN.md.
//
// The whole reason this is a component rather than a single "I agree to the
// terms" tick: RA 10173 expects consent to be specific and informed, and one
// box covering four purposes is neither. Each purpose gets its own box, its own
// summary, and its own expandable full text — so a person can agree to being
// treated without also agreeing to marketing, and can read what they are
// agreeing to without leaving the form.
//
// The full text is collapsed by default and expanded in place. A link out to a
// policy page would mean losing a half-filled registration form to read it,
// which is how nobody ends up reading it.

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

interface ConsentCheckboxProps {
    name: string;
    checked: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    title: string;
    summary: string;
    body: string;
    required?: boolean;
    error?: string;
    tabIndex?: number;
}

export function ConsentCheckbox({
    name,
    checked,
    onChange,
    title,
    summary,
    body,
    required = false,
    error,
    tabIndex,
}: ConsentCheckboxProps): ReactElement {
    const [expanded, setExpanded] = useState(false);
    const bodyId = `${name}-body`;

    return (
        <div
            style={{
                border: `1px solid ${error ? '#dc2626' : 'var(--wc-gray-200, #e5e7eb)'}`,
                borderRadius: 10,
                padding: '12px 14px',
                background: '#fff',
            }}
        >
            <label
                htmlFor={name}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                }}
            >
                <input
                    id={name}
                    name={name}
                    type="checkbox"
                    // Explicit value, not the browser default of "on". This
                    // form posts natively, and "on" satisfies Laravel's
                    // `accepted` rule but FAILS its `boolean` rule — so the two
                    // required consents would have worked while the optional
                    // marketing one silently rejected every submission that
                    // ticked it. "1" satisfies both.
                    value="1"
                    checked={checked}
                    onChange={onChange}
                    tabIndex={tabIndex}
                    aria-describedby={bodyId}
                    aria-invalid={error ? true : undefined}
                    style={{
                        marginTop: 3,
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        accentColor: 'var(--wc-blue-600, #0056b3)',
                    }}
                />

                <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                        style={{
                            display: 'block',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--wc-gray-900, #111827)',
                        }}
                    >
                        {title}
                        {required ? (
                            <span style={{ color: '#dc2626' }}> *</span>
                        ) : (
                            <span
                                style={{
                                    marginLeft: 6,
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 500,
                                    color: 'var(--wc-gray-500, #6b7280)',
                                }}
                            >
                                Optional
                            </span>
                        )}
                    </span>
                    <span
                        style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-600, #4b5563)',
                        }}
                    >
                        {summary}
                    </span>
                </span>
            </label>

            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={bodyId}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 8,
                    marginLeft: 26,
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--wc-blue-600, #0056b3)',
                }}
            >
                {expanded ? 'Hide details' : 'Read what this covers'}
                <ChevronDown
                    size={13}
                    strokeWidth={2}
                    style={{
                        transform: expanded ? 'rotate(180deg)' : undefined,
                        transition: 'transform 150ms',
                    }}
                />
            </button>

            <div
                id={bodyId}
                hidden={!expanded}
                style={{
                    marginTop: 8,
                    marginLeft: 26,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--wc-gray-50, #f9fafb)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.6,
                    color: 'var(--wc-gray-700, #374151)',
                    whiteSpace: 'pre-wrap',
                }}
            >
                {body}
            </div>

            {error && (
                <p
                    style={{
                        margin: '8px 0 0 26px',
                        fontSize: 'var(--text-xs)',
                        color: '#dc2626',
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}
