// resources/js/design-system/components/date-field.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Every date, time and date-range control in the product.
//
// These were `<input type="date">` elements carrying whatever the call site
// felt like: `className="wc-input"` with an inline `height: 40`, or the
// design-system `Input` with `type="date"`, or a bare styled input. The pinned
// heights clipped the value once the type scale moved, and none of them agreed
// on how the calendar glyph should look.
//
// The native picker is kept on purpose. It is the only date UI that already has
// complete keyboard entry, screen-reader announcement and locale-correct
// formatting, and it is the one a low-vision reader has already configured at
// the OS level. A hand-rolled calendar grid gives all of that up in exchange for
// visual control that is not worth it here. Only the chrome is ours.

import type { InputHTMLAttributes, ReactElement } from 'react';
import { forwardRef } from 'react';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>;

export interface DateFieldProps extends NativeProps {
    /** `date` for a calendar day, `time` for a clock, `datetime-local` for both. */
    kind?: 'date' | 'time' | 'datetime-local' | 'month';
    invalid?: boolean;
    dark?: boolean;
}

/**
 * A single date or time input.
 *
 * `min` and `max` are worth passing wherever the domain has a bound — a
 * birthdate cannot be in the future, an appointment cannot be in the past. The
 * native picker greys out the unreachable days, which is far clearer than
 * failing validation after the fact.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
    (
        {
            kind = 'date',
            invalid = false,
            dark = false,
            className = '',
            ...props
        },
        ref,
    ): ReactElement => {
        const classes = [
            'wc-input',
            'wc-date-input',
            dark ? 'wc-input-dark' : '',
            invalid ? 'wc-input-error' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <input
                ref={ref}
                type={kind}
                className={classes}
                aria-invalid={invalid || undefined}
                {...props}
            />
        );
    },
);
DateField.displayName = 'DateField';

export interface DateRangeFieldProps {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    kind?: DateFieldProps['kind'];
    /** Bounds applied to both ends, on top of the from/to relationship. */
    min?: string;
    max?: string;
    invalid?: boolean;
    disabled?: boolean;
    fromLabel?: string;
    toLabel?: string;
    /** Word between the two fields. */
    separator?: string;
}

/**
 * Two fields that read as one control.
 *
 * The ends constrain each other — `from` becomes the `min` of `to`, and `to`
 * the `max` of `from` — so the native picker refuses to offer an inverted range
 * rather than letting one be submitted and rejected server-side.
 *
 * Each end keeps its own accessible name; "Start date"/"End date" announced as
 * two labelled fields is clearer to a screen reader than one control with a
 * composite value.
 */
export function DateRangeField({
    from,
    to,
    onFromChange,
    onToChange,
    kind = 'date',
    min,
    max,
    invalid = false,
    disabled = false,
    fromLabel = 'Start date',
    toLabel = 'End date',
    separator = 'to',
}: DateRangeFieldProps): ReactElement {
    return (
        <div className="wc-date-range">
            <span className="wc-date-field">
                <DateField
                    kind={kind}
                    aria-label={fromLabel}
                    value={from}
                    min={min}
                    max={to || max}
                    invalid={invalid}
                    disabled={disabled}
                    onChange={(event) => onFromChange(event.target.value)}
                />
            </span>

            <span className="wc-date-range-sep" aria-hidden="true">
                {separator}
            </span>

            <span className="wc-date-field">
                <DateField
                    kind={kind}
                    aria-label={toLabel}
                    value={to}
                    min={from || min}
                    max={max}
                    invalid={invalid}
                    disabled={disabled}
                    onChange={(event) => onToChange(event.target.value)}
                />
            </span>
        </div>
    );
}
