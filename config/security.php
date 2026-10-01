<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Idle timeout, per role
    |--------------------------------------------------------------------------
    |
    | GV-8 in WELLCARE-GOVERNANCE-PLAN.md (carried from compliance plan H-2).
    |
    | `SESSION_LIFETIME` is a single number applied to every account, and
    | Laravel's lifetime is genuinely idle-based, so 120 minutes was already a
    | real two-hour idle timeout. The problem is that it was the SAME two hours
    | for a shared clinic workstation and for a patient's own phone.
    |
    | Those two are not the same risk. A workstation at a reception desk is
    | walked away from, in a room with other people in it, and the account
    | signed into it can open other people's records. A patient's phone is in
    | their pocket, and the account on it reaches one family's chart. Charging
    | the patient the same inconvenience buys nothing and costs access to care
    | for exactly the people least able to work around a login wall.
    |
    | So the obligation follows the blast radius, the same asymmetry
    | EnsureTwoFactorEnrolled uses for MFA.
    |
    | ── These are IDLE minutes, not absolute session length ──────────────────
    |
    | The clock resets on every request. A doctor working continuously is never
    | logged out; a doctor who walks away mid-consultation is. ONC
    | §170.315(d)(5) ("automatic access time-out") asks for exactly this shape.
    |
    | A role absent from this map falls back to `default` below, and `default`
    | is deliberately the LONGEST value here — a new role that nobody thought
    | about gets the patient's treatment, which is an inconvenience question
    | rather than a lockout. Add privileged roles explicitly.
    |
    */

    'idle_timeout_minutes' => [

        /*
         * The control plane. Shortest window in the table: these accounts
         * cannot open a chart, but they can decide who can, and an unattended
         * owner session is the one that can quietly appoint an administrator.
         */
        'owner' => (int) env('IDLE_TIMEOUT_OWNER', 15),

        /*
         * Reads the audit trails, including the record-access log — which is a
         * map of who consulted whom, and a disclosure in its own right.
         */
        'dpo' => (int) env('IDLE_TIMEOUT_DPO', 15),

        /*
         * Account provisioning, credentialing, the patient roster, the archive.
         */
        'admin' => (int) env('IDLE_TIMEOUT_ADMIN', 20),

        /*
         * Clinical staff on shared workstations. Longer than the admin window
         * on purpose and after a real trade-off: a clinician re-authenticating
         * mid-consultation in front of a patient is a genuine care cost, and
         * these accounts are also the ones already carrying mandatory 2FA and
         * per-record authorization through PatientPolicy.
         *
         * 30 minutes is a judgement, not a standard. It is the kind of figure
         * the clinic's DPO should overrule with a policy — see GD-6 in §7 of
         * the governance plan.
         */
        'doctor' => (int) env('IDLE_TIMEOUT_DOCTOR', 30),
        'nurse' => (int) env('IDLE_TIMEOUT_NURSE', 30),

        /*
         * Handles LOA decisions and reads coverage data. Back-office rather
         * than bedside, so it can afford the shorter window a desk allows.
         */
        'hr' => (int) env('IDLE_TIMEOUT_HR', 20),

        /*
         * The patient's own phone. Left at the framework default — see the
         * asymmetry argument at the top of this file.
         */
        'user' => (int) env('IDLE_TIMEOUT_USER', 120),
    ],

    /*
    | Fallback for any role not named above, and for an account holding no role
    | at all. The longest value in the table, fail-open on convenience rather
    | than fail-closed on access — a role nobody classified must not silently
    | acquire a fifteen-minute timeout and generate support calls nobody can
    | explain.
    */

    'idle_timeout_default' => (int) env('IDLE_TIMEOUT_DEFAULT', 120),

    /*
    |--------------------------------------------------------------------------
    | Who may open a patient's full record
    |--------------------------------------------------------------------------
    |
    | Off (the default): any doctor or nurse can open any chart, and every open
    | is written to the access log with whether a care relationship existed.
    | The DPO reviews the ones without one. This suits a small clinic where
    | cover between doctors is routine.
    |
    | On: a doctor can open only the charts of patients booked with them. The
    | Data Privacy Act's "need to know" reading; the cost is that covering a
    | colleague's walk-in requires the patient to be booked to you first.
    | Nurses keep clinic-wide access, since they serve every doctor's patients.
    |
    | A policy decision for the clinic, not a technical default. See the QA
    | report, gap G-8.
    |
    */

    'records_care_team_only' => (bool) env('RECORDS_CARE_TEAM_ONLY', false),

];
