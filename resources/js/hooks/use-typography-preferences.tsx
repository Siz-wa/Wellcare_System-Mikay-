import { useSyncExternalStore } from 'react';

/**
 * Reader-facing typography controls: text size and contrast.
 *
 * Both are stamped onto <html> as data attributes and read by
 * resources/css/base.css — `data-text-size` drives `--wc-text-scale`, which
 * multiplies the root font size and therefore the whole rem-based type scale;
 * `data-contrast` re-points the `--wc-text-*` tokens.
 *
 * The cookie is what lets HandleReadingPreferences stamp the correct value
 * server-side — a reader on 150% must never be shown a frame of 100% text
 * first. localStorage is the fallback for when the cookie jar is cleared but
 * the device preference survives.
 */

export type TextSize = 'base' | 'lg' | 'xl' | 'xxl';
export type Contrast = 'standard' | 'high';

export type TextSizeOption = {
    readonly value: TextSize;
    readonly label: string;
    readonly description: string;
};

/**
 * The steps match the `html[data-text-size]` rules in base.css. They compound
 * with the browser's own font-size setting rather than replacing it, so a
 * reader who has already enlarged text at the OS level keeps that gain.
 */
export const TEXT_SIZE_OPTIONS: readonly TextSizeOption[] = [
    { value: 'base', label: 'Default', description: '100%' },
    { value: 'lg', label: 'Large', description: '112%' },
    { value: 'xl', label: 'Larger', description: '125%' },
    { value: 'xxl', label: 'Largest', description: '150%' },
] as const;

export type UseTypographyPreferencesReturn = {
    readonly textSize: TextSize;
    readonly contrast: Contrast;
    readonly updateTextSize: (size: TextSize) => void;
    readonly updateContrast: (contrast: Contrast) => void;
};

const TEXT_SIZES: readonly TextSize[] = ['base', 'lg', 'xl', 'xxl'];
const CONTRASTS: readonly Contrast[] = ['standard', 'high'];

const listeners = new Set<() => void>();

let currentTextSize: TextSize = 'base';
let currentContrast: Contrast = 'standard';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const isTextSize = (value: unknown): value is TextSize =>
    typeof value === 'string' && TEXT_SIZES.includes(value as TextSize);

const isContrast = (value: unknown): value is Contrast =>
    typeof value === 'string' && CONTRASTS.includes(value as Contrast);

const getStoredTextSize = (): TextSize => {
    if (typeof window === 'undefined') {
        return 'base';
    }

    const stored = localStorage.getItem('text_size');

    return isTextSize(stored) ? stored : 'base';
};

const getStoredContrast = (): Contrast => {
    if (typeof window === 'undefined') {
        return 'standard';
    }

    const stored = localStorage.getItem('contrast');

    return isContrast(stored) ? stored : 'standard';
};

const applyTextSize = (size: TextSize): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.textSize = size;
};

const applyContrast = (contrast: Contrast): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.contrast = contrast;
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

/**
 * Called once from app.tsx during boot.
 *
 * The server has already stamped both attributes from the cookie, so this only
 * re-syncs from localStorage — which matters when the cookie was dropped (a
 * privacy mode, a cleared jar) but the device preference survived.
 */
export function initializeTypographyPreferences(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentTextSize = getStoredTextSize();
    currentContrast = getStoredContrast();

    applyTextSize(currentTextSize);
    applyContrast(currentContrast);

    setCookie('text_size', currentTextSize);
    setCookie('contrast', currentContrast);
}

export function useTypographyPreferences(): UseTypographyPreferencesReturn {
    const textSize = useSyncExternalStore(
        subscribe,
        () => currentTextSize,
        () => 'base' as TextSize,
    );

    const contrast = useSyncExternalStore(
        subscribe,
        () => currentContrast,
        () => 'standard' as Contrast,
    );

    const updateTextSize = (size: TextSize): void => {
        currentTextSize = size;

        localStorage.setItem('text_size', size);
        setCookie('text_size', size);

        applyTextSize(size);
        notify();
    };

    const updateContrast = (next: Contrast): void => {
        currentContrast = next;

        localStorage.setItem('contrast', next);
        setCookie('contrast', next);

        applyContrast(next);
        notify();
    };

    return { textSize, contrast, updateTextSize, updateContrast } as const;
}
