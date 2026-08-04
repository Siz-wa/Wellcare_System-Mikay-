// resources/js/pages/generals/book-appointment/utils/sanitizers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input sanitizer functions used across booking form fields.
// All are pure functions — no side effects, easily testable.

/**
 * HMO ID sanitizer — PH HMO format:
 * Uppercase alphanumeric + hyphens, max 20 chars.
 * Examples: MC-123456 (Maxicare), IC-987654321 (Intellicare)
 */
export function sanitizeHmoId(raw: string): string {
    return raw
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 20);
}

/**
 * Returns an onPaste handler that blocks the raw browser paste,
 * applies a sanitizer to the clipboard text, then calls the setter.
 * Use this on any input that needs paste sanitization.
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
