// resources/js/pages/auth/register/components/RegisterUI.tsx
// Shared primitives used across all step components.
import React, { useId } from 'react';
import InputError from '@/components/input-error';

// ─── Field wrapper ────────────────────────────────────────────────────────────
interface FieldProps {
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}

/** The subset of the child control's props this wrapper takes over. */
interface WrappedControlProps {
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
}

export function Field({
    label,
    hint,
    error,
    required = false,
    children,
}: FieldProps) {
    const generatedId = useId();
    const controlId = `wc-reg-field-${generatedId}`;
    const hintId = `${controlId}-hint`;
    const errorId = `${controlId}-error`;

    const showHint = Boolean(hint) && !error;
    const describedBy =
        [showHint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    /*
      A <label> is only a label once something points at it. This wrapper — and
      the two others like it in the app — rendered one with no `htmlFor` around
      nothing, so every field in the wizard announced as unlabelled and no
      label was clickable. Cloning the id onto the child fixes both without
      touching a single caller.

      A composite child (the pill RadioGroup below) is responsible for its own
      labelling, so `htmlFor` is withheld rather than pointed at an id that
      does not exist.
    */
    const control = React.isValidElement<WrappedControlProps>(children)
        ? React.cloneElement(children, {
              id: children.props.id ?? controlId,
              'aria-describedby':
                  children.props['aria-describedby'] ?? describedBy,
              'aria-invalid':
                  children.props['aria-invalid'] ?? (error ? true : undefined),
          })
        : children;

    const labelFor = React.isValidElement(children)
        ? ((children.props as WrappedControlProps).id ?? controlId)
        : undefined;

    return (
        <div className="wc-field">
            <label className="wc-label-text" htmlFor={labelFor}>
                {label}
                {required && (
                    <span
                        className="ml-0.5"
                        style={{ color: 'var(--wc-text-error)' }}
                    >
                        *
                    </span>
                )}
            </label>
            {control}
            {showHint && (
                <p className="wc-field-hint" id={hintId}>
                    {hint}
                </p>
            )}
            {error && <InputError message={error} id={errorId} role="alert" />}
        </div>
    );
}

// ─── Radio group (pill style) ─────────────────────────────────────────────────
interface RadioGroupProps {
    name: string;
    options: readonly { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    error?: string;
}

export function RadioGroup({
    name,
    options,
    value,
    onChange,
    error,
}: RadioGroupProps) {
    return (
        <div>
            <div className="mt-1 flex flex-wrap gap-2">
                {options.map((opt) => {
                    const isSelected = value === opt.value;

                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className="rounded-[var(--radius-full)] px-4 py-2 text-sm font-semibold transition-all duration-[var(--duration-base)]"
                            style={{
                                background: isSelected
                                    ? 'var(--wc-blue-600)'
                                    : 'var(--wc-white)',
                                color: isSelected
                                    ? '#ffffff'
                                    : 'var(--wc-gray-600)',
                                border: `1.5px solid ${
                                    isSelected
                                        ? 'var(--wc-blue-600)'
                                        : error
                                          ? 'var(--wc-error)'
                                          : 'var(--wc-gray-200)'
                                }`,
                                boxShadow: isSelected
                                    ? 'var(--shadow-brand)'
                                    : 'var(--shadow-sm)',
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
                {/* Hidden input so the value is submitted with the form */}
                <input type="hidden" name={name} value={value} />
            </div>
            {error && <InputError message={error} />}
        </div>
    );
}

// ─── Step progress bar ────────────────────────────────────────────────────────
interface StepProgressBarProps {
    current: number;
    total: number;
}

export function StepProgressBar({ current, total }: StepProgressBarProps) {
    return (
        <div className="mb-8 flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                        background:
                            i + 1 <= current
                                ? 'var(--wc-blue-600)'
                                : 'var(--wc-gray-200)',
                    }}
                />
            ))}
            <span
                className="ml-2 flex-shrink-0 text-xs font-semibold"
                style={{ color: 'var(--wc-text-muted)' }}
            >
                {current}/{total}
            </span>
        </div>
    );
}

// ─── Error border helper ──────────────────────────────────────────────────────
export function errorBorder(hasError?: string): React.CSSProperties {
    return hasError ? { border: '1.5px solid var(--wc-error)' } : {};
}
