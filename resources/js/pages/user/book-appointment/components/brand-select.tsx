// resources/js/pages/user/book-appointment/components/brand-select.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A dropdown whose open list is ours rather than the operating system's.
//
// A native <select> can only be styled while closed: `.wc-select` paints the
// control, but the list that drops out of it is OS chrome — white rows, a system
// highlight, its own font — which reads as a different application inside a
// branded panel, and inside a sheet it also punches through the layout.
//
// Radix renders the list as real DOM in a portal, so it takes the Wellcare
// tokens and animates with the rest of the panel. The trigger deliberately keeps
// the `wc-input` look so it sits flush with the text fields beside it.

import type { ReactElement } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SelectOption } from '@/pages/user/book-appointment/sections/bookingdata';

interface BrandSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    /** Shown when nothing is chosen. Defaults to the blank option's label. */
    placeholder?: string;
    invalid?: boolean;
    'aria-label'?: string;
}

/**
 * Radix has no concept of an item with an empty value — it reserves "" for
 * "nothing selected" — so a blank option in the list becomes the placeholder
 * instead of a row, which is what it always meant anyway.
 */
export function BrandSelect({
    value,
    onChange,
    options,
    placeholder,
    invalid = false,
    'aria-label': ariaLabel,
}: BrandSelectProps): ReactElement {
    const blank = options.find((o) => o.value === '');
    const items = options.filter((o) => o.value !== '');

    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger
                aria-label={ariaLabel}
                aria-invalid={invalid || undefined}
                className="wc-input"
                style={{
                    width: '100%',
                    height: 'auto',
                    justifyContent: 'space-between',
                    borderColor: invalid
                        ? 'var(--wc-error)'
                        : 'var(--wc-gray-200)',
                }}
            >
                <SelectValue
                    placeholder={placeholder ?? blank?.label ?? 'Select…'}
                />
            </SelectTrigger>

            <SelectContent
                style={{
                    background: '#ffffff',
                    border: '1px solid var(--wc-gray-200)',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-md)',
                }}
            >
                {items.map((o) => (
                    <SelectItem
                        key={o.value}
                        value={o.value}
                        className="wc-select-item"
                    >
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
