// resources/js/pages/nurse/patient-records/components/field.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Labelled input / select / read-only value used by the record forms.

import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { DateField, Input, Select } from '@/design-system';
import type { DateFieldProps } from '@/design-system';

/** Types the native picker handles, and which therefore go to DateField. */
function isDateLike(type: string): type is NonNullable<DateFieldProps['kind']> {
    return ['date', 'time', 'datetime-local', 'month'].includes(type);
}

const LABEL: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--wc-text-muted)',
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
                    color: value
                        ? 'var(--wc-text-primary)'
                        : 'var(--wc-text-muted)',
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
    inputMode,
    maxLength,
    onPaste,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    type?: string;
    placeholder?: string;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel';
    maxLength?: number;
    onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}): ReactElement {
    const id = `nurse-field-${useId()}`;
    const errorId = `${id}-error`;

    return (
        <div>
            <label style={LABEL} htmlFor={id}>
                {label}
            </label>
            {isDateLike(type) ? (
                <DateField
                    id={id}
                    kind={type}
                    aria-describedby={error ? errorId : undefined}
                    invalid={Boolean(error)}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <Input
                    id={id}
                    type={type}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    value={value}
                    placeholder={placeholder}
                    error={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    onPaste={onPaste}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onChange(e.target.value)
                    }
                />
            )}
            {error && <FieldError message={error} id={errorId} />}
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
    const id = `nurse-field-${useId()}`;
    const errorId = `${id}-error`;

    return (
        <div>
            <label style={LABEL} htmlFor={id}>
                {label}
            </label>
            <Select
                id={id}
                aria-describedby={error ? errorId : undefined}
                invalid={Boolean(error)}
                value={value}
                onChange={onChange}
                options={options}
            />
            {error && <FieldError message={error} id={errorId} />}
        </div>
    );
}

export function FieldError({
    message,
    id,
}: {
    message: string;
    id?: string;
}): ReactElement {
    return (
        <p
            id={id}
            role="alert"
            style={{
                margin: '4px 0 0',
                fontSize: 'var(--text-xs)',
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
