

import React from 'react';

// ── Field Wrapper ────────────────────────────────────────────

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  children,
  className = '',
}) => (
  <div className={`wc-field ${className}`}>
    {label && (
      <label className="wc-label-text">
        {label}
        {required && <span style={{ color: 'var(--wc-error)', marginLeft: 2 }}>*</span>}
      </label>
    )}
    {children}
    {hint  && !error && <p className="wc-field-hint">{hint}</p>}
    {error && <p className="wc-field-error" role="alert">{error}</p>}
  </div>
);

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
      dark  ? 'wc-input-dark'  : '',
      error ? 'wc-input-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (icon) {
      return (
        <div className="wc-input-with-icon">
          <span className="wc-input-icon" aria-hidden="true">{icon}</span>
          <input ref={ref} className={classes} {...props} />
        </div>
      );
    }

    return <input ref={ref} className={classes} {...props} />;
  }
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
      dark  ? 'wc-input-dark'  : '',
      error ? 'wc-input-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <textarea ref={ref} className={classes} {...props} />;
  }
);
Textarea.displayName = 'Textarea';

// ── Select ───────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  dark?: boolean;
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ dark, error, options, placeholder, className = '', ...props }, ref) => {
    const classes = [
      'wc-input',
      'wc-select',
      dark  ? 'wc-input-dark'  : '',
      error ? 'wc-input-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <select ref={ref} className={classes} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = 'Select';

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