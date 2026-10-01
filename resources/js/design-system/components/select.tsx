// resources/js/design-system/components/select.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The one dropdown in this product.
//
// Before this, a select could be any of five things: a native `<select>` with
// `wc-input wc-select`, a native one with `wc-input` alone (no chevron gutter,
// so the value ran under the browser's own arrow), a native one styled entirely
// from an inline object, a bespoke `BrandSelect` in the booking flow, or raw
// shadcn primitives. They disagreed on height, radius, font size and focus
// treatment, and several pinned a width too narrow for their own longest
// option — which is how a value ended up unreadable.
//
// Radix rather than a native `<select>`, because a native select's dropped list
// is operating-system chrome: it renders in the system font at the system size,
// ignores the brand tokens, cannot wrap a long label, and does not scale with
// the in-app Text size control. Radix renders real DOM, so the list obeys all
// four.

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { CSSProperties, ReactElement, SelectHTMLAttributes } from 'react';
import { useId } from 'react';

export interface SelectOption {
    value: string;
    label: string;
    /** Secondary line under the label, for disambiguating similar options. */
    hint?: string;
    disabled?: boolean;
}

export interface SelectOptionGroup {
    label: string;
    options: SelectOption[];
}

export interface SelectProps {
    /**
     * Controlled value. Omit it and pass `defaultValue` instead for the plain
     * HTML forms that POST their own fields — Radix renders a hidden input from
     * `name`, so those keep working without lifting state.
     */
    value?: string;
    onChange?: (value: string) => void;
    /** Uncontrolled starting value. Ignored when `value` is supplied. */
    defaultValue?: string;
    /** A flat list, or groups with headings. */
    options: SelectOption[] | SelectOptionGroup[];
    /** Shown when nothing is chosen. */
    placeholder?: string;
    /** Renders the error border. Pair with `Field`'s `error` for the message. */
    invalid?: boolean;
    disabled?: boolean;
    name?: string;
    id?: string;
    required?: boolean;
    /** Needed only when there is no visible `<label>` pointing at the trigger. */
    'aria-label'?: string;
    'aria-describedby'?: string;
    /** Sits on a dark surface (a brand panel or sidebar). */
    dark?: boolean;
    className?: string;
    /** Escape hatch for width in a filter bar. Height is never overridable. */
    style?: CSSProperties;
}

function isGrouped(
    options: SelectOption[] | SelectOptionGroup[],
): options is SelectOptionGroup[] {
    return options.length > 0 && 'options' in options[0];
}

function flatten(
    options: SelectOption[] | SelectOptionGroup[],
): SelectOption[] {
    return isGrouped(options) ? options.flatMap((g) => g.options) : options;
}

function Option({ option }: { option: SelectOption }): ReactElement {
    return (
        <SelectPrimitive.Item
            value={option.value}
            disabled={option.disabled}
            className="wc-select-item"
        >
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            {option.hint && (
                <span className="wc-select-item-hint">{option.hint}</span>
            )}
            <SelectPrimitive.ItemIndicator className="wc-select-item-check">
                <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    );
}

export function Select({
    value,
    onChange,
    defaultValue,
    options,
    placeholder = 'Select…',
    invalid = false,
    disabled = false,
    name,
    id,
    required,
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
    dark = false,
    className = '',
    style,
}: SelectProps): ReactElement {
    const generatedId = useId();
    const triggerId = id ?? `wc-select-${generatedId}`;

    /*
      Radix reserves "" for "nothing selected", so an option with an empty value
      cannot be a row. That is what such an option always meant anyway — "All
      providers", "Any status" — so it becomes the placeholder instead of being
      silently dropped.
    */
    const blank = flatten(options).find((option) => option.value === '');
    const resolvedPlaceholder = blank?.label ?? placeholder;

    const groups: SelectOptionGroup[] = isGrouped(options)
        ? options.map((group) => ({
              ...group,
              options: group.options.filter((o) => o.value !== ''),
          }))
        : [{ label: '', options: options.filter((o) => o.value !== '') }];

    const controlled = value !== undefined;
    const selected = flatten(options).find(
        (option) => option.value === (controlled ? value : defaultValue),
    );

    const triggerClasses = [
        'wc-input',
        'wc-select-trigger',
        dark ? 'wc-input-dark' : '',
        invalid ? 'wc-input-error' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <SelectPrimitive.Root
            {...(controlled
                ? { value: value || undefined, onValueChange: onChange }
                : {
                      defaultValue: defaultValue || undefined,
                      onValueChange: onChange,
                  })}
            disabled={disabled}
            name={name}
            required={required}
        >
            <SelectPrimitive.Trigger
                id={triggerId}
                aria-label={ariaLabel}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                /* The trigger truncates to one line, so the full text has to be
                   reachable some other way for anyone who cannot open the list
                   to read it. */
                title={selected?.label}
                className={triggerClasses}
                style={style}
            >
                <SelectPrimitive.Value
                    className="wc-select-trigger-value"
                    placeholder={resolvedPlaceholder}
                />
                <SelectPrimitive.Icon asChild>
                    <ChevronDown
                        className="wc-select-trigger-icon"
                        aria-hidden="true"
                    />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    /* `popper` keeps the panel anchored to the trigger, and
                       collision avoidance flips it above when there is no room
                       below. Stock shadcn disables that, which is why a select
                       near the bottom of a long form used to open off-screen. */
                    position="popper"
                    sideOffset={6}
                    align="start"
                    avoidCollisions
                    className="wc-select-panel"
                >
                    <SelectPrimitive.Viewport>
                        {groups.map((group, index) => (
                            <SelectPrimitive.Group key={group.label || index}>
                                {group.label && (
                                    <SelectPrimitive.Label className="wc-select-group-label">
                                        {group.label}
                                    </SelectPrimitive.Label>
                                )}
                                {group.options.map((option) => (
                                    <Option
                                        key={option.value}
                                        option={option}
                                    />
                                ))}
                            </SelectPrimitive.Group>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

/**
 * A native `<select>` wearing the same box.
 *
 * Reach for this only where the operating system's own picker is genuinely
 * better than a list — a long scrolling wheel on a phone, say. Everything else
 * should use `Select` above so the open list stays inside the design system.
 */
export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: SelectOption[];
    placeholder?: string;
    invalid?: boolean;
    dark?: boolean;
}

export function NativeSelect({
    options,
    placeholder,
    invalid = false,
    dark = false,
    className = '',
    ...props
}: NativeSelectProps): ReactElement {
    const classes = [
        'wc-input',
        'wc-select',
        dark ? 'wc-input-dark' : '',
        invalid ? 'wc-input-error' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <select
            className={classes}
            aria-invalid={invalid || undefined}
            {...props}
        >
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                >
                    {option.label}
                </option>
            ))}
        </select>
    );
}
