// resources/js/lib/input-masks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sanitizers for fields that hold a number, an identifier or a reading rather
// than prose.
//
// These run on every keystroke, so an unwanted character never reaches the
// field in the first place. That is deliberately not the same job as
// validation: the rules in app/Http/Requests decide whether a *complete* value
// is acceptable, and they stay the authority. What these do is stop a heart
// rate of "abcdefghij" from being typeable at all — which the server rule
// behind the consultation editor did not, and still would not, catch.
//
// `type="number"` is not used for any of this. It permits `e`, `+` and `-`,
// its scroll wheel silently edits a focused field, and a browser reports a
// value it considers half-typed (`12e`) as the empty string — which a
// controlled React input then writes back, clearing the field under the user.
// `inputMode` gets the numeric keypad on mobile without any of that.

/** Digits only, optionally capped. */
export function digitsOnly(raw: string, maxLength = Infinity): string {
    return raw.replace(/\D/g, '').slice(0, maxLength);
}

/**
 * Digits and at most one decimal point.
 *
 * A trailing point survives so `36.` is typeable on the way to `36.5`.
 */
export function decimalOnly(raw: string, maxLength = Infinity): string {
    const [head, ...rest] = raw.replace(/[^\d.]/g, '').split('.');
    const joined = rest.length > 0 ? `${head}.${rest.join('')}` : head;

    return joined.slice(0, maxLength);
}

/**
 * A PH mobile number, reduced to the `09XXXXXXXXX` the server stores.
 *
 * Used for typing *and* pasting. People paste numbers out of their contacts
 * with spaces, dashes and a `+63` country code, and out of an HMO card without
 * the trunk `0` — rejecting those shapes produces an error message where a
 * silent normalization would do. Postel's law, applied to a phone field.
 *
 * The `63` → `0` swap waits until the digits are long enough to be
 * unambiguous, so a number typed left-to-right is not rewritten mid-keystroke;
 * it settles the moment the twelfth digit lands.
 */
export function normalizePhMobile(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    // +639XXXXXXXXX / 639XXXXXXXXX
    if (digits.length >= 12 && digits.startsWith('639')) {
        return `0${digits.slice(2, 12)}`;
    }

    // 9XXXXXXXXX — how the number is printed when the trunk 0 is dropped.
    if (digits.length === 10 && digits.startsWith('9')) {
        return `0${digits}`;
    }

    return digits.slice(0, 11);
}

/**
 * A `systolic/diastolic` reading.
 *
 * One field rather than two segmented ones, because the column, the payload
 * key and every existing row are a single string — splitting the control is a
 * schema conversation, not an input fix. Three digits a side is the physical
 * bound of a cuff reading.
 */
export function bloodPressureOnly(raw: string): string {
    const [head, ...rest] = raw.replace(/[^\d/]/g, '').split('/');

    return rest.length > 0
        ? `${head.slice(0, 3)}/${rest.join('').slice(0, 3)}`
        : head.slice(0, 3);
}

/**
 * HMO ID — PH HMO format: uppercase alphanumeric + hyphens, max 20 chars.
 * Examples: MC-123456 (Maxicare), IC-987654321 (Intellicare)
 */
export function sanitizeHmoId(raw: string): string {
    return raw
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 20);
}

/**
 * A PRC registration number: seven digits, nothing else.
 */
export function sanitizePrcLicense(raw: string): string {
    return digitsOnly(raw, 7);
}

/**
 * An `onInput` handler for an *uncontrolled* input — one on `defaultValue`,
 * submitted natively rather than held in React state.
 *
 * Writes the sanitized value straight back to the DOM node. The write only
 * happens when the sanitizer actually changed something, so the caret is left
 * alone on every keystroke that was already valid.
 */
export function sanitizeOnInput(sanitize: (value: string) => string) {
    return (e: React.FormEvent<HTMLInputElement>) => {
        const element = e.currentTarget;
        const next = sanitize(element.value);

        if (next !== element.value) {
            element.value = next;
        }
    };
}

/**
 * Returns an onPaste handler that blocks the raw browser paste,
 * applies a sanitizer to the clipboard text, then calls the setter.
 *
 * Needed because a paste replaces the whole value in one event: an onChange
 * sanitizer sees the result and cleans it, but only after React has already
 * been handed the unsanitized string.
 */
export function makePasteHandler(
    sanitize: (v: string) => string,
    setter: (v: string) => void,
) {
    return (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        setter(sanitize(e.clipboardData.getData('text')));
    };
}
