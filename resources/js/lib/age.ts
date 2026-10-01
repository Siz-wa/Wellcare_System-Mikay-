// resources/js/lib/age.ts
//
// Age is arithmetic on a birthdate, never a field. A typed age is correct only
// on the day it is typed, and a record holding both an editable age and a
// birthdate eventually disagrees with itself.
//
// The booking sheet already treated it this way; this module is where the
// calculation moved so the admin patient form can do the same instead of
// offering a second, editable answer to the same question.

/** Whole years between an ISO `YYYY-MM-DD` birthdate and today, or null. */
export function ageFromBirthdate(iso: string): number | null {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');

    if (!parts) {
        return null;
    }

    const [year, month, day] = [
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
    ];
    const now = new Date();
    let age = now.getFullYear() - year;

    const beforeBirthday =
        now.getMonth() + 1 < month ||
        (now.getMonth() + 1 === month && now.getDate() < day);

    if (beforeBirthday) {
        age -= 1;
    }

    return age < 0 || age > 120 ? null : age;
}
