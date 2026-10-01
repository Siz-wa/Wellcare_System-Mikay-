// resources/js/lib/vitals.ts
// ─────────────────────────────────────────────────────────────────────────────
// The vitals payload carries provenance alongside the six measurements, and the
// two are not interchangeable. This module is where that distinction lives, so
// no reader has to remember it.

/**
 * How a set of vitals was obtained.
 *
 * The doctor on a video call cannot measure any of the six, so a virtual visit's
 * numbers are always something the patient read out. Telehealth documentation
 * guidance is consistent that patient-supplied readings must be identified as
 * such in the record — an unlabelled `120/80` is indistinguishable from one a
 * nurse took with a clinic cuff.
 *
 * `not_obtained` is the explicit form of an empty vitals form (the patient had
 * no cuff), as distinct from a blank one nobody filled in.
 *
 * Mirrors `ConsultationSession::VITALS_SOURCES`. The labels are NOT duplicated
 * here — the server sends them, as `vitalsSources` for form controls and
 * `sourceLabel` for display, so the vocabulary has exactly one owner.
 */
export type VitalsSource =
    | 'clinic_measured'
    | 'patient_reported'
    | 'home_device'
    | 'not_obtained';

/** The six things that are actually measured. `source` is not one of them. */
export const VITAL_MEASUREMENT_KEYS = [
    'bloodPressure',
    'heartRate',
    'temperature',
    'oxygenSaturation',
    'weight',
    'height',
] as const;

export type VitalMeasurementKey = (typeof VITAL_MEASUREMENT_KEYS)[number];

/**
 * Does this record hold an actual reading?
 *
 * Exists because the obvious spelling is wrong. Two views used to ask this with
 * `Object.values(vitals).some(Boolean)`, which was correct only while every key
 * in the object was a measurement. `source` broke that: it is populated on every
 * saved session, so the naive check reports "has vitals" for a consultation
 * where nothing was ever measured, and the UI then renders a Vitals panel of six
 * dashes. Iterate the named keys, never the object.
 */
export function hasAnyVital(
    vitals: Partial<Record<VitalMeasurementKey, string | null>> | null,
): boolean {
    if (!vitals) {
        return false;
    }

    return VITAL_MEASUREMENT_KEYS.some((key) => vitals[key]?.trim());
}
