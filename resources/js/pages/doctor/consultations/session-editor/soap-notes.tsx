// resources/js/pages/user/consultations/components/session-editor/soap-notes.tsx
// ─────────────────────────────────────────────────────────────────────────────
// SOAP Notes tab — 2×2 grid of Subjective, Objective, Assessment, Plan fields.

import type { ReactElement } from 'react';
import { soapFields } from '../consultations-data';
import type { SoapFields } from '../consultations-data';

interface SoapNotesProps {
    values: SoapFields;
    onChange: (key: keyof SoapFields, value: string) => void;
}

export function SoapNotes({ values, onChange }: SoapNotesProps): ReactElement {
    return (
        // One column on a phone: four note fields in a 2x2 leaves each about
        // 170px wide, and these hold paragraphs of clinical prose. The fixed
        // `1fr 1fr` row track only applies once the 2x2 exists.
        <div className="flex flex-1 flex-col gap-4 md:grid md:grid-cols-2 md:grid-rows-2">
            {soapFields.map((field) => (
                <div
                    key={field.key}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--wc-gray-200)',
                        background: 'var(--wc-white)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Label row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding:
                                'var(--space-3) var(--space-4) var(--space-2)',
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 'var(--radius-full)',
                                background: field.dotColor,
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--wc-text-muted)',
                                letterSpacing: '0.07em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {field.label}
                        </span>
                    </div>

                    {/* Textarea */}
                    <textarea
                        value={values[field.key]}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            onChange(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        style={{
                            flex: 1,
                            resize: 'none',
                            border: 'none',
                            outline: 'none',
                            padding:
                                'var(--space-2) var(--space-4) var(--space-4)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-secondary)',
                            background: 'transparent',
                            lineHeight: 1.6,
                            fontFamily: 'var(--font-sans)',
                            minHeight: 120,
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
