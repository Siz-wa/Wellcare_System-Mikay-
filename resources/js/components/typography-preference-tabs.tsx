import type { ReactElement } from 'react';
import type { Contrast, TextSize } from '@/hooks/use-typography-preferences';
import {
    TEXT_SIZE_OPTIONS,
    useTypographyPreferences,
} from '@/hooks/use-typography-preferences';
import { cn } from '@/lib/utils';

/**
 * Reader controls for text size and contrast.
 *
 * Built as real radio groups rather than a row of buttons: a screen-reader user
 * needs to hear "Larger, 3 of 4" and arrow between the options, which is the
 * behaviour browsers give to `role="radio"` for free. The whole group is also
 * one tab stop, so a keyboard user does not have to tab past four controls to
 * leave it.
 */

type OptionButtonProps = {
    readonly selected: boolean;
    readonly label: string;
    readonly description: string;
    readonly onSelect: () => void;
    /** Rendered at the option's own size, so the control previews its effect. */
    readonly previewSize?: string;
};

function OptionButton({
    selected,
    label,
    description,
    onSelect,
    previewSize,
}: OptionButtonProps): ReactElement {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={onSelect}
            className={cn(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-4 py-2 transition-colors',
                selected
                    ? 'border-wc-blue-600 bg-wc-blue-50 text-wc-blue-800'
                    : 'border-transparent bg-transparent text-ink-secondary hover:bg-wc-blue-50/60 hover:text-wc-blue-800',
            )}
        >
            <span
                className="font-semibold"
                style={previewSize ? { fontSize: previewSize } : undefined}
            >
                {label}
            </span>
            <span className="text-xs text-ink-muted">{description}</span>
        </button>
    );
}

export function TextSizeTabs(): ReactElement {
    const { textSize, updateTextSize } = useTypographyPreferences();

    /* Each option renders its own label at the size it applies, so the choice is
       previewed rather than described. `em` keeps it proportional if the reader
       has already enlarged the page. */
    const preview: Record<TextSize, string> = {
        base: '1em',
        lg: '1.125em',
        xl: '1.25em',
        xxl: '1.5em',
    };

    return (
        <div
            role="radiogroup"
            aria-label="Text size"
            className="flex w-full flex-wrap gap-1 rounded-xl border border-wc-blue-100 bg-white p-1"
        >
            {TEXT_SIZE_OPTIONS.map(({ value, label, description }) => (
                <OptionButton
                    key={value}
                    selected={textSize === value}
                    label={label}
                    description={description}
                    previewSize={preview[value]}
                    onSelect={() => updateTextSize(value)}
                />
            ))}
        </div>
    );
}

export function ContrastTabs(): ReactElement {
    const { contrast, updateContrast } = useTypographyPreferences();

    const options: {
        value: Contrast;
        label: string;
        description: string;
    }[] = [
        {
            value: 'standard',
            label: 'Standard',
            description: 'AAA on white',
        },
        {
            value: 'high',
            label: 'High contrast',
            description: 'Maximum separation',
        },
    ];

    return (
        <div
            role="radiogroup"
            aria-label="Contrast"
            className="flex w-full flex-wrap gap-1 rounded-xl border border-wc-blue-100 bg-white p-1"
        >
            {options.map(({ value, label, description }) => (
                <OptionButton
                    key={value}
                    selected={contrast === value}
                    label={label}
                    description={description}
                    onSelect={() => updateContrast(value)}
                />
            ))}
        </div>
    );
}
