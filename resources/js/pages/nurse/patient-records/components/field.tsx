// resources/js/pages/nurse/patient-records/components/field.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Labelled input / select / read-only value used by the record forms.

import type { ChangeEvent, ReactElement } from 'react';

const LABEL: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--wc-gray-500)',
};

const CONTROL: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--wc-gray-200)',
    background: 'var(--wc-white)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--wc-gray-700)',
};

export function ReadOnlyField({
    label,
    value,
}: {
    label: string;
    value: string | null;
}): ReactElement {
    return (
        <div>
            <span style={LABEL}>{label}</span>
            <p
                style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    color: value ? 'var(--wc-dark)' : 'var(--wc-gray-400)',
                }}
            >
                {value || '—'}
            </p>
        </div>
    );
}

export function TextField({
    label,
    value,
    onChange,
    error,
    type = 'text',
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    type?: string;
    placeholder?: string;
}): ReactElement {
    return (
        <div>
            <label style={LABEL}>{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onChange(e.target.value)
                }
                style={{
                    ...CONTROL,
                    borderColor: error ? '#dc2626' : 'var(--wc-gray-200)',
                }}
            />
            {error && <FieldError message={error} />}
        </div>
    );
}

export function SelectField({
    label,
    value,
    onChange,
    options,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    error?: string;
}): ReactElement {
    return (
        <div>
            <label style={LABEL}>{label}</label>
            <select
                value={value}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    onChange(e.target.value)
                }
                style={{
                    ...CONTROL,
                    borderColor: error ? '#dc2626' : 'var(--wc-gray-200)',
                }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <FieldError message={error} />}
        </div>
    );
}

export function FieldError({ message }: { message: string }): ReactElement {
    return (
        <p
            style={{
                margin: '4px 0 0',
                fontSize: '11px',
                fontWeight: 600,
                color: '#dc2626',
            }}
        >
            {message}
        </p>
    );
}

export const fieldGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
};
