import React, { useId } from 'react';

// ── Field Wrapper ────────────────────────────────────────────

interface FieldProps {
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

/** The subset of the child control's props this wrapper takes over. */
interface WrappedControlProps {
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
}

export const Field: React.FC<FieldProps> = ({
    label,
    hint,
    error,
    required,
    children,
    className = '',
}) => {
    const generatedId = useId();
    const controlId = `wc-field-${generatedId}`;
    const hintId = `${controlId}-hint`;
    const errorId = `${controlId}-error`;

    const showHint = Boolean(hint) && !error;
    const describedBy =
        [showHint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined;

    /*
      A <label> is only a label once something points at it. This wrapper
      rendered one with no `htmlFor` and did not wrap the control, so nothing
      associated the two: a screen reader announced every field in the product
      as unlabelled, and clicking a label focused nothing. Cloning the id onto
      the child is what makes both work, and it does it for every existing
      caller without touching one of them.

      Only a single element can be adopted this way. A caller passing a
      fragment or a composite (a radio group, say) is responsible for its own
      labelling, so `htmlFor` is withheld rather than pointed at an id that
      does not exist — a dangling `for` is worse than none.

      Props already set by the caller win, so a control that has thought about
      its own id or description keeps it.
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
        <div className={`wc-field ${className}`}>
            {label && (
                <label className="wc-label-text" htmlFor={labelFor}>
                    {label}
                    {required && (
                        <span
                            style={{
                                color: 'var(--wc-text-error)',
                                marginLeft: 2,
                            }}
                        >
                            *
                        </span>
                    )}
                </label>
            )}
            {control}
            {showHint && (
                <p className="wc-field-hint" id={hintId}>
                    {hint}
                </p>
            )}
            {error && (
                <p className="wc-field-error" id={errorId} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

// ── Input ────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    dark?: boolean;
    error?: boolean;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ dark, error, icon, className = '', ...props }, ref) => {
        const classes = [
            'wc-input',
            dark ? 'wc-input-dark' : '',
            error ? 'wc-input-error' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        if (icon) {
            return (
                <div className="wc-input-with-icon">
                    <span className="wc-input-icon" aria-hidden="true">
                        {icon}
                    </span>
                    <input ref={ref} className={classes} {...props} />
                </div>
            );
        }

        return <input ref={ref} className={classes} {...props} />;
    },
);
Input.displayName = 'Input';

// ── Textarea ─────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    dark?: boolean;
    error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ dark, error, className = '', ...props }, ref) => {
        const classes = [
            'wc-input',
            'wc-textarea',
            dark ? 'wc-input-dark' : '',
            error ? 'wc-input-error' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return <textarea ref={ref} className={classes} {...props} />;
    },
);
Textarea.displayName = 'Textarea';

// ── Select ───────────────────────────────────────────────────
// Moved to ./select.tsx. It was a native <select>, whose dropped list is OS
// chrome — unstylable, unable to wrap a long option, and fixed at the system
// font size regardless of the reader's Text size setting. Import { Select }
// from '@/design-system' as before; the props changed from `options` +
// native onChange to `value` + `onChange(value)`.

// ── Checkbox / Radio ─────────────────────────────────────────

interface CheckProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    type?: 'checkbox' | 'radio';
}

export const Check: React.FC<CheckProps> = ({
    label,
    type = 'checkbox',
    className = '',
    ...props
}) => (
    <label className={`wc-check ${className}`}>
        <input type={type} {...props} />
        <span>{label}</span>
    </label>
);
