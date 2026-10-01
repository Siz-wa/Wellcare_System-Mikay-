// resources/js/lib/local-date.ts
//
// Calendar dates for <input type="date">, read in the clinic's local time.
//
// `new Date().toISOString()` is UTC. In the Philippines (UTC+8) it reports
// yesterday until 08:00, and a local-midnight Date converted with it lands on
// the previous day. Both produced real defects: a doctor could not record
// today's diagnosis before 8 AM, and saving a patient's details moved their
// birthdate back one day on every save.

/** `YYYY-MM-DD` for a Date, using its local calendar fields. */
export function localIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

/** Today's date in the viewer's local time, as `YYYY-MM-DD`. */
export function todayIsoDate(): string {
    return localIsoDate(new Date());
}

/**
 * `2026-10-01` → `Thu, 1 October 2026`, read as a calendar date (no timezone
 * shift). Returns the input unchanged if it is not an ISO date.
 */
export function formatIsoDate(iso: string): string {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');

    if (!parts) {
        return iso;
    }

    const date = new Date(
        Number(parts[1]),
        Number(parts[2]) - 1,
        Number(parts[3]),
    );

    return date.toLocaleDateString('en-PH', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * A server date string (`YYYY-MM-DD`, an ISO timestamp, or a display form such
 * as `15 May 1995`) as the `YYYY-MM-DD` an <input type="date"> needs.
 *
 * An ISO date is returned as-is rather than parsed: `new Date('1995-05-15')`
 * is UTC midnight, which is the previous evening in a western timezone.
 */
export function toDateInputValue(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value);

    if (iso) {
        return iso[1];
    }

    // Display strings parse as local midnight, so local getters are exact.
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? '' : localIsoDate(parsed);
}
