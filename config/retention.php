<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Medical record retention, per record class
    |--------------------------------------------------------------------------
    |
    | ND-6 in WELLCARE-COMPLIANCE-PLAN.md.
    |
    | This was a single `medical_records_years` integer applied to everything.
    | That shape cannot express Philippine law: DOH AO 2022-0007 ("Philippine
    | Standards on the Retention Period of Documents, Records, Slides and
    | Specimens in Clinical Laboratories") sets retention PER DOCUMENT TYPE, and
    | WellCare is a clinic AND laboratory. One number for the whole database
    | either over-retains the lab paperwork or under-retains the chart.
    |
    | Each entry below is a whole-year period counted from the record's own
    | anchor date — see ProtectsRetainedRecords::retentionAnchorDate(), which
    | every using model overrides. The clock runs from the LAST ENCOUNTER, not
    | from record creation, so an active patient's record never becomes
    | purgeable while they are still being seen.
    |
    | ── ⚠️ These figures are NOT verified against primary sources ────────────
    |
    | They were researched from secondary reporting of DOH issuances. The
    | primary PDFs (AO 2022-0007 Annex A; the Records Disposition Schedule under
    | DC 2021-0226) could not be parsed and have NOT been read directly.
    |
    | Nothing in this repository can verify a statutory period. Every value here
    | must be confirmed by the clinic's Data Protection Officer or counsel
    | before `purge_enabled` is ever turned on. See the `sources` key below for
    | what each figure is based on, so the DPO can check them one at a time
    | rather than re-deriving the set.
    |
    */

    'periods' => [

        /*
         * The clinical record itself — the Patient row and its allergies,
         * diagnoses and consultation history.
         *
         * ── An unresolved conflict, deliberately resolved upward ────────────
         *
         * Sources disagree. The DOH Records Disposition Schedule is reported as
         * setting OUTPATIENT records at 7 years from last consultation (and
         * inpatient at 10). Other guidance is reported as 15 years for adult
         * records. WellCare is outpatient, which argues for 7.
         *
         * 15 is kept anyway, because the two errors are not symmetric:
         *
         *   • Retaining too long is a data-minimisation problem under RA 10173.
         *     It is a finding. It is fixable the day it is noticed.
         *   • Purging too early destroys medical records that the law required
         *     the clinic to hold. It is unfixable, and it is the more serious
         *     of the two by a wide margin.
         *
         * So the longer figure stands until someone reads the primary source.
         * This is a deliberate over-retention with a known reason, not an
         * unexamined default — and it is exactly the decision a DPO should
         * overturn with a citation rather than an engineer with a search result.
         */
        'clinical_record' => (int) env('RETENTION_CLINICAL_RECORD_YEARS', 15),

        /*
         * Laboratory result reports and their request forms.
         *
         * AO 2022-0007 is reported as setting these at 2 years active plus 2
         * years in storage. Both phases are retention as far as this
         * application is concerned — the row exists either way — so the period
         * is their sum.
         *
         * NOTE: this is materially shorter than the clinical record above, and
         * that is the whole point of splitting them. Confirm before arming.
         */
        'lab_document' => (int) env('RETENTION_LAB_DOCUMENT_YEARS', 4),

        /*
         * Laboratory record books / registries — the running log of tests
         * performed, as distinct from an individual patient's report.
         * AO 2022-0007 is reported as 5 years.
         */
        'lab_logbook' => (int) env('RETENTION_LAB_LOGBOOK_YEARS', 5),

        /*
         * Histopathology and cytology reports, which AO 2022-0007 is reported
         * as holding far longer than routine chemistry: 5 active + 5 storage
         * for cytology and surgical pathology, 10 + 10 for cytogenetics.
         *
         * Set to the longer of those. WellCare does not currently record a
         * pathology subtype, so one figure covers the class; split this the day
         * the distinction is modelled.
         */
        'pathology_report' => (int) env('RETENTION_PATHOLOGY_YEARS', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | The period applied to anything not classified above
    |--------------------------------------------------------------------------
    |
    | Deliberately the LONGEST period in the table, not the shortest and not an
    | average.
    |
    | This is the same fail-closed direction as ProtectsRetainedRecords'
    | null anchor, and for the same reason: a record whose class nobody thought
    | about must be kept too long rather than destroyed too early. A new model
    | that forgets to declare `retentionPeriodKey()` is then a storage cost, not
    | a records-destruction incident.
    |
    */

    'default_period' => 'pathology_report',

    /*
    |--------------------------------------------------------------------------
    | Where each figure came from
    |--------------------------------------------------------------------------
    |
    | Carried in config rather than in a comment so `wellcare:records:purge`
    | can print it. A number a clinic is asked to trust should arrive with its
    | provenance attached, and every one of these is pending confirmation.
    |
    */

    'sources' => [
        'clinical_record' => 'DOH Records Disposition Schedule (DC 2021-0226) — CONFLICTED: reported as 7y outpatient / 15y adult. Using the longer figure pending confirmation.',
        'lab_document' => 'DOH AO 2022-0007 Annex A — reported as 2y active + 2y storage. UNVERIFIED.',
        'lab_logbook' => 'DOH AO 2022-0007 Annex A — reported as 5y for record books. UNVERIFIED.',
        'pathology_report' => 'DOH AO 2022-0007 Annex A — reported as 5+5 cytology / 10+10 cytogenetics. Using the longer. UNVERIFIED.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit trail retention
    |--------------------------------------------------------------------------
    |
    | ND-3. Two opposing pulls: accountability wants these kept long enough to
    | investigate an incident nobody has noticed yet, and data minimisation
    | wants them gone. Both `activity_log` and `record_access_log` name real
    | people and what they did.
    |
    | 7 years is a deliberate midpoint — long enough to outlive any plausible
    | investigation window, short enough that the tables are not a permanent
    | shadow copy of who read what. It is NOT a statutory figure.
    |
    | Shorter than every clinical period above on purpose: the record is the
    | clinical obligation; the log of who touched it is a security control with
    | a much shorter useful life.
    |
    */

    'audit_log_years' => (int) env('RETENTION_AUDIT_LOG_YEARS', 7),

    /*
    |--------------------------------------------------------------------------
    | Purge safety
    |--------------------------------------------------------------------------
    |
    | `wellcare:records:purge` reports and does nothing unless BOTH this flag is
    | true and the command is given --force. Two locks rather than one, because
    | the command permanently destroys medical records and the cost of running
    | it by accident is unbounded.
    |
    | Left false, and it must STAY false until the figures above have been
    | confirmed against primary sources. The command prints that warning itself.
    |
    */

    'purge_enabled' => (bool) env('RETENTION_PURGE_ENABLED', false),

];
