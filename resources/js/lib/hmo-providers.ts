// resources/js/lib/hmo-providers.ts
//
// The HMO providers the clinic is accredited with — the one list, for every
// form that asks which one a patient carries.
//
// It previously lived only in the booking flow, where it was correctly a
// dropdown, while registration and the admin patient form asked for the same
// value as free text. The damage shows up a screen away: HR's approvals page
// builds its provider filter from `new Set()` over whatever was stored, so
// "Maxicare", "maxicare" and "Maxi care" become three filter entries over what
// is one caseload. Same reasoning as SPECIALTY_LABELS in ./specialties.

export interface HmoOption {
    value: string;
    label: string;
}

/**
 * The stored value for "Other" BEFORE the person has named their provider.
 *
 * It is a placeholder, not an answer — "other" on its own tells HR nothing at
 * the point they have to verify coverage. Every form that offers the option
 * therefore pairs it with a text field, and both the client validators and the
 * server rules refuse this bare value. See `splitHmoProvider` below.
 */
export const HMO_OTHER = 'other';

/** The accredited providers, without the "Other" escape hatch. */
export const HMO_NAMED_PROVIDERS: HmoOption[] = [
    { value: 'maxicare', label: 'Maxicare' },
    { value: 'medicard', label: 'Medicard' },
    { value: 'intellicare', label: 'Intellicare' },
    { value: 'philcare', label: 'PhilCare' },
    { value: 'carenet', label: 'CareNet' },
];

export const HMO_PROVIDERS: HmoOption[] = [
    ...HMO_NAMED_PROVIDERS,
    { value: HMO_OTHER, label: 'Other' },
];

/**
 * The same list with a leading placeholder, for a bare `<select>` that has no
 * separate placeholder prop of its own.
 */
export const hmoOptions: HmoOption[] = [
    { value: '', label: 'Select HMO provider' },
    ...HMO_PROVIDERS,
];

/**
 * Readable label for a stored provider; unknown values are shown as typed.
 *
 * Matched case-insensitively on purpose. The dropdown submits the slug
 * (`maxicare`) while the seeders and any hand-entered record carry the display
 * name (`Maxicare`), so an exact match rendered the same company two ways
 * depending on where the row came from — "Maxicare" on the booking review and
 * the doctor's queue, "maxicare" on the patient's LOA status page.
 */
export function hmoLabel(value: string): string {
    const needle = value.trim().toLowerCase();

    return (
        HMO_PROVIDERS.find((option) => option.value.toLowerCase() === needle)
            ?.label ??
        HMO_PROVIDERS.find((option) => option.label.toLowerCase() === needle)
            ?.label ??
        value
    );
}

/** Is this one of the accredited providers on the dropdown? */
export function isNamedHmoProvider(value: string): boolean {
    return HMO_NAMED_PROVIDERS.some((option) => option.value === value);
}

/**
 * True when the field holds "Other" with nothing typed after it.
 *
 * This is the case every validator has to reject: the person opened the
 * escape hatch and walked away, so the record would say "other" and the HR
 * officer verifying it would have no provider to call.
 */
export function isUnnamedHmoProvider(value: string): boolean {
    return value.trim() === HMO_OTHER;
}

/** The two controls one stored HMO string drives. */
export interface HmoProviderField {
    /** What the `<select>` shows. */
    selectValue: string;
    /** Whether to render the "please specify" text input. */
    showOther: boolean;
    /** What that text input shows — empty until they type. */
    otherValue: string;
    onSelectChange: (value: string) => void;
    onOtherChange: (value: string) => void;
}

/**
 * Split one stored HMO string into the two controls a person actually sees.
 *
 * Only ONE value is stored, and it is the provider's name: picking Maxicare
 * stores `maxicare`, and picking Other and typing "Sun Life Grepa" stores
 * exactly that. There is no second `hmo_other` column, and no migration —
 * every `hmo` rule in the application already accepts free text, and HR's
 * filter is better off grouping by what the patient actually carries than by
 * a row of indistinguishable "Other"s.
 *
 * `HMO_OTHER` is the one transient value: it means the dropdown is on "Other"
 * and the box below it is still empty.
 *
 * Deliberately a plain function rather than a hook — everything is derived from
 * the value the form already holds, so a sheet that reloads with a different
 * patient's record lands on the right control with no effect to synchronise it.
 */
export function splitHmoProvider(
    value: string,
    onChange: (value: string) => void,
): HmoProviderField {
    const showOther = value !== '' && !isNamedHmoProvider(value);

    return {
        selectValue: showOther ? HMO_OTHER : value,
        showOther,
        otherValue: value === HMO_OTHER ? '' : value,
        onSelectChange: onChange,
        // Clearing the box returns to the placeholder rather than to an empty
        // field, so the dropdown does not silently snap back to "Select HMO
        // provider" and lose the choice the person just made.
        onOtherChange: (text: string) =>
            onChange(text === '' ? HMO_OTHER : text),
    };
}
