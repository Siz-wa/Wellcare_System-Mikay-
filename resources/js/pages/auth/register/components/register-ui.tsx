// resources/js/pages/auth/register/components/RegisterUI.tsx
// Shared primitives used across all step components.
import InputError from '@/components/input-error';

// ─── Field wrapper ────────────────────────────────────────────────────────────
interface FieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}

export function Field({
    label,
    error,
    required = false,
    children,
}: FieldProps) {
    return (
        <div className="wc-field">
            <label className="wc-label-text">
                {label}
                {required && (
                    <span
                        className="ml-0.5"
                        style={{ color: 'var(--wc-error)' }}
                    >
                        *
                    </span>
                )}
            </label>
            {children}
            {error && <InputError message={error} />}
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
                style={{ color: 'var(--wc-gray-400)' }}
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
