# WellCare Capstone — Build Plan & Running Log

> **Document ↔ Diagram ↔ Codebase cross-reference, and the living record of what
> gets built from here.** Created 2026-07-31.

---

## 0. THE LIVING LOG — read this first

**This file is not a static plan. It is a running log.**

> ### Logging protocol — binding for the rest of this project
>
> **After every completed unit of work — every phase, every sub-task, every
> migration, every bug fix, every decision — this file gets updated in the same
> turn, before reporting completion.**
>
> Each entry appends to the **Change Log** at the bottom of this file:
>
> ```markdown
> ### YYYY-MM-DD — <short title>
> **Phase:** <n> · **Status:** done | partial | blocked | reverted
> **Changed:** <files touched, as repo-relative paths>
> **Why:** <the reason, one or two sentences>
> **Verified:** <command run + actual result — "8 passed" not "tests pass">
> **Blocked / left out:** <anything deferred, and why — omit only if nothing was>
> ```
>
> Alongside the append, the affected rows of the **coverage scorecard (§8)** and
> the checkbox for that item in the **build order (§9)** are updated in place, so
> the top of this file always reflects reality without needing to read the log.
>
> Rules:
> - Log what *actually* happened, including failures, reverts, and dead ends.
>   A log that only records successes is worthless for a defense.
> - "Verified" quotes real output. Never write it before running the command.
> - If a document correction from §6 gets made, log that too — the paper and the
>   code drift apart otherwise, which is the exact problem this file exists to
>   prevent.
> - If a decision from §11 is reversed, append a new entry explaining why rather
>   than editing the old one.

This file doubles as the audit trail for Chapter 3's development narrative — the
paper currently has no evidence of iterative Agile work, and dated entries are
that evidence.

---

## Context

Group 5's capstone (Danao, Melchor, Parpan — BSIS, KLD, Feb 2026) documents a
*Patient Record Management System with Appointment Scheduling* for WellCare
Clinics & Laboratory, WalterMart Dasmariñas. Three artifacts describe it:

| Artifact | What it is |
|---|---|
| `DIAGRAM.png` | Hand-drawn Level-1 DFD — the pen-and-paper source of Figure 6 |
| `Group 5 chapter 123.docx` | Chapters 1–3: objectives, RRL, methodology, **17 numbered figures across 18 captions** (two are both "Figure 1"), **8 numbered tables** + 1 unnumbered RRL synthesis matrix |
| This repo | Laravel 12 + Inertia 2 + React 19 monolith, MySQL |

Goal of this pass: **map the territory before building.** Establish exactly what
the paper promises, what the diagrams model, what actually exists in code, and
where the three disagree — so the remaining build is aimed at real gaps rather
than re-deriving what is already done.

> ### Citation key — the document's own numbering
>
> Corrected 2026-07-31 after a full re-verification pass. The first version of
> this file cited every test table one number too high. **Always cite the
> document's own caption, not a running count.**
>
> | # | Caption in the docx |
> |---|---|
> | Table 1 | hardware requirements |
> | Table 2 | Software Requirements |
> | Table 3 | Unit Testing for Patients |
> | Table 4 | Unit Testing for Doctor Module |
> | Table 5 | Unit Testing for Staff/Nurse Module |
> | Table 6 | Unit Testing for HR Module |
> | Table 7 | Integration (of the system) |
> | Table 8 | System Testing (of the system) |
>
> **There is no Table 9.** The Ch. 2 synthesis matrix is uncaptioned and takes no
> number. Figures run 1–17, with the Conceptual Framework and the Agile Lifecycle
> both labelled "Figure 1"; Figures 12–17 are the UI screenshots (§2a).

---

## 1. DIAGRAM.png ↔ Figure 6 (the digital DFD)

`DIAGRAM.png` is the **hand-drawn original** of Figure 6 (`image7.png`). Same
seven processes, same four data stores, same order. Differences worth knowing:

| | Hand-drawn | Figure 6 (digital) |
|---|---|---|
| Process numbers | Present (1,2,3,4,5,6,7) | **Dropped entirely** |
| Store after APPROVE LOA | `TB3 PATIENT RECORDS` | `TB3 PATIENT PROCESS` ← typo |
| Store after CONDUCT CONSULTATION | `TB9 PATIENT RECORDS` ← typo (should be TB3) | `TB3 PATIENT RECORDS` (fixed) |
| Long return curve from lab area back toward the top-right | Present | **Dropped** |
| Second `DOCTOR` entity feeding RECORD LAB RESULT | Absent | Added |

**Notation problems present in both versions** (these are defense-panel bait):

1. **No login/authentication process**, even though every role-level DFD
   (Figures 8–11) opens with one.
2. **No return flows to PATIENT.** The patient submits registration, an
   appointment request and an LOA request, and receives *nothing* back. Figures 4
   and 11 both show confirmations, lab results and LOA status flowing back — so
   Figure 6 contradicts them.
3. **`HR ADMIN` is drawn as an external entity that outputs into process 4
   ("APPROVE LOA")**, i.e. the entity is upstream of its own process. Convention
   is entity → process → entity.
4. `DOCTOR` appears **three times** as an entity in Figure 6 — after
   `ScheduleAppointment`, feeding `CONDUCT CONSULTATION`, and feeding
   `RECORD LAB RESULT` — with no duplication marker (the diagonal-corner
   convention). The hand-drawn original has it twice.
5. **Six different data-store vocabularies across six figures.** Nothing in the
   paper reconciles them:

   | Figure | Store naming |
   |---|---|
   | Fig. 6 (system DFD) | `TB1` PATIENT TABLE, `TB2` APPOINTMENT TABLE, `TB3` PATIENT RECORDS, `TB4` LAB TEST RESULTS |
   | Fig. 7 (ERD) | 9 domain tables, no prefix (`patient`, `LOA`, `doctor`, …) |
   | Fig. 8 (admin) | `tbl_account`, `tbl_users`, `tbl_patient`, `tbl_appointment`, `tbl_lab result`, `tbl_LOA status`, `tbl_virtual consultation` |
   | Fig. 9 (doctor) | `USER`, `APPOINTMENT`, `PATIENT RECORDS`, `LAB RESULTS`, `UPDATED PATIENTS RECORD` |
   | Fig. 10 (nurse) | `tb1 User`, `tb2 Patient Data Base`, `tb3 Patient Data Base`, `tb4 Lab Results`, `tb5 LOA Database` |
   | Fig. 11 (patient) | `tbl_Patient`, `tbl_Appointment`, `tbl_Records`, `tbl_Results`, `tbl_LOA`, `tbl_Consultation` |

6. **Figure 9's `CONSULTATION` process is dangling** — drawn with no inbound
   flow, no outbound flow, and no data store. Every other process in that figure
   has a matched request/response pair.
7. **Figure 10 (staff nurse) sends "Doctor Credentials"** to its `tb1 User`
   store — copy-pasted from the doctor DFD and never relabelled.

---

## 2. What the documents promise

**Specific objectives (Ch. 1)** — the paper numbers **five**, not one. Objective 1
has six sub-points and is the only one this plan originally tracked:

1. Design the system, capable of: **1.1** login + RBAC · **1.2** dashboard
   covering records, appointments, lab results *and LOA status* · **1.3** user
   roles · **1.4** forms for data entry/retrieval *and LOA processing* ·
   **1.5** *"analytics tools for tracking and analyzing patient trends,
   appointment data, clinic performance and LOA requests"* · **1.6** LOA
   monitoring and status tracking for HMO patients.
2. Develop using **Laravel (PHP), React TypeScript, HTML, CSS, MySQL.** ✅ — this
   is the third place the paper states the real stack, and the third thing the
   Next.js/Firestore paragraph contradicts (§6.1).
3. Test responsiveness/functionality on stated hardware (§6.5).
4. **Evaluate the system using ISO 25010** — see §2b. Not a code task, but a
   deliverable, and it has its own Ch. 3 section.
5. **Prepare an implementation plan for deployment, including user training and
   transition from the manual process** — see §2b.

> Note: **virtual consultation appears in none of the five objectives.** Not in
> the General Objective, not in 1.1–1.6. See §5.2.

**Scope (Ch. 1)** — four roles. Patients: account, view records + lab results,
book/manage appointments, check LOA status, notifications, *guarantor booking on
another person's behalf*. Nurses: access/update records, upload lab results,
monitor daily appointments. Admin/HR: manage user accounts, oversee schedules,
update LOA. Doctors: records, lab results, consultation docs, **max 5 patients
per day**, availability-driven slots that grey out when unavailable.

**Use Case (Fig. 3)** — 10 use cases: Archive · Log In · Manage Patient · User
Management · Manage Appointment · **LOA Status** · **Activity Log** · **Virtual
Consultation** · Patient Record · Lab Test Results.

> Doc/diagram mismatch: the paragraph describing Figure 3 lists **"Manage
> Providers"** as an admin function. There is no such oval in the diagram. Either
> add it or drop it from the text.

**Context Diagram (Fig. 4)** — Admin/HR carries 12 flows: Login · Dashboard ·
Deactivate/Reactivate Acc · **Generate Reports** · **Backup Database** ·
**Monitor System** · Manage User/Roles · Manage User Acc · Add New User · Manage
LOA Request · Monitor Appointments · Update LOA Status. The prose (Ch. 3)
confirms all of them: *"user management, account activation and deactivation,
report generation, database backup, appointment monitoring, and LOA request
handling and status updates."*

**ERD (Fig. 7)** — 9 tables: `staff nurse`, `LOA`, `appointment`, `patient`,
`lab test`, `lab test result`, `doctor`, `virtual consultation`, `diagnosis`.

---

## 2a. Figures 12–17 — the paper already documents the built system

The *User Interface Design* section carries six figures this plan previously
ignored. They are **not mockups** — they are screenshots of the running app at
`127.0.0.1:8000`, browser chrome and all. They are the strongest doc↔code
alignment in the entire paper and cost nothing to claim:

| Figure | Caption | Maps to |
|---|---|---|
| 12 | Log-in form | `auth/login/index` — email, password, remember-me, forgot-password, sign-up link |
| 13 | Sign-up form | `auth/register/index` — first/last name, email, password + confirmation |
| 14 | Request Appointment (personal info) | Step 1 of `pages/user/book-appointment/` |
| 15 | Appointment Details | Step 2 — service, patient record status, preferred date/time |
| 16 | Coverage and Doctor Preference | Step 3 — Cash/Self-Pay · HMO · PhilHealth, doctor search |
| 17 | Reviewing Patient Appointment | Step 4 — review + Submit Appointment Request |

Figure 16 shows the stepper as **"STEP 3 OF 4 · Personal Info → Appointment →
Coverage → Review & Submit"**, which is exactly the four-step wizard in the repo.
Chapter 3's testing section should cite these figures rather than leaving them as
decoration.

## 2b. Objectives 4 and 5 — deliverables with no build task

Both are numbered specific objectives, and neither had any entry in this plan
before 2026-07-31.

**Objective 4 — ISO 25010 evaluation.** Ch. 3's *System Evaluation Procedures*
commits to evaluating with **patients, doctors, nurses and admin/HR staff**
performing real tasks, then completing a structured questionnaire, scored on five
named criteria: *Functional Suitability · Usability · Performance Efficiency ·
Security · Compatibility*. Nothing in the repo or this plan produces that
instrument or its results. It gates the paper, not the code — but it gates.

**Objective 5 — implementation plan.** *"Preparing an implementation plan for
deployment, including user training and strategies for transitioning from the
existing manual process."* Ch. 3's Agile *Deployment* and *Launch* phases already
promise user manuals, training sessions, a monitored rollout and a post-launch
report. None of it exists.

---

## 3. ERD (Figure 7) vs. actual schema

| ERD table | In code? | Notes |
|---|---|---|
| `appointment` | ✅ `appointments` | Closest match in the whole ERD. Code adds `branch`, `additional_info`, `hold_expires_at`, `cancellation_reason`, `cancelled_at`, soft deletes |
| `patient` | ✅ `patients` | Code adds `guarantor_id`, `birthdate`, `address`, `clinic_id` (WC-XXXXXX). ERD's `coverage`/`hmo id`/`hmo provider` → `default_coverage`/`hmo_id`/`hmo_provider` |
| `diagnosis` | ✅ `patient_diagnoses` | Code adds `icd_code`, `status`, `diagnosed_at`, `recorded_by`. ERD's PK is `user id` — **wrong**, should be `diagnosis_id` |
| `lab test` + `lab test result` | ⚠️ merged into `lab_test_results` + `lab_result_parameters` | Code's split (one row per ordered test + N measured parameters) is the better design, but ERD's `file path` (scanned result PDF) has no equivalent |
| `doctor` | ⚠️ `users` + `doctor_profiles` | ERD models doctors as a standalone table; code makes them `User` rows with a Spatie `doctor` role. ERD's `availability schedule` column → dedicated `availability_blocks` table |
| `staff nurse` | ⚠️ `users` + `nurse` role | Same. ERD has no unified account table at all, yet Fig. 9/10 both reference a `USER` store — internal contradiction |
| **`LOA`** | ✅ `loa_requests` | *Built 2026-07-31 (Phase 2).* Renamed for Laravel convention. Code adds `user_id` (guarantor), `hmo_id`, `approved_at`, `rejected_at`, soft deletes. ERD's `aprorval status` typo → `status` |
| **`virtual consultation`** | ❌ **does not exist** | See §5 |

**Tables in code with no ERD counterpart:** `availability_blocks`,
`doctor_profiles`, `appointment_notifications`, `patient_allergies`,
`patient_documents`, `consultation_sessions`, `consultation_prescriptions`,
`patient_medical`, `patient_profiles`, Spatie permission tables.

**ERD defect 1:** every column in Figure 7 is typed `bigint` — including
`full name`, `email`, `password`, `findings`, `test date`, `meeting link`. This
is an uncorrected drawSQL default and the single most obvious thing a panel will
flag. It must be retyped before submission.

**ERD defect 2 — the caption describes a different diagram than the image.**
Figure 7's prose reads: *"The design centers on a single user account that serves
as the main reference point… Each user is associated with one complete patient
profile and one set of medical data, while allowing multiple appointment records
to be created under the same account… separate account credentials, personal
details, medical information, and appointments."*

The image contains none of that. There is **no account or user table** in
Figure 7, and the prose never mentions LOA, virtual consultation, doctor, staff
nurse, lab test, or diagnosis — six of the nine entities actually drawn. The
paragraph in fact describes the *codebase's* schema (`users` → `patient_profiles`
→ `patient_medical` → `appointments`), which suggests the text was written from
the repo while the diagram was drawn independently. This is the most serious
internal contradiction in the document: the two halves of one figure disagree
about what the system's data model is.

---

## 4. Role-by-role: documented vs. built

Legend: ✅ built · ⚠️ partial/mock · ❌ absent

### Patient — the biggest gap

| Documented (Fig. 4 / Fig. 11 / Fig. 12–17 / Table 3) | State |
|---|---|
| Register & login | ✅ Fortify + `auth/login/index`, `auth/register/index` — **screenshotted as Figures 12–13** |
| Book / view / cancel appointment | ✅ `AppointmentController` + 4-step wizard in `pages/user/book-appointment/` — **screenshotted as Figures 14–17** |
| Self check-in (day-of) | ✅ `PatientDashboardController::checkIn` — *not in any diagram, a code-side extra* |
| Access dashboard | ✅ `pages/user/dashboard.tsx` |
| Update personal information | ⚠️ `settings/profile` only — account fields, not the clinical profile |
| **View medical records** | ❌ no route, no page |
| **View laboratory results** | ❌ no route, no page |
| **Check LOA status** | ✅ `/user/loa-status` — *Phase 2, 2026-07-31* |
| **Online consultation** | ❌ |

Patient sidebar (`resources/js/pages/user/layout/patient-dashboard-data.ts`) has
exactly two real items: *My Appointments* and *Book Appointment*. **Table 3 of the
paper marks "View laboratory results — Lab results displayed — Pass", "Check LOA
status — LOA status displayed — Pass", and "Start consultation session —
Video/consultation session starts successfully — Pass".** None of those code
paths existed when the table was written; the first is now built (Phase 1), the
other two are not.

### Doctor — the most complete role

| Documented | State |
|---|---|
| Login, dashboard | ⚠️ `/doctor/dashboard` is `fn () => inertia('doctor/dashboard')` — **no props, renders mock data from `dashboard-data.ts`**. Real landing is `/doctor/appointments` |
| View patient record history | ✅ `PatientRecordController` — allergies, diagnoses, documents |
| View laboratory results | ✅ `LabReviewController` + `/doctor/lab-reviews` |
| Consultation + notes | ✅ `DoctorConsultationController` + `consultation_sessions` (SOAP + vitals + prescriptions) |
| Availability / schedule | ✅ `AvailabilityController` + `availability_blocks` |
| Order lab test | ✅ `doctor.consultations.lab-request` — *matches DFD process 5→6* |
| Max 5 patients/day | ✅ `doctor_profiles.max_patients_per_day` (default 5) + `DailyPatientCapTest` |
| **Generate reports** | ❌ |

Dead pages: `resources/js/pages/doctor/my-patients/` and
`resources/js/pages/doctor/my-schedule/` exist as components but have **no route**
and are commented out of the sidebar.

### Staff Nurse — one of five documented functions

| Documented (Fig. 10 / Fig. 4 / Table 5) | State |
|---|---|
| Login | ✅ |
| Upload / record lab results | ✅ `Nurse\LabQueueController::record` |
| Dashboard | ✅ `Nurse\NurseDashboardController` — *Phase 5, 2026-08-01*. Nurses now land here, not on the lab queue |
| Access patient record | ✅ `Nurse\PatientRecordController` — *Phase 5* |
| Update patient records / encode patient data | ✅ **partial by design** — demographics, allergies and documents yes; **diagnoses read-only** (§11) — *Phase 5* |
| Monitor daily appointments | ✅ `Nurse\AppointmentMonitorController` — read-only, any date — *Phase 5* |
| LOA monitoring | ✅ `Nurse\LoaMonitoringController` — read-only, *Phase 2* |

**All five of Figure 10's processes are now built**, plus *Dashboard* and
*Monitor Appointment List*, which come from Figure 4 and the Scope rather than
Figure 10. Nurse sidebar has five items across four groups: *Dashboard ·
Today's Appointments · Patient Records · Lab Queue · LOA Monitoring*.

`role:nurse` now guards **12** routes across four controllers, up from 3.

Figure 10 itself draws only **five** processes — Log In, Access Patient Record,
Update Patient Records, Upload Lab Result, LOA Monitoring. *Dashboard* and
*Monitor daily appointments* are not in it; they come from Figure 4
("Dashboard", "Monitor Appointment List"), the Scope, and Table 5. The paper
therefore asks the nurse role for seven things across three sources that no
single figure states together.

### Admin / HR — one of twelve documented flows

| Documented (Fig. 4 / Fig. 8 / Table 6) | State |
|---|---|
| Login, dashboard | ✅ `HRDashboardController`; admins get their own `AdminDashboardController` — *Phase 4* |
| Manage LOA request / update LOA status | ✅ real `loa_requests` records with reference number, approver, timestamps, validity and remarks — *Phase 2, 2026-07-31* |
| **User management** (add/update, activate/deactivate, roles) | ✅ `Admin\AdminUserController` + `StaffAccountService` — *Phase 4, 2026-07-31* |
| **Manage patient** | ✅ `Admin\AdminPatientController` — demographics only; clinical data stays with the doctor — *Phase 4* |
| **Monitor system / Activity Log** | ✅ `spatie/laravel-activitylog` + `Admin\AdminActivityLogController`, read-only — *Phase 4* |
| **Archive** | ✅ `Admin\AdminArchiveController` over the existing `softDeletes()` — *Phase 4* |
| **Generate reports** | ❌ — deferred to Phase 6; it is the same aggregation as Objective 1.5 |
| **Backup database** | ❌ — deferred to Phase 7; a `mysqldump` runbook step, not a web feature |
| **Manage virtual consultation / generate meeting links** | ❌ — Phase 3, still unscoped (§5.2) |
| Manage appointments (approve/cancel/reassign doctor) | ❌ (doctors self-confirm) |
| Verify & upload lab results | ❌ (duplicates the nurse/doctor lab flow) |

**As of Phase 4, 6 of the 12 admin/HR flows in Figure 4 are built** (dashboard,
LOA, user management, manage user/roles, add new user, deactivate/reactivate),
plus Figure 3's Archive, Activity Log, User Management and Manage Patient ovals.
Before Phase 4 it was 1 of 12.

`role:admin` now guards **14** routes across five controllers, and
`DashboardController::routeForUser()` sends admins to `admin.dashboard`. They
remain members of the `role:hr|admin` group, so the HMO queue is still theirs.

> **Deliberately not built, so the paper can say so rather than leave it
> ambiguous:** *Generate Reports* and *Backup Database*. Reports duplicate
> Objective 1.5's analytics work (Phase 6). A database-backup button that shells
> out to `mysqldump` from an authenticated web request is a security liability,
> not a deliverable — it belongs in Objective 5's deployment runbook (Phase 7).

---

## 5. The two structural gaps

### 5.1 LOA is not modeled — ✅ **closed 2026-07-31 (Phase 2)**

> **Resolved.** `loa_requests` now exists with the ERD's full column set, and
> `LoaService` owns the submit → approve/reject lifecycle with the appointment
> status derived from it. The section below is kept as written because it is the
> rationale the build was aimed at; each consequence is answered inline.
>
> Still open: no LOA reuse across appointments (the ERD models one LOA per
> appointment, so a second visit creates a second row), and no LOA-to-HMO email.

The documents treat LOA as a first-class object: its own ERD table (`LOA id`,
`patient id`, `appointment id`, `request date`, `aprorval status` [sic],
`approved by`, `valid until`, `remarks`), its own DFD processes (3 SUBMIT LOA,
4 APPROVE LOA), its own use case, its own stores (`tbl_LOA status` in Fig. 8,
`tb5 LOA Database` in Fig. 10, `tbl_LOA` in Fig. 11), and patient/nurse/HR/admin
visibility. Objective 1.6 is *specifically* LOA monitoring; **Table 6** even
claims "Send LOA request to HMO via email — Pass" and "Record LOA response from
HMO — Pass".

The code had **no LOA table and no LOA concept**. What existed:
`appointments.coverage = 'hmo'` + `hmo` + `hmo_id`, and a status
`pending_hmo_approval` that `HmoApprovalController::approve()` flipped to
`requested`. Consequences, and how each was answered:

- ~~No LOA reference number, request date, validity window, approver identity, or
  remarks — so nothing to *track*, only a binary gate.~~
  → `loa_number` (WC-LOA-YYYYMM-NNNN), `requested_at`, `valid_until`,
  `approved_by`, `remarks`, plus `approved_at` / `rejected_at`.
- **No history: a second appointment under the same LOA has no link to the
  first.** → *still true.* One LOA per appointment, matching the ERD.
- ~~The patient literally cannot see LOA status.~~ → `/user/loa-status`.
- ~~Objective 1.6 and the entire Fig. 8 `tbl_LOA status` flow are unimplementable
  against the current schema.~~ → Fig. 8's `manage LOA` process is the rewired
  HR queue; Fig. 10's `tb5 LOA Monitoring` is `/nurse/loa-monitoring`;
  Fig. 11's `LOA Status` process is the patient page.

### 5.2 Virtual consultation does not exist

**Corrected 2026-07-31.** The earlier version of this section cited the General
Objective and the Scope as sources. **Neither mentions it.** Where it actually
appears — and where it conspicuously does not — matters, because the two lists
pull in opposite directions:

*Documented in:* the Ch. 1 **Introduction** (*"...view their laboratory results
and diagnoses online, virtual consultations, and provides an appointment booking
feature"*) · **Project Context** (*"communicate with providers through a virtual
consultation"*) · Ch. 3 **Requirement Analysis** (*"including online consultation
features"*) · **Fig. 3** use case (`VIRTUAL CONSULTATION`, shared by all four
actors) · **Fig. 4** (patient "Online Consultation") · **Fig. 7** ERD
(`virtual consultation` table: `appointment id`, `meeting link`, `platform`,
`doctor notes`, `consultation status`) · **Fig. 8** ("monitor consultation
session", "generate meeting links") · **Fig. 11** ("Consultation
Interface/Session Access") · **Tables 3, 4, 7, 8** · and the ISO 25010
*Functional Suitability* criterion.

*Absent from:* the **General Objective**, **all six sub-objectives (1.1–1.6)**,
**all five numbered objectives**, the entire **Scope and Limitations** section,
and the **Definition of Terms**.

> This is the awkward finding for Phase 3. Virtual consultation is the most
> expensive and highest-risk item in the build, and it is asserted in eleven
> places — but in none of the places a panel grades against. The objectives
> enumerate six capabilities and virtual consultation is not one of them.
> Group 5 should decide deliberately: either add it to Objective 1 (and build
> it), or cut it from the figures and tables. Leaving it documented everywhere
> except the objectives invites the question at defense.
>
> **Updated 2026-07-31.** The decision was formally deferred (§11) pending the
> spike, and **the spike has now been run and passed on a single machine**. The
> *technical* unknown is therefore largely retired — a peer connection does
> establish in this environment — so the question is now purely a scoping one
> for Group 5, no longer "can we even build it". What the spike did **not**
> answer is NAT traversal (§12 risk 2), which is a deployment question rather
> than a reason to cut the feature.

Grepping the codebase for `meeting_link`, `telehealth`, `jitsi`, `zoom`,
`google meet` returns **only shadcn UI primitives**. `consultation_sessions` is
an *in-person* SOAP-note record: subjective/objective/assessment/plan, vitals,
prescriptions, `draft|finalized`. There is no link, no platform, no join flow.

> *(The paragraph above describes the schema as it stood on 2026-07-31 and is
> kept as the record of what was found. Phase 3 has since added `room_id`,
> `consultation_status`, `mode`, `started_at`/`ended_at` to that same table, so
> the join flow now exists — see §8.)*

### 5.2a Resolution — the scoping decision, 2026-08-04

**The feature is built. The objectives still do not mention it.** That gap is now
the entire risk: a panel grades against the five numbered objectives, and the
single most expensive component of this build appears in none of them. Cutting it
is no longer the cheaper option — the work is done, tested and documented — so
the only remaining action is to **add it to Objective 1**.

**This is Group 5's decision to make and mine to draft.** Proposed wording, built
to sit alongside 1.1–1.6 in the same voice and to describe only what actually
exists:

> **1.7** To provide a virtual consultation facility that allows a patient and
> their assigned doctor to hold a scheduled appointment as a live video
> consultation within the system, and allows the doctor to record the
> consultation's clinical notes against the same patient record used for
> in-person visits.

Three notes on that wording, each deliberate:

- **"within the system"**, not "via a meeting link". Fig. 8's "generate meeting
  links" and the ERD's `meeting link` / `platform` columns describe an
  integration with an external provider (Zoom, Meet). What was built is native
  WebRTC with no third party, which is *stronger* — no patient data crosses a
  vendor — but the objective must not promise a link that does not exist. The
  `meeting_link` and `platform` columns remain in the table, unused; §6 should
  record that rather than leave them looking implemented.
- **"a patient and their assigned doctor"** states the authorization boundary
  that the implementation actually enforces: exactly two named accounts, never a
  role. Worth stating in the objective because it is the property an examiner is
  most likely to probe.
- **"the same patient record used for in-person visits"** is the honest and
  defensible claim — one `consultation_sessions` row, two independent state
  machines (the note and the call). It also forecloses "so is this a separate
  system?"

**If Group 5 declines to add it**, the fallback is not "leave it as is": the
figures and tables asserting virtual consultation in eleven places must then be
reconciled with objectives that do not, and Tables 3/4/7/8 rewritten. That is
strictly more work than adding one sub-objective, which is why the
recommendation is to add it.

**Unblocked by:** nothing. This needs no code and can be actioned in the document
today.

---

## 6. Defects inside the paper itself

These need fixing regardless of what gets built:

1. **Chapter 3 contradicts itself on the tech stack.** The Agile *Development*
   phase says: *"The system was developed using Next.js with TypeScript… Firestore
   (Firebase Database) was employed for backend data storage."* Requirement
   Analysis and System Development on the next pages say Laravel + React TS +
   MySQL, which is what the repo actually is. The Next.js/Firestore paragraph is
   leftover boilerplate and must be deleted. It also duplicates its own opening
   clause ("The system was developed using  The system was developed using").
2. **Test tables report "Pass" for unbuilt features.** **Table 3** (patient lab
   results, LOA status, video consultation), **Table 5** (nurse record access,
   record update, appointment monitoring), **Table 6** (user CRUD, reports, LOA
   email to HMO). **Table 7**'s *Test Result* column is entirely blank. This is
   the most serious integrity risk in the document.
3. **Branch name is inconsistent — four spellings.** "Walter Dasmariñas" (title
   page, Ch. 2/3, and inside the Fig. 4 image) · "WalterMart Dasmariñas" (Ch. 1) ·
   "Waltermart Dasmarñas" (Project Context, missing the *i*) · "WallterMart"
   (Ch. 3 Launch). Every figure caption also uses unaccented lowercase "walter
   dasmarinas". Pick one; the clinic's actual site is WalterMart Dasmariñas.
4. **XAMPP** is in Definition of Terms but the project runs on Laravel's dev
   server (`composer dev`) + Vite + MySQL. Either swap the term or drop it.
5. **Hardware mismatch:** Objective 3 specifies "Intel Core i3 (5th Gen or
   higher)… Windows OS"; **Table 1** lists i5-6200U / Windows 10 Pro. The i5-6200U
   does satisfy "i3 5th gen or higher", so this is cosmetic — but the objective
   and the table should still agree. Separately, **Tables 1 and 2 share a single
   run-together caption line** (`"Table 1 hardware requirementsTable 2 Software
   Requirements"`) placed above *both* tables, so neither table is
   unambiguously labelled.
6. **Figure numbering collision:** the Conceptual Framework and the Agile
   Lifecycle are both labelled "Figure 1".
7. **System title drifts** between "Patient Record Management System with
   Appointment Scheduling", "Online Patient Record Management with Booking
   Appointment System" (Ch. 3 Research Approach), and "…with appointment booking"
   (figure captions).
8. **`Doctorprofile.php` → `DoctorProfile.php`** rename is staged in git but the
   working tree has 40+ uncommitted files. Commit before any new work starts.

**Added 2026-07-31 (second verification pass) — defects the first pass missed:**

9. **Figure 7's caption contradicts Figure 7's image.** See §3, ERD defect 2.
   Fix one or the other; they cannot both stand.
10. **Table 8's column headers are malformed:** `Test Case Title | Activities |
    System Response | Expected Error | System Response`. *"System Response"*
    appears **twice**, there is **no result or verdict column at all**, and the
    table ends with a fully blank row. Table 8 currently proves nothing.
11. **Figure 10 (staff nurse) routes "Doctor Credentials"** through its login
    process — copy-pasted from Figure 9 and never relabelled.
12. **Figure 9's `CONSULTATION` process is dangling** — no inbound flow, no
    outbound flow, no store, while every sibling process has a matched pair.
    There is also a stray "LL" label on the doctor entity's connector.
13. **Definition of Terms omits the paper's three most load-bearing concepts** —
    *LOA*, *Guarantor*, and *Virtual Consultation* — while defining **XAMPP**
    (not used, see §6.4) and **Comparative Analysis**, described as *"a method
    used in the study to compare clinic processes before and after the
    implementation"* even though Ch. 3 states the study *"focused solely on
    qualitative data"* and describes no such comparison. Define what the system
    is about; drop the terms it does not use.
14. **Figure 3 actor labels:** "STAFF NURRSE" (typo) and "ADMIN", while its own
    caption says "System Administrator" and Fig. 4 says "Admin\HR". The Scope
    treats Admin and HR as one combined role; the codebase has them as two
    separate Spatie roles. Pick a single vocabulary across figure, caption and
    scope.
15. **Ch. 2's synthesis matrix has no table number or caption**, so the paper's
    table sequence silently skips it. Either caption it (and renumber Tables 3–8)
    or state that it is deliberately uncaptioned.

---

## 7. What the code has that no document mentions

Worth adding to the paper — these are real engineering strengths the write-up
currently gives away for free:

- **Guarantor/patient separation.** `Patient::findOrCreateFromBooking()` dedupes
  on lowercased first+last name + contact number, so one account booking for a
  parent and two children produces three independent medical records. The Scope
  section describes this behaviour in prose but no diagram models it.

  > **Corrected 2026-07-31.** The first version of this file said "the ERD shows
  > a 1:1 user→patient which is the opposite of what is built." That is wrong,
  > and it gives away a point the project actually wins. Figure 7 has **no user
  > table at all**, and its `appointment` entity carries **both `user id` and
  > `patient id`** — structurally the same split the code implements
  > (`appointments.user_id` = booking account, `appointments.patient_id` = person
  > seen). The 1:1 language comes from Figure 7's *caption prose*, not the
  > diagram, and is part of the caption/image contradiction in §3. The ERD
  > **supports** the guarantor model; the paragraph beneath it does not.
- **Concurrency control.** `BookingService::bookSlot()` runs in a transaction
  with `lockForUpdate()` on both the slot and the per-patient/per-day conflict
  check, retried 3×, plus a 10-minute `hold_expires_at` soft hold and a unique
  active-slot index. Directly answers **Table 8**'s "Double booking or invalid
  schedule" case with an actual mechanism.
- **Availability model.** `availability_blocks` with weekly recurrence +
  date-specific overrides, `is_available:false` blackouts, 5-min inter-slot
  buffer, 2-hour minimum lead, 3-month horizon, 60s slot cache.
- **Notifications.** `appointment_notifications` shared as Inertia props by
  `HandleInertiaRequests` on every request.
- **Lab audit trail.** `lab_test_results` carries `requested_by` / `recorded_by`
  / `reviewed_by` plus a timestamp per transition — a full doctor→nurse→doctor
  chain of custody.
- **Test suite.** `DoubleBookingTest`, `DailyPatientCapTest`,
  `DoctorAvailabilityTest`, `LabWorkflowTest`, `LabAccessTest` — real evidence
  for Chapter 3's testing section, which currently cites none of it.

---

## 8. Coverage scorecard

*Maintained in place per the §0 protocol.*

| Module | Documented | Built | Est. |
|---|---|---|---|
| Auth + RBAC (5 roles) | ✅ | ✅ | ~95% |
| Appointment booking & scheduling | ✅ | ✅ | ~90% |
| Doctor availability | ✅ | ✅ | ~90% |
| Consultation documentation (in-person) | ✅ | ✅ | ~85% |
| Lab workflow (order → record → validate) | ✅ | ✅ | ~80% |
| Patient records (doctor-side) | ✅ | ✅ | ~80% |
| Notifications | ✅ | ✅ | ~75% |
| **LOA module (Obj. 1.6)** | ✅ | ✅ | ~85% — *Phase 2, 2026-07-31* |
| Patient portal (records/labs/LOA) | ✅ | ✅ | ~90% — *LOA status page shipped* |
| **Nurse module** | ✅ | ✅ | ~85% — *Phase 5, 2026-08-01. All 5 Fig. 10 processes + dashboard + appointment monitor. Diagnoses deliberately read-only* |
| **Admin module** | ✅ | ✅ | ~70% — *Phase 4, 2026-07-31. Reports + backup deliberately deferred* |
| Analytics / reports (Obj. 1.5) | ✅ | ❌ | 0% |
| **Activity log · Archive** | ✅ | ✅ | ~85% — *Phase 4. No retention sweep yet* |
| Database backup | ✅ | ❌ | 0% — *reclassified: a Phase 7 runbook step, not a web feature* |
| **Virtual consultation** | ⚠️ *(11 places, none of them an objective — §5.2, wording proposed in §5.2a)* | ✅ | ~95% — *Phase 3 built 2026-08-03; Phase 3.1 hardening 2026-08-04. Two-device call verified across separate networks. Real teardown, monotonic call state, role-aware leave, ICE-restart recovery from either side, peer mute/camera state, departure on every exit path, autosave, scheduled sweep of abandoned rooms. Presence verified on two devices; spike deleted; **§12 risk 7 closed on a 24m 12s cross-network call, pair `srflx ⇄ srflx (udp)`, no relay**. No engineering work remains — what is left is the §5.2a objective wording, which is a paragraph in the paper* |
| **ISO 25010 evaluation (Obj. 4)** | ✅ | ❌ | 0% — *added 2026-07-31* |
| **Implementation & training plan (Obj. 5)** | ✅ | ❌ | 0% — *added 2026-07-31* |

**Updated 2026-08-04 (Phase 3.1).** Five of the concentrated gaps are now
closed: the patient read-side portal (Phase 1), the LOA/HMO domain (Phase 2),
the admin module (Phase 4), the nurse module (Phase 5) and virtual consultation
(Phase 3 + 3.1). **The largest remaining software gap is analytics (Obj. 1.5,
still 0%)** — every other module is at 70% or above. After that the remaining
work is Phase 6 (analytics) and Phase 7 (Objectives 4 and 5, neither of which is
code).

Virtual consultation has moved from 0% to ~90% and is **no longer a build
question**. Feasibility, NAT traversal and call durability are all answered:
§12 risk 2 and risk 7 are both resolved, TURN stays insurance rather than a
requirement, and a call now survives a drop instead of ending on one.

**What remains is the scoping decision, and it is now the single highest-value
unbuilt item in this file.** The feature is finished and appears in eleven
documented places, none of which is an objective a panel grades. Draft wording
for a sub-objective 1.7 is in **§5.2a**; it needs Group 5's acceptance and no
code at all. Every hour of Phase 3 and 3.1 earns nothing until that paragraph
exists.

**Two of the paper's five numbered objectives are not software at all.**
Objectives 4 (ISO 25010 evaluation) and 5 (implementation plan, user training,
manual-process transition) were missing from this file entirely until the
2026-07-31 verification pass. They are graded the same as the rest — see
Phase 7 (§9).

---

## 8b. Provenance — what is Group 5's vs. what is a recommendation

Every *requirement* below traces to a specific place in the documents. Every
*implementation choice* is a recommendation and is **not** in the paper — the
documents say what the system must do, never how.

### Documented by Group 5 — quote or figure exists

| Claim | Where |
|---|---|
| Analytics for patient trends, appointment data, clinic performance, LOA requests | Objective 1.5, verbatim |
| LOA monitoring & status tracking for HMO patients | Objective 1.6; Scope ¶2 |
| Dashboard covering records, appointments, lab results **and LOA status** | Objective 1.2 |
| Patient views records + lab results, checks LOA, gets notifications | Scope, "Patients" |
| Guarantor books on another person's behalf | Scope, "Patients" — verbatim |
| Nurse: access/update records, upload lab results, monitor daily appointments | Scope, "Staff nurses"; Fig. 4; Fig. 10 *(5 processes only — no appointment monitor)*; Table 5 |
| Admin/HR: manage accounts, oversee schedules, update LOA | Scope, "Admin and HR" |
| Admin emails LOA requests to HMO partners | Ch. 3 Requirement Analysis; **Table 6** |
| Doctor max 5 patients/day; unavailable slots not clickable | Scope, "Doctors" — verbatim |
| Virtual consultation | Ch. 1 **Introduction**; Project Context; Ch. 3 Requirement Analysis; Fig. 3; Fig. 4; ERD; Fig. 8; Fig. 11; **Tables 3, 4, 7, 8**. **NOT in any objective and NOT in the Scope** — see §5.2 |
| Login/registration UI as built | **Figs. 12–13** — screenshots of the running app |
| 4-step booking wizard as built (Personal Info → Appointment → Coverage → Review) | **Figs. 14–17** — screenshots of the running app |
| ISO 25010 evaluation on 5 criteria, all 4 roles, questionnaire | **Objective 4**; Ch. 3 *System Evaluation Procedures* |
| Implementation plan: deployment, user manuals, training, monitored rollout, post-launch report | **Objective 5**; Ch. 3 Agile *Deployment* + *Launch* phases |
| Archive · Activity Log · User Management · Manage Patient | Fig. 3 (use case ovals) |
| Backup Database · Monitor System · Generate Reports | Fig. 4 (context diagram) |
| Admin verifies/uploads lab results; approves/cancels/reassigns appointments | Fig. 8 |
| LOA table: id, patient, appointment, request date, approval status, approved by, valid until, remarks | Fig. 7 (ERD) |
| Virtual consultation table: appointment id, meeting link, platform, doctor notes, consultation status | Fig. 7 (ERD) |
| Sensitive results warrant provider mediation | Ch. 2, Bruno et al. (2022) |
| Next.js/Firestore paragraph | Ch. 3, Development phase — verbatim |
| Test tables marking unbuilt features "Pass" | **Tables 3, 5, 6**; **Table 7**'s result column is blank; **Table 8** has no result column at all |

### Recommendations — nowhere in the documents

| Recommendation | Note |
|---|---|
| Laravel Reverb + Echo + pusher-js for signalling | Docs never say *how* virtual consultation works — only that it exists. Any signalling transport satisfies them |
| Native `RTCPeerConnection`, STUN/TURN, coturn | Same — pure implementation choice |
| `appointments.consultation_type` (patient picks virtual vs in-person at booking) | An inference. The docs describe joining a consultation but never say when the mode is chosen |
| Show patients only `status = 'reviewed'` lab results | A design call. *Justified* by Bruno et al. in their own Ch. 2, but the docs never state the rule |
| `loa_requests` as the table name | ERD calls it `LOA`. Renamed for Laravel convention |
| `users.is_active` column | Docs say "activation and deactivation"; the column is the mechanism |
| `spatie/laravel-activitylog` | Docs say "Activity Log"; the package is a choice |
| Archive via existing `softDeletes()` + `onlyTrashed()` | Docs say "Archive"; the technique is a choice |
| Phase ordering and all route/page/test names | Not from any document |
| Every effort estimate and the coverage percentages in §8 | Assessment, not measured against any document |

---

## 9. Build order

Sequenced so each phase is independently demonstrable and unblocks the next.
Checkboxes are maintained in place per the §0 logging protocol.

### Phase 0 — Stabilise

- [x] Create `WELLCARE-BUILD-PLAN.md` at repo root with an empty **Change Log**.
- [x] Commit the working-tree changes. The 2026-07-31 decision to defer this
      ("leave the uncommitted work untouched and branch for new work instead")
      was **reversed 2026-08-01** — see §11 and the Change Log. Four layered
      commits on `feat/patient-portal-records`, **pushed to `origin`**.
- [x] Create the `wellcare_test` database and get the Pest suite green.
      Baseline: **85 passed, 330 assertions.**
- [x] Run the CI gates and record actual output — see Change Log 2026-07-31.

### Phase 1 — Patient read-side portal

*Closes the largest documented gap; every supporting table already exists.*

- [x] `/user/records` — allergies, diagnoses, documents for each patient the
      account guarantees. Scoped by `patients.guarantor_id`, **never** `user_id`.
- [x] `/user/lab-results` — `lab_test_results` where `status = 'reviewed'` only,
      so patients never see unvalidated values. Literature-backed (Bruno et al.
      2022, already cited in Ch. 2) — cite it in the paper.
- [x] Patient-facing consultation summary on completed appointments —
      **was already built** before this phase. `PatientDashboardController::`
      `mapPastAppointment()` returns SOAP + vitals and `user/dashboard.tsx`
      renders them. The roadmap was wrong; no code was needed. The new record
      detail page adds per-patient visit history on top.
- [x] Extend `resources/js/pages/user/layout/patient-dashboard-data.ts` nav.
- [x] **WebRTC spike** (one day): two browser tabs, prove a peer connection
      establishes before Phase 3 UI work. **Harness built 2026-07-31 —
      `public/webrtc-spike.html`, dependency-free.** Deliberately uses **manual
      copy-paste signalling, not Reverb**: copy-paste exercises the things that
      actually carry risk (`getUserMedia`, `RTCPeerConnection`, ICE/NAT);
      Reverb only replaces the transport, the least uncertain part.

      **RUN 2026-07-31 — passed, on a single machine.** Two tabs on one host;
      the peer connection established and two-way video rendered. That retires
      three of the four risks: camera permission, `RTCPeerConnection`
      negotiation, and offer/answer exchange all work in this environment.

      **Still `[~]`, not `[x]`, for two reasons.** (1) **NAT traversal is
      unproven** — both peers shared one host, so ICE never crossed a network
      boundary; this says nothing about two devices on different networks.
      (2) The **candidate types were not captured**, so the empirical answer to
      §12 risk 2 (does this deployment need TURN) is still missing. Closing
      this item needs a second run with the far tab on a **different device —
      ideally a phone on mobile data, not the same wifi** — and the Diagnostics
      *Candidate types* row recorded verbatim.

      **Run-2 harness built 2026-08-03 — the run itself has NOT happened.**
      Two things blocked a second-device run and both are now removed:
      *(a)* `getUserMedia` is blocked outside a secure context, so a phone
      opening `http://192.168.x.x:8000` gets no camera and no useful error —
      solved by serving the page over an HTTPS **cloudflared quick tunnel**,
      which also lets the phone sit on **mobile data** rather than the same
      wifi, the only configuration that actually tests NAT traversal;
      *(b)* manual copy-paste signalling is unusable between a phone and a
      laptop at 3–6 KB per blob — solved by a room-code relay
      (`Spike\WebRtcSignalController`, `local` env only), with manual mode
      retained as the fallback. The page now also captures **remote** candidate
      types and the selected pair from `getStats()`, and exports both sides'
      readings as a pasteable block.

      **Run-2 attempt 1 (2026-08-02) FAILED — on a defect in the harness, not
      on WebRTC.** The relay capped blobs at 8192 characters; a real Chrome
      offer is ~11.8 KB of base64, so every offer `POST` returned 422 and the
      joining peer waited on an offer that was never stored. Fixed, along with
      two secondary defects the attempt exposed.

      **Run-2 attempt 2 (2026-08-02) PASSED — and this closes the item.**
      Windows host ↔ macOS peer, two different networks. Both sides
      independently reported `selected pair: srflx ⇄ srflx (udp)`, two-way
      audio and video rendered, and **the joiner had TURN enabled yet ICE
      still selected a direct path over the relay.** Candidate types are
      recorded verbatim in the Change Log, which is what this item asked for.

      **A new question replaces the old one: the call held 17 seconds.** Both
      sides dropped at the same instant, `connected → disconnected → failed`.
      That is the ICE consent-freshness window (RFC 7675). Feasibility is
      settled; *durability* is not. Tracked as §12 risk 7, not here.

### Phase 2 — LOA as a first-class module ✅ *done 2026-07-31*

*Objective 1.6; unblocks Obj. 1.2 and 1.5.*

- [x] `loa_requests` table per the ERD: `patient_id`, `appointment_id`,
      `loa_number`, `hmo_provider`, `requested_at`, `status`, `approved_by`,
      `valid_until`, `remarks`, timestamps, soft deletes. Also `user_id`
      (guarantor), `hmo_id`, `approved_at`, `rejected_at`.
- [x] Rewire `HmoApprovalController` to create/transition an LOA record and
      *derive* the appointment status from it, keeping the existing enum intact.
      Transitions live in `LoaService`, not the controller.
- [x] Patient LOA-status page — `/user/loa-status`.
- [x] Nurse LOA monitoring per Fig. 10 — `/nurse/loa-monitoring`, read-only.
- [x] Follow the `routes/web.php` convention: literal segments before `{id}`
      wildcards.
- [x] **Not in the original plan:** LOA creation hooked into
      `BookingService::bookSlot()` so an HMO appointment and its LOA are created
      in one transaction, plus a backfill migration for the 40 pre-existing HMO
      appointments.

*Deferred out of this phase — see the Change Log entry for why:* no scheduled
expiry sweep (expiry is derived via `LoaRequest::$is_expired`), no LOA-to-HMO
email (Table 6 claims it; mail is still the `log` driver), and no LOA reuse
across appointments.

### Phase 3 — Virtual consultation, in-app WebRTC video ✅ *COMPLETE 2026-08-04*

Highest-risk item in the project. The Phase 1 spike de-risks it. If the spike
fails, the link-based fallback below is already part of the schema and costs
nothing extra.

> **✅ COMPLETE — built 2026-08-03, hardened and verified 2026-08-04.**
> **409 tests passing** (up from 277 before this phase). Everything below is
> shipped, and the feature has been exercised end to end on two physical devices
> across separate networks.
>
> **The verification that matters**, because none of it is reachable by the test
> suite:
>
> | Check | Result |
> |---|---|
> | Two-way audio and video, two devices, separate networks | ✅ |
> | Call held | **24m 12s**, no drop |
> | Selected candidate pair | **`srflx ⇄ srflx (udp)`** — both behind NAT, connected directly |
> | TURN relay used | **No** — stays insurance, not a requirement |
> | Refresh / navigate away / force-quit browser | Peer released in <1s, both directions |
> | Rejoin after leaving | ✅, including by reopening the page directly |
> | Peer mute / camera-off badges | ✅ |
> | Doctor End Call → finalize or keep draft | ✅ |
>
> **What the phase cost, and why it is worth recording:** seven defects were
> found only by running the thing on real hardware, and every one of them was
> **silent** — no exception, no log line, no console error, and a UI that
> honestly reported a state that was wrong. A 370-test suite was green
> throughout. See the Change Log for each; the pattern is that WebRTC, Inertia
> and broadcast are all fire-and-forget layers where a dropped message produces
> waiting rather than failure.
>
> **The spike has been deleted** (Step 9 below). Its gate — a real two-device
> call, then a verified hardening pass — is met on both counts.
>
> **Nothing here is blocked on engineering any more.** The two open items are
> paper items: §5.2a (the objective wording) and §6 (`meeting_link` / `platform`
> are unused columns). Both have been handed to the client.

> **All six items below are built and green — 367 tests passing, up from 277.**
> Three things the checklist did not have, added because the code demanded them:
> a **`ConsultationSessionService`** owning the state machine (`start()` created
> no session row, and `appointment_id` is UNIQUE, so `room_id` had nowhere to be
> minted — it also closed two unguarded defects, see the Change Log); a
> symmetric **`hello` handshake** (a fire-and-forget broadcast has no offer
> store, so an offer sent before the patient subscribed vanished silently); and
> **ICE restart**, added after the 4m 5s drop.
>
> ~~**Still outstanding: the two-device walkthrough.**~~ Done 2026-08-03, and
> re-verified after the 3.1 hardening pass on 2026-08-04. The spike is deleted.

**Dependencies — require approval before installing:** `laravel/reverb`
(first-party WebSocket server), `laravel-echo` + `pusher-js` on the frontend.
Reverb needs its own process — add `php artisan reverb:start` to the
`concurrently` list in `composer dev`.

- [x] Extend `consultation_sessions`: `mode` (`in_person|virtual`), `room_id`
      (uuid), `consultation_status` (`waiting|active|ended`), `started_at`,
      `ended_at`, plus the ERD's `meeting_link` and `platform` as the fallback.
- [x] Add `appointments.consultation_type` — patient picks in-person vs. virtual
      during booking. Needs a field in `step-appointment.tsx` and a rule in
      `BookAppointmentRequest`.
- [x] `WebRtcSignal` broadcast event on private channel `consultation.{roomId}`,
      carrying `{type: offer|answer|ice-candidate, payload, fromUserId}`.
- [x] Channel authorization in `routes/channels.php` — **only** the session's
      `doctor_id` and the appointment's guarantor account. This is the security
      boundary for the whole feature: an unauthorized join is a live audio and
      video leak of a medical consultation. It gets its own test.
- [x] `useWebRtc` hook + shared video-room component (local/remote streams, mute,
      camera toggle, end call), used by the doctor session editor and a new
      patient-side join page. Doctor creates the offer, patient answers.
- [x] Native `RTCPeerConnection` + `getUserMedia`; no third-party peer library.

**TURN relay is a deployment prerequisite, not a code task.** Google's public
STUN servers handle most connections, but peers behind symmetric NAT (~10–20% of
real connections) need coturn or a hosted relay. A defense demo on one clinic LAN
works with STUN alone — document that as a limitation rather than discovering it
live.

*Testing:* Pest cannot drive WebRTC. Test what it can — channel authorization,
the session state machine, the booking `consultation_type` rule. Media
negotiation is manual, scripted testing; document it in Ch. 3 rather than
claiming an automated pass.

### Phase 4 — Admin module ✅ *done 2026-07-31*

*Objectives 1.1, 1.3; Use Case + Fig. 4/8. Built ahead of Phase 3 by decision —
see §11.*

- [x] User management: list/create/update, activate/deactivate, role assignment
      via Spatie. `users.is_active` column + `EnsureUserIsActive` middleware
      **and** a `Fortify::authenticateUsing()` gate — the middleware alone would
      only end a session at the next request, the Fortify gate alone would leave
      an already-open session running.
- [x] Activity log — `spatie/laravel-activitylog` installed (approved 2026-07-31).
      Wrapped in `App\Concerns\RecordsActivity`, which names audited attributes
      **explicitly per model**; `logAll()`/`logFillable()` would have written
      `password`, `two_factor_secret` and `remember_token` into a table the admin
      UI renders.
- [x] Archive: a UI over the existing `onlyTrashed()` + `restore()`. No schema.
- [x] Admin sidebar + layout following `resources/js/pages/hr/layout/`.
- [x] **Not in the original plan:** `AdminSeeder`. `RoleAndPermissionSeeder`
      created the `admin` *role* but nothing ever created a *user* holding it, so
      the module was unreachable no matter what was built on top of it.
- [x] **Not in the original plan:** `AdminDashboardController` + `admin.dashboard`
      landing route, and `Admin\AdminPatientController` for Fig. 3's "Manage
      Patient" oval.
- [x] **Not in the original plan:** `StaffAccountService`, extracted from
      `CreateNewUser` so registration and admin account creation build an account
      identically. See the Change Log for why a `User` row alone is not one.

*Deferred out of this phase, deliberately:* **Generate Reports** → Phase 6 (same
aggregation as Obj. 1.5); **Backup Database** → Phase 7 runbook (a `mysqldump`
button behind a web request is a liability, not a feature); **activity-log
retention sweep** (Spatie ships `activitylog:clean`, nothing schedules it yet).

### Phase 5 — Nurse module expansion ✅ *done 2026-08-01*

*Fig. 10, Table 5.*

- [x] Nurse dashboard — `/nurse/dashboard`, and the nurse landing route moved
      here from `/nurse/lab-queue`.
- [x] Read/update patient records — **not** by adding `role:nurse|doctor` to the
      doctor's routes as originally planned. That would have granted the nurse
      the doctor's three diagnosis-write methods, because a shared route group
      cannot express a partial grant. A separate `Nurse\PatientRecordController`
      carries the write half; the *read* half is shared through the new
      `App\Concerns\ReadsPatientRecords` so a record reads identically for both
      roles. See §11.
- [x] Daily appointment monitor — `/nurse/appointments`, read-only, any date.

### Phase 6 — Analytics

*Objective 1.5 — currently 0%. Needs Phase 2 done first for the LOA metrics.*

- [ ] Patient trends.
- [ ] Appointment volume.
- [ ] Clinic performance.
- [ ] LOA turnaround.

### Phase 7 — Objectives 4 and 5

*Added 2026-07-31. Not code, but numbered objectives, and graded as such.*

**Objective 4 — ISO 25010 evaluation.** Ch. 3 commits to real evaluators from all
four roles performing real tasks, then a structured questionnaire on five
criteria. This cannot be back-filled the week before defense — it needs the
system walkable end-to-end first, so it sequences after Phase 5.

- [ ] Build the questionnaire instrument, one section per criterion:
      *Functional Suitability · Usability · Performance Efficiency · Security ·
      Compatibility.*
- [ ] Recruit evaluators covering all four roles (the paper names patients,
      doctors, nurses, admin/HR — not just classmates).
- [ ] Run the sessions against the deployed build; record the task list each
      evaluator actually completed.
- [ ] Tabulate and write the results section. **This becomes a real Table 9** —
      currently the paper has no Table 9 despite §7 of the old version of this
      file citing one.

**Objective 5 — implementation plan.** Ch. 3's *Deployment* and *Launch* phases
already promise these in the past tense; they need to exist.

- [ ] Deployment runbook (env, migrations, seeding order, queue worker, build).
- [ ] User manual per role.
- [ ] Training/rollout schedule and the manual→digital transition strategy,
      including how existing paper records get entered.
- [ ] Post-launch review template.

### Parallel track — document corrections

- [ ] Delete the Next.js/Firestore paragraph (§6.1).
- [ ] Rewrite **Tables 3/5/6** to reflect what actually passes (§6.2).
- [ ] Fill in **Table 7**'s blank *Test Result* column (§6.2).
- [ ] Fix **Table 8**'s duplicated `System Response` header and add a real result
      column (§6.10).
- [ ] Retype the ERD off `bigint` (§3, defect 1).
- [ ] **Rewrite Figure 7's caption so it describes Figure 7** (§3, defect 2) —
      highest-value single fix in the paper.
- [ ] Add process numbers and patient return-flows to Figure 6.
- [ ] Reconcile the **six** data-store vocabularies (§1.5).
- [ ] Fix Figure 10's "Doctor Credentials" and Figure 9's dangling
      `CONSULTATION` process (§6.11–12).
- [ ] Fix branch name (**4 spellings**), XAMPP, hardware table, the run-together
      Table 1/2 caption, Figure 1 collision, title drift.
- [ ] Add *LOA*, *Guarantor*, *Virtual Consultation* to Definition of Terms;
      drop *Comparative Analysis* or make Ch. 3 actually use it (§6.13).
- [ ] Resolve the "Manage Providers" text-vs-diagram mismatch (§2).
- [ ] Fix "STAFF NURRSE" and settle Admin vs. Admin/HR vs. System Administrator
      across Fig. 3, its caption, and the Scope (§6.14).
- [ ] **Decide virtual consultation's status** (§5.2) — **now the highest-value
      unbuilt item in this file, and it is a paragraph, not code.** The "or cut
      it" half of this choice has expired: the feature is built, tested and
      hardened (Phase 3 + 3.1, ~90%), so cutting it would mean deleting working
      software *and* rewriting Figures 3/4/7/8/11 and Tables 3/4/7/8 — strictly
      more work than accepting one sub-objective. **Draft wording for 1.7 is
      ready in §5.2a**; it needs Group 5's acceptance. Until it exists, the most
      expensive component of this build is graded against nothing.
- [ ] Record in §6 that `consultation_sessions.meeting_link` and `.platform`
      are **unused columns**. The ERD and Fig. 8 describe generating links to an
      external provider; what was built is native in-app WebRTC with no third
      party. Better for privacy — no patient audio or video crosses a vendor —
      but the paper currently implies an integration that does not exist.
- [ ] Cite **Figures 12–17** in Ch. 3's testing section — they already show the
      built login, registration and 4-step booking wizard (§2a).

---

## 10. Verification

- **`npm run build` after any phase that adds a page under `resources/js/pages/`
  — run it BEFORE the test suite.** Tests that `assertOk()` an Inertia page
  render `app.blade.php`, which resolves assets through Vite. A page missing
  from `public/build/manifest.json` fails with `Unable to locate file in Vite
  manifest`, not a useful message, and the suite goes red in bulk. It passes
  anyway while `composer dev` happens to be running, so it hides until it
  doesn't — see the 2026-07-31 stale-manifest entry, where this read as **112
  failures** that were not failures.
- `composer ci:check` — lint, format, types, tests. Must be green before each
  phase merges.
- `php artisan test --compact --filter=<Feature>` per phase.
- `php artisan migrate:fresh --seed` — seeder order is load-bearing:
  roles → doctors → HR → patients → appointments.
- `composer dev`, then walk each role end-to-end: patient books → HR approves the
  LOA → doctor confirms → patient checks in → doctor starts, orders lab → nurse
  records → doctor validates → patient sees the result and the LOA status.
- Virtual consultation (manual, two machines or two browser profiles): patient
  books a virtual appointment → doctor starts the session → patient joins →
  two-way audio/video → doctor ends → session shows `ended` with SOAP notes saved.
  Repeat once across two different networks to confirm whether TURN is needed.

New Pest features per phase:

- `PatientPortalAccessTest` — must assert a guarantor **cannot** read another
  guarantor's patients, and that `status != 'reviewed'` lab results are invisible.
  ✅ *Phase 1 — 14 tests.*
- `LoaWorkflowTest` / `LoaAccessTest` — request → approve/reject → appointment
  status derivation, and guarantor isolation. ✅ *Phase 2 — 34 tests.*
- `AdminUserManagementTest` — role assignment and deactivation lockout.
  ✅ *Phase 4*, split across five files because one would have hidden the
  boundaries: `AdminAccessTest` (every surface closed to every other role,
  including `hr`), `AdminUserManagementTest` (creation writes the profile row
  too), `AdminDeactivationTest` (both enforcement points), `AdminArchiveTest`
  (restore does **not** cascade), `ActivityLogTest` (no credential ever reaches
  the log). **95 tests.**
- `NurseAccessTest` / `NurseRecordUpdateTest` / `NurseDashboardTest` — every
  nurse surface closed to the other four roles, **the nurse closed to the
  doctor's diagnosis routes**, the demographics allow-list holding against an
  `hmo_id` write, and the appointment monitor's date handling.
  ✅ *Phase 5 — 47 tests.*
- `ConsultationChannelAuthTest` — only the assigned doctor and the appointment's
  guarantor may subscribe to `consultation.{roomId}`. Everyone else is rejected.
  ❌ *Phase 3, not started.*

---

## 11. Decisions made

| Date | Question | Decision |
|---|---|---|
| 2026-07-31 | LOA modelling | **Build the real LOA module** — `loa_requests` table per the ERD, appointment status derived from it (Phase 2) |
| 2026-07-31 | Virtual consultation | **Full in-app WebRTC video** — Reverb signalling, native `RTCPeerConnection`, link-based fallback retained in the schema (Phase 3) |
| 2026-07-31 | First gap after stabilising | **Patient read-side portal** (Phase 1) |
| 2026-07-31 | Phase order: 3 vs 4 | **Build Phase 4 (admin) before Phase 3.** Phase 3 was gated on an unresolved scoping question, three uninstalled dependencies, and a spike that had never been run. The admin module maps to Objectives 1.1 and 1.3 — which *are* graded — and its core needed no new dependencies. |
| 2026-07-31 | Virtual consultation, revisited | **Decision deferred**, not reversed. §5.2 stays open until `public/webrtc-spike.html` has actually been run and produced real ICE candidate types. Deciding on evidence rather than a guess; §12 risk 2 says that is the empirical answer. |
| 2026-07-31 | Dependencies | **Approved:** `spatie/laravel-activitylog` (installed, Phase 4) and `laravel/reverb` + `laravel-echo` + `pusher-js` (approved but **not installed** — they add a required process to `composer dev` and buy nothing until Phase 3 starts). |
| 2026-07-31 | Admin landing route | `admin` → `admin.dashboard`, **but admins stay in the `role:hr|admin` group.** The landing page moved; the access did not. Removing it would recreate the 403 that group exists to fix. |
| 2026-07-31 | Deactivation mechanism | **A flag (`users.is_active`), not a soft delete.** Deleting the user would fire `nullOnDelete()` across `appointments.user_id` and `patients.guarantor_id`, orphaning the medical record the system exists to protect. |
| 2026-08-01 | Committing the working tree — **reverses the 2026-07-31 deferral** | **Commit and push.** The deferral was sound when one phase was at stake; by 2026-08-01 three were, and the branch it created had never been committed to. Four layered commits, then pushed to `origin`. See the Change Log for why the layering is narrative rather than bisectable. |
| 2026-08-01 | Nurse write scope on patient records | **Nurse may write demographics, allergies and documents; diagnoses stay read-only.** Fig. 10's "Update Patient Records" is an encoding task — authoring a diagnosis is the attending doctor's clinical judgment, and the Scope assigns it to them. The nurse still *reads* diagnoses, because knowing what a patient is treated for is what makes their intake and lab work safe. Same reasoning as Phase 4 withholding `hmo_id`: a deliberate, logged narrowing beats an accidental over-grant. |
| 2026-08-01 | Nurse record controller shape | **A separate `Nurse\PatientRecordController`, not `role:nurse|doctor` on the doctor's routes.** The plan called for the shared-guard approach; it cannot express the split above, since a route group grants all of a controller's methods. The read half is shared through `App\Concerns\ReadsPatientRecords` instead, so the legacy-record fallback exists in exactly one place. |

---

## 12. Risks carried

1. **WebRTC is the schedule risk — downgraded 2026-07-31.** Signalling, NAT
   traversal and browser media permissions each fail independently. **The spike
   was run and passed on a single machine**, retiring two of those three:
   browser media permission and offer/answer negotiation both work. Signalling
   is still manual copy-paste (Reverb uninstalled), and **NAT traversal remains
   entirely untested**. The `meeting_link`/`platform` fallback stays in the
   Phase 3 schema — if peer connections prove unreliable at the clinic, the
   feature degrades to an external link without a rewrite or a scope retraction
   in the paper.
2. ~~**TURN is a deployment prerequisite, not a code task.**~~ **Largely
   answered 2026-08-02 — TURN is not required for the connection to form.**
   The two-device run across two different networks selected
   `srflx ⇄ srflx (udp)` on both sides: STUN traversed both NATs and media went
   directly peer-to-peer. The joining peer had a TURN relay configured and ICE
   *still* preferred the direct path, which is a stronger result than a
   STUN-only run on both ends. A clinic-LAN defense demo will not need coturn
   to establish a call.

   **Not fully retired**, for two reasons, and neither is a reason to build
   differently: (a) this is one network pair, and the ~10–20% of connections
   behind symmetric NAT that need a relay are by definition not the pair that
   was tested; (b) the call did not *hold* — see risk 7, where a relay is one
   of the candidate fixes. Keep coturn in the deployment budget as insurance;
   drop it from the critical path.
3. ~~**Three new dependencies need explicit approval** before installation.~~
   **Resolved 2026-07-31** — all four approved. `spatie/laravel-activitylog`
   (^4.12) is **installed and in use** (Phase 4). `laravel/reverb`,
   `laravel-echo` and `pusher-js` are **approved but deliberately not
   installed**: Reverb needs its own process added to `composer dev`, and none
   of the three does anything until Phase 3 starts. Install them at the top of
   Phase 3, not before.
4. **The paper's test tables currently claim passes for unbuilt features.** Phases
   1–3 close most of that gap, but **Tables 3/5/6** must be rewritten to match
   reality at whatever point the paper is submitted — not left to resolve itself.
   **Tables 7 and 8 additionally have no usable result column at all** (§6.10).
5. **Objectives 4 and 5 are schedule risk, not build risk.** The ISO 25010
   evaluation needs real evaluators across four roles and cannot be run until the
   system is walkable end-to-end, which puts it behind Phase 5. Booking evaluator
   time late is how capstones miss submission. Start recruiting during Phase 4.
6. **Citation drift in this file itself.** The first version cited every test
   table one number high and invented a "Table 9". Corrected 2026-07-31. Any
   future claim about the paper quotes the document's own caption, verified
   against the extracted text — not a running count.
7. **NEW 2026-08-02 — the call connects but does not stay connected.** The
   two-device run established two-way video and then dropped after **17
   seconds**, both peers simultaneously, `connected → disconnected → failed`.
   That interval is the ICE consent-freshness window (RFC 7675: STUN binding
   checks every 5s, connection failed after ~15s unanswered), so the hole punch
   succeeded and the NAT mapping then stopped responding — a classic
   address-dependent-NAT signature.

   This replaces risk 2 as the live WebRTC risk, and it is the more dangerous
   one, because a 17-second call *demos as working*. Table 3's "Start
   consultation session — video session starts successfully" would pass on this
   build and still be useless to a clinic.

   Unresolved: whether it is the NAT, one peer's wifi/cellular handoff, or an
   artefact of the asymmetric TURN configuration in that run. The spike now
   records a **call-held duration** so the retest produces a number.
   **A run holding ≥2 minutes is the bar before any Phase 3 UI work starts.**
   If it cannot, TURN moves from insurance to requirement — a relay keeps a
   binding alive that direct hole-punching does not.

   > **RESOLVED 2026-08-04 — the bar was met, and the failure mode is now
   > survivable rather than terminal.**
   >
   > | Run | Held | Pair | Outcome |
   > |---|---|---|---|
   > | 2026-08-02 | **17s** | asymmetric TURN | both peers `failed`, call over |
   > | 2026-08-03 | **4m 05s** | `srflx ⇄ srflx` | dropped, call over |
   > | 2026-08-04 | multiple runs, no drop observed | `host ⇄ host (udp)` | same LAN — proves nothing about NAT |
   > | 2026-08-04 | **24m 12s** | **`srflx ⇄ srflx (udp)`** | **held, no drop** |
   >
   > 4m 05s clears the ≥2-minute bar, so **TURN stays insurance and does not
   > become a requirement.** The 17-second run was not reproduced once the
   > asymmetric TURN configuration was removed, which retires the
   > consent-freshness reading as the *general* explanation — it was specific to
   > that configuration.
   >
   > The more important change is that a drop no longer ends a consultation.
   > Phase 3.1 added ICE restart on the initiator, a recovery request from the
   > answerer, a 3-second grace period before either fires, and a re-arming timer
   > — because ICE stops emitting state changes once it settles on
   > `disconnected`, so the original one-shot timer gave each side exactly one
   > chance and then went silent forever. `heldSeconds` now survives a reconnect
   > rather than resetting, which is what makes the number above measurable at
   > all.
   >
   > **CLOSED on evidence, 2026-08-04.** A 24m 12s call between two devices on
   > separate WiFi networks, selected pair `srflx ⇄ srflx (udp)`. That is the
   > number Table 3 needs, and it says three things at once:
   >
   > - **It held for the length of a real consultation.** The original 17-second
   >   failure is not reproducible on this build.
   > - **`srflx ⇄ srflx` means both peers were behind NAT and connected
   >   *directly*.** The hole punch succeeded and stayed alive for 24 minutes,
   >   so consent freshness is being maintained — the exact mechanism that failed
   >   in the 2026-08-02 run.
   > - **No `relay`, so TURN was never used.** It stays insurance, not a
   >   requirement, and this is now measured rather than assumed.
   >
   > **The one case still unmeasured:** mobile data. Carrier-grade NAT is where
   > STUN hole-punching most often fails, and patients will be on it. If a
   > CGNAT run ever reports `relay`, the relay is doing real work and TURN
   > capacity becomes a deployment cost; if it fails outright, TURN becomes a
   > requirement. Neither changes the result above — a direct connection across
   > two NATs is the harder thing to achieve and it works.

---

## Change Log

*Appended per the §0 protocol. Newest entries at the bottom.*

### 2026-07-31 — Cross-reference complete; build log created

**Phase:** 0 · **Status:** partial

**Changed:** `WELLCARE-BUILD-PLAN.md` (new, repo root)

**Why:** `DIAGRAM.png`, `Group 5 chapter 123.docx`, and the codebase had never
been compared against each other. Establishing the real gap between what the
paper promises and what exists — before more code widens it — and creating the
running log that keeps the two from drifting apart again.

**Verified:** Read `DIAGRAM.png` and all 11 figures embedded in the docx
(`image7.png` Fig. 6 DFD, `image10.png` Fig. 4 context, `image11.png` Fig. 8
admin DFD, `image12.png` Fig. 10 nurse DFD, `image26.png` Fig. 11 patient DFD,
`image27.jpg` Fig. 7 ERD, `image31.png` Fig. 3 use case, `image32.png` Fig. 9
doctor DFD) plus all 9 document tables and the full Ch. 1–3 text. Cross-checked
against 31 migrations, 15 models, 17 controllers, `routes/web.php`,
`routes/settings.php`, all role sidebars, and the 19-file test suite.

Findings recorded: LOA and virtual consultation have **no schema or code**;
patient portal is ~10% built against its documented scope; 11 of 12 admin/HR
flows in Fig. 4 are unbuilt; 8 defects found inside the paper itself, including a
Ch. 3 paragraph claiming the system was built with Next.js and Firestore.

> *[Correction appended 2026-07-31: the "Verified" line above claims "all 11
> figures embedded in the docx" and then lists 8. The docx has **17 numbered
> figures across 18 captions**. Figures 1 (both), 2, 5 and 12–17 were **not**
> read on that pass. This is exactly the overstatement §0 forbids — logged here
> rather than quietly edited away.]*

**Blocked / left out:**
- `mcp__laravel-boost__database-schema` returned `{"tables":[]}` — the local
  `wellcare_db` is not migrated. All schema analysis was read from migration
  files instead, which reflects intended state, not live state. Re-verify against
  a real database once Phase 0 step 3 is done.
- Phase 0 steps 2–4 (commit working tree, create `wellcare_test`, run
  `composer ci:check`) not started. Committing 40+ files is the user's call.

---

### 2026-07-31 — Phase 1: patient records + laboratory results

**Phase:** 0 and 1 · **Status:** done

**Changed:**
- `app/Http/Controllers/Patient/PatientRecordController.php` (new)
- `app/Http/Controllers/Patient/PatientLabResultController.php` (new)
- `app/Models/User.php` — added `guaranteedPatients()`
- `routes/web.php` — 4 routes in the `role:user` group
- `resources/js/pages/user/records/` (new — page, detail, 4 sections, 2 components, data)
- `resources/js/pages/user/lab-results/` (new — page, 2 sections, 2 components, data)
- `resources/js/pages/user/layout/patient-dashboard-data.ts` — 2 nav items
- `tests/Feature/Patient/PatientPortalAccessTest.php` (new — 14 tests)

**Why:** The patient portal was the largest documented-vs-built gap (~10%). The
paper promises patients can view medical records and laboratory results
(Objective 1.2, Scope "Patients", Fig. 4, Fig. 11) and Table 4 marks both
"Pass", but no route, controller or page existed. No schema changes were needed —
every supporting table was already in place.

> *[Correction appended 2026-07-31: "Table 4" above should read **Table 3**
> (Unit Testing for Patients). Entry otherwise left as written — see the
> 2026-07-31 verification entry below.]*

**Verified:**
- Baseline before any code: `php artisan test --compact` → **85 passed (330 assertions)**
- After: `php artisan test --compact` → **99 passed (451 assertions)** — +14, none broken
- `php artisan test --compact --filter=PatientPortalAccessTest` → **14 passed (121 assertions)**
- `npm run types:check` (`tsc --noEmit`) → clean, no output
- `vendor/bin/pint --dirty` → fixed `fully_qualified_strict_types`, `ordered_imports`
- `php artisan route:list --path=user` → 7 routes, `documents` literal correctly
  ahead of the `{patient}` wildcard

Access control is the point of this phase and is tested directly: a guarantor
gets 403 on another guarantor's patient and on their documents; two patients
under one account do not bleed into each other; `requested` and `recorded` lab
results are invisible to patients and only `reviewed` ones are returned.

**Blocked / left out:**
- **Process error, corrected.** Running `npm run format` and `npm run lint` from
  the plan's verification step rewrote **189 files under `resources/`** — they
  are repo-wide (`prettier --write resources/`, `eslint --fix`), not scoped to
  the 3 existing files this phase touched. Tests and types stayed green
  throughout, so nothing was lost, and the drift pre-existed: `composer ci:check`
  runs `format:check`, which those 189 files were already failing. **65 files
  were proved to be pure reformats of their committed version and were reverted**
  (verified by re-formatting the `HEAD` snapshot and diffing). The remaining 124
  keep their formatting — `eslint --fix` makes semantic edits, so its changes
  could not be safely separated from the pre-existing uncommitted work. Lesson:
  scope formatters to changed paths on a branch that carries someone else's
  uncommitted work.
- **`Patient::findOrCreateFromBooking()` guarantor gap** (`app/Models/Patient.php`).
  It matches on name + contact number and returns the existing row **without
  reassigning `guarantor_id`**. If Alice books for her mother, the mother's later
  self-booking resolves to the same patient row — still guaranteed by Alice. The
  mother sees nothing in her own portal; Alice retains access. Invisible before
  this phase, reachable now. Fixing it means deciding whether a patient may have
  multiple guarantors — a schema and policy decision, deliberately not made here.
- Patient LOA status page — Phase 2, nothing to show until `loa_requests` exists.
- The WebRTC spike planned to run alongside this phase was not started.
- Manual browser walkthrough not performed; verification is automated only.

---

### 2026-07-31 — Document verification pass; citations corrected

**Phase:** parallel (document track) · **Status:** done

**Changed:** `WELLCARE-BUILD-PLAN.md` (§Context, §1, §2, §2a *new*, §2b *new*,
§3, §4, §5.2, §6, §7, §8, §8b, §9 Phase 7 *new*, §9 parallel track, §12,
Change Log)

**Why:** This file asserted what `Group 5 chapter 123.docx` says without anyone
having re-read the docx against it. A build plan whose citations are wrong is
worse than no plan — it puts wrong table numbers into the paper's own revision
list and into defense answers.

**Verified:** Extracted `Group 5 chapter 123.docx` (854 KB `document.xml`,
24 media files) and read the full Ch. 1–3 text, all 8 numbered tables, the
uncaptioned Ch. 2 synthesis matrix, the 4 tracked-change comments, and these
images directly: `image27.jpg` (Fig. 7 ERD), `image31.png` (Fig. 3 use case),
`image10.png` (Fig. 4 context), `image7.png` (Fig. 6 DFD), `image11.png`
(Fig. 8 admin), `image32.png` (Fig. 9 doctor), `image12.png` (Fig. 10 nurse),
`image26.png` (Fig. 11 patient), `image9.png` (Fig. 12 login), `image1.png`
(Fig. 16 coverage step), plus `DIAGRAM.png`.

*Confirmed correct as previously written* — Fig. 6's 7 processes / 4 stores /
dropped numbers / `TB3 PATIENT PROCESS` typo; the hand-drawn's numbers 1–7,
`TB9` typo and dropped return curve; HR ADMIN drawn upstream of its own process;
Fig. 3's exact 10 ovals and the missing "Manage Providers"; Fig. 4's 12 Admin/HR
flows verbatim; Fig. 8's 7 `tbl_*` stores; the ERD's 9 tables, all-`bigint`
typing and `diagnosis.user id` PK; the LOA and virtual-consultation column
lists; the duplicated-clause Next.js/Firestore paragraph; the double "Figure 1";
XAMPP; and every Scope/Objective quote marked verbatim.

*Corrected:*
1. **Every test-table citation was one number too high.** Doc has 8 numbered
   tables; the plan had cited 4/6/7/8/9 where the doc says 3/5/6/7/8. **"Table 9"
   does not exist.** Cause: the uncaptioned Ch. 2 matrix was counted. Added the
   citation key in §Context.
2. **"11 figures" → 17 numbered across 18 captions.** Added §2a for Figures
   12–17, which are screenshots of the *running app* and document the built
   login, registration and 4-step booking wizard.
3. **Virtual consultation is in neither the General Objective nor the Scope**,
   contrary to §8b. Rewrote §5.2 with the real 11 locations and the list of
   places it is absent.
4. **§7's "the ERD shows a 1:1 user→patient" was wrong.** Fig. 7 has no user
   table and its `appointment` carries both `user id` and `patient id` — the ERD
   *supports* the guarantor split. The 1:1 wording came from the caption prose.
5. Store vocabularies: three → **six**. `DOCTOR` in Fig. 6: twice → **three
   times**. Branch-name spellings: three → **four**.
6. Hardware table is **Table 1**, not Table 2.

*Added:*
- **§2b + Phase 7** — Objectives 4 (ISO 25010 evaluation) and 5 (implementation
  plan, user training, manual→digital transition) had **no coverage anywhere in
  this file**. Two of the paper's five numbered objectives were missing from the
  build order entirely. Both now have scorecard rows at 0%.
- **§6 defects 9–15** — Figure 7's caption describing a different diagram than
  Figure 7's image (the worst contradiction in the paper); Table 8's duplicated
  `System Response` header and absent result column; Fig. 10's "Doctor
  Credentials"; Fig. 9's dangling `CONSULTATION` process; Definition of Terms
  omitting LOA/Guarantor/Virtual Consultation while defining an unused
  *Comparative Analysis*; "STAFF NURRSE" and the Admin/HR naming split; the
  uncaptioned Ch. 2 matrix.
- 10 new items on the parallel document-correction track.
- §12 risks 5 and 6.

**Blocked / left out:**
- **No code was touched and no tests were run** — this is a documentation pass
  only. The last recorded suite state remains 99 passed / 451 assertions.
- Prior Change Log entries were **not** rewritten. The two factual errors inside
  them (a "Table 4" citation, and a "Verified: all 11 figures" line that listed
  8) are marked in place with bracketed corrections, per §0's rule against a log
  that only records successes.
- `image5.png` (Fig. 1 conceptual), `image29.jpg` (Fig. 1 Agile), `image23.jpg`
  (Fig. 2 current flow), `image30.jpg` (Fig. 5 theoretical) and Figs. 13/14/15/17
  were **not** opened this pass. Their captions were read; the images were not.
  Figures 1, 2 and 5 carry no requirements, so this is low-risk — but it is not
  "all figures verified", and this entry does not claim it is.
- The §6 document corrections are **listed, not made**. Editing the .docx is
  Group 5's call, not this repo's.

---

### 2026-07-31 — Phase 2: LOA as a first-class module

**Phase:** 2 · **Status:** done

**Changed:**
- `database/migrations/2026_07_31_045857_create_loa_requests_table.php` (new)
- `database/migrations/2026_07_31_045858_backfill_loa_requests_from_appointments.php` (new)
- `app/Models/LoaRequest.php` (new)
- `database/factories/LoaRequestFactory.php` (new)
- `app/Services/LoaService.php` (new)
- `app/Exceptions/InvalidLoaTransitionException.php` (new)
- `app/Services/BookingService.php` — constructor injection + LOA creation inside `bookSlot()`
- `app/Http/Controllers/HR/HmoApprovalController.php` — rewired onto `loa_requests`
- `app/Http/Controllers/Patient/PatientLoaController.php` (new)
- `app/Http/Controllers/Nurse/LoaMonitoringController.php` (new)
- `routes/web.php` — 2 new routes; HR wildcards rebound `{appointment}` → `{loaRequest}`
- `resources/js/pages/user/loa-status/` (new — page, 2 sections, 1 component, data)
- `resources/js/pages/nurse/loa-monitoring/` (new — page, 2 sections, 1 component, data)
- `resources/js/pages/hr/hmo-approvals/hmo-approvals.tsx` — LOA fields + copy
- `resources/js/pages/user/layout/patient-dashboard-data.ts`, `.../nurse/layout/nurse-dashboard-data.ts` — nav
- `tests/Feature/Loa/LoaWorkflowTest.php`, `tests/Feature/Loa/LoaAccessTest.php` (new — 34 tests)

**Why:** Objective 1.6 is specifically LOA monitoring, and §5.1 recorded that the
codebase had no LOA table at all — only `appointments.status =
'pending_hmo_approval'`, a binary gate with no reference number, request date,
validity window, approver or remarks. Nothing to track, and nothing for the
patient to check. Figures 8, 10 and 11 each draw an LOA store the code could not
back.

**Verified:**
- `php artisan test --compact --filter=Loa` → **36 passed (169 assertions)**
  — 34 new plus 2 pre-existing document-*download* tests the filter also matches
- `php artisan test --compact` → **133 passed (601 assertions)**, up from the
  Phase 1 baseline of 99 passed / 451 assertions. Nothing broken by rebinding the
  HR route wildcards.
- `vendor/bin/pint --dirty --format agent` → `{"result":"pass"}`
- `npx tsc --noEmit` → clean, exit 0
- `npx prettier --check` on the changed frontend paths → *"All matched files use
  Prettier code style!"* (one file, `loa-card.tsx`, needed `--write` first)
- `npx eslint` on the three changed page dirs → **0 errors**, 1 pre-existing
  warning in `hmo-approvals.tsx`'s toast `useEffect` (untouched code)
- `php artisan route:list --path=loa` → 4 LOA routes, wildcards bound to
  `{loaRequest}`
- **Backfill on real data:** the dev database had 100 appointments, 40 of them
  HMO. After `php artisan migrate`: **40 LOA rows, 40 unique `loa_number`s**,
  5 submitted / 25 approved / 10 rejected, sample `WC-LOA-202607-0001`.
- **Rollback proven:** `migrate:rollback --step=1` → 40 rows → 0; `migrate`
  again → back to 40 with unique numbers. The `whereNotExists` guard makes a
  re-run idempotent and `down()` deletes only rows carrying the backfill
  sentinel.

Access control is tested directly, because an LOA carries the patient's HMO
member ID: a guarantor sees only their own patients' LOAs, another family's
`hmo_id` never appears in the response body, and patients and nurses both get
403 on the HR approve/reject routes.

**Blocked / left out:**
- **MySQL was not running** when this phase started, so the "baseline" suite run
  recorded 41 failures that were pure connection errors. XAMPP's `mysqld` was
  started before any real verification; every number above is from a live
  database. The invalid run is noted here rather than quoted as a baseline.
- **`migrate:fresh --seed` was deliberately not run.** The plan called for it,
  but it would have dropped the 40 existing HMO appointments the backfill
  migration exists to convert — destroying the only realistic test of that
  migration, and the user's dev data with it. Plain `migrate` against the
  populated database is the stronger check and was used instead.
- **No scheduled expiry sweep.** `valid_until` is stored and `expired` is in the
  enum, but nothing writes it. `LoaRequest::$is_expired` and `$display_status`
  derive it at read time, so an approved-but-lapsed LOA never renders as usable
  coverage. A console command belongs with Phase 6.
- **No LOA-to-HMO email.** Table 6 claims *"Send LOA request to HMO via email —
  Pass"*. Mail is still the `log` driver; this stays on the §9 document-
  correction track.
- **No LOA reuse across appointments** — one LOA per appointment, per the ERD.
- **Backfilled rows have `approved_by = null`.** Nothing in the old schema
  recorded who approved a historical HMO appointment; inventing an HR user would
  have been fabricated audit data.
- **Rollback edge case:** `down()` matches the `remarks` sentinel, so a
  backfilled LOA that HR later approved *with remarks* would survive a rollback.
  That fails safe — it declines to delete a row someone has acted on.
- **Manual browser walkthrough not performed.** Verification is automated only;
  the three pages are asserted through Inertia component + prop assertions, not
  rendered in a browser. The §10 end-to-end walk is still outstanding.

---

### 2026-07-31 — Phase 4: admin module

**Phase:** 4 · **Status:** done

**Changed:**
- `database/migrations/2026_07_31_060959_add_is_active_to_users_table.php` (new)
- `database/migrations/2026_07_31_0617{12,13,14}_*_activity_log_table.php` (new, published)
- `config/activitylog.php` (new, published)
- `app/Concerns/RecordsActivity.php` (new)
- `app/Services/StaffAccountService.php` (new)
- `app/Exceptions/AccountActionNotAllowedException.php` (new)
- `app/Http/Middleware/EnsureUserIsActive.php` (new)
- `app/Http/Controllers/Admin/{AdminDashboard,AdminUser,AdminPatient,AdminArchive,AdminActivityLog}Controller.php` (new)
- `app/Http/Requests/Admin/{Store,Update}UserRequest.php` (new)
- `app/Models/User.php` — `is_active` fillable/cast/default, `active()`/`inactive()` scopes, `RecordsActivity`
- `app/Models/{Appointment,Patient,LoaRequest,LabTestResult}.php` — `RecordsActivity` + per-model audited attributes
- `app/Actions/Fortify/CreateNewUser.php` — now delegates to `StaffAccountService`
- `app/Providers/FortifyServiceProvider.php` — `authenticateUsing()` deactivation gate
- `app/Http/Controllers/DashboardController.php` — `admin` → `admin.dashboard`
- `bootstrap/app.php` — `EnsureUserIsActive` appended to the `web` group
- `routes/web.php` — 13 new routes in the `role:admin` group
- `database/seeders/AdminSeeder.php` (new) + `DatabaseSeeder.php`
- `database/factories/UserFactory.php` — `is_active`, `deactivated()` state
- `resources/js/pages/admin/` (new — layout, 4 shared components, dashboard, users, patients, archive, activity-log: 26 files)
- `tests/Feature/Admin/{AdminAccess,AdminUserManagement,AdminDeactivation,AdminArchive,ActivityLog}Test.php` (new — 95 tests)
- `tests/Feature/DashboardTest.php` — updated for the new admin landing route, plus a new test that admins still reach `/hr/dashboard`
- `composer.json` / `composer.lock` — `spatie/laravel-activitylog ^4.12`

**Why:** §8 named the admin module the single largest remaining gap at ~5%, with
11 of Figure 4's 12 admin/HR flows unbuilt and `role:admin` guarding exactly one
route. It maps to Objectives 1.1 and 1.3, which are graded — unlike virtual
consultation (§5.2), which is documented in eleven places and named in no
objective. Built ahead of Phase 3 for that reason; see §11.

**Verified:**
- Baseline before any code: `php artisan test --compact` → **133 passed (601 assertions)** — matches the Phase 2 record exactly
- After: `php artisan test --compact` → **230 passed (955 assertions)** — +97, nothing broken
- `vendor/bin/pint --dirty --format agent` → `{"result":"pass"}`
- `npx tsc --noEmit` → clean, no output
- `npx eslint resources/js/pages/admin` → **0 errors** (scoped, not the repo-wide script — see the Phase 1 lesson)
- `npx prettier --check "resources/js/pages/admin/**/*.{ts,tsx}"` → *"All matched files use Prettier code style!"*
- `php artisan route:list --path=admin` → **14 routes**, literal segments correctly ahead of every `{user}` / `{patient}` / `{id}` wildcard
- `php artisan migrate` → 4 migrations applied against the populated dev database (**not** `migrate:fresh` — same reasoning as Phase 2: it would destroy the 40 real HMO appointments)
- **Seeder idempotency proven:** `db:seed --class=AdminSeeder` run twice → **1 admin user**, profile renders as `Sofia Delacruz`

The security boundary is tested directly, because this module can create
accounts and revoke access: every admin surface returns 403 for `user`,
`doctor`, `nurse` **and `hr`** (a dataset across 5 read routes and 4 write
routes); a deactivated account cannot log in *and* is booted from an
already-open session; an admin cannot deactivate or demote themselves; and no
password hash, `two_factor_secret` or `remember_token` reaches either the user
list or the activity log.

**Two real bugs were found by the tests and fixed, not worked around:**
1. `User` had no model-level `is_active` default. A DB column default is applied
   on INSERT but never read back into the model that performed it, so every
   freshly created user carried `NULL` in memory — and `EnsureUserIsActive`,
   which reads the session's model, logged them straight back out. Caught by 8
   pre-existing auth tests failing. Fixed with `protected $attributes`.
2. Both activity-log queries ordered by `latest()` alone. Several entries
   routinely land in the same second (one request updating two models), leaving
   their display order up to the database. Fixed with an `id` descending
   tiebreak in `AdminActivityLogController` and `AdminDashboardController`.

**Blocked / left out:**
- **`Generate Reports` and `Backup Database` were deliberately not built.**
  Reports are the same aggregation as Objective 1.5 and belong to Phase 6;
  building them here means building them twice. Database backup is a
  `mysqldump` runbook step for Objective 5 (Phase 7) — a backup button that
  shells out from an authenticated web request is a security liability, not a
  deliverable. Both are now recorded as deferred in §4 and §8 rather than left
  reading as oversights.
- **The last-active-admin guard is unreachable over HTTP.** Only an active admin
  can call these routes, so one always remains, and the single case that would
  empty the set — acting on oneself — is caught first by the self-guard. It is
  kept as defence in depth for a future console command or bulk action, and is
  asserted at the service layer instead. The first version of that test claimed
  to exercise it through HTTP and did not; corrected rather than left standing.
- **`AdminFlash` was rewritten after ESLint rejected it.** The first version
  reset a `dismissed` boolean inside a `useEffect`, a setState-in-effect
  cascade. Now keyed on *which* message was dismissed, deriving the same
  behaviour during render with no reset step.
- **No activity-log retention.** Spatie ships `activitylog:clean`; nothing
  schedules it. The table grows unbounded. Belongs with the Phase 6 console work
  alongside the LOA expiry sweep.
- **`hmo_id` is deliberately absent** from the admin patient list, the patient
  edit form and the audited attributes of both `Patient` and `LoaRequest`. It is
  insurance identity, and `LoaAccessTest` already treats it as data that must
  not cross between families; routing it into an admin-readable table would go
  around that boundary. `hmo_provider` is editable — it is already visible to HR
  and nurses on the LOA screens.
- **Reverb / Echo / pusher-js approved but not installed** — see §12 risk 3.
- **The WebRTC spike still has not been run.** It needs a human, a camera and
  two tabs. It is the evidence the deferred §5.2 decision is waiting on.

  > *[Correction appended 2026-07-31: this was true when written and became
  > false the same day — the spike was run within the hour. Superseded by the
  > entry below rather than edited away, per §0.]*
- **Manual browser walkthrough not performed.** Verification is automated only.
  The §10 end-to-end walk remains outstanding across all four phases so far.

---

### 2026-07-31 — WebRTC spike run (single machine)

**Phase:** 1 (deferred item) · **Status:** partial

**Changed:** `WELLCARE-BUILD-PLAN.md` only (§5.2, §9 Phase 1 checkbox, §12
risks 1–2, Change Log). **No code was touched.**

**Why:** `public/webrtc-spike.html` had been built on 2026-07-31 but never
executed, and §11 recorded the virtual-consultation scoping decision as
deliberately deferred until it produced real evidence. An unrun spike is not a
de-risking step — it is a to-do that looks like one.

**Verified:** The spike was run by the user: **two tabs on one machine, camera
granted, offer/answer exchanged by copy-paste, peer connection established and
two-way video rendered.**

That result retires three of the four independent failure modes the harness was
built to probe:

| Risk probed | Outcome |
|---|---|
| `getUserMedia` — will the browser grant camera + mic here | ✅ granted |
| `RTCPeerConnection` — does negotiation complete | ✅ completed |
| Offer/answer exchange | ✅ both tabs reached a live connection |
| **ICE / NAT traversal** | ❌ **not exercised** |

**Blocked / left out — read this before citing the spike in the paper:**
- **NAT traversal is unproven, and the run cannot be described as proving it.**
  Both peers were on one host, so ICE had a trivial path and never crossed a
  network boundary. This says nothing about a patient at home connecting to a
  doctor at the clinic, which is the actual deployment shape.
- **The `Candidate types` diagnostic row was not captured.** That row is the
  empirical answer to §12 risk 2 (does this deployment need a TURN server), and
  without it the TURN question stands exactly where it did before the run. The
  spike page reports it; a second run should record it verbatim.
- **What would settle it:** one more run with the far tab on a **different
  device on a different network** — a phone on mobile data, not the same wifi.
  If that is impractical, the fallback is not a blocker but a documented
  limitation: §12 risk 2 already sanctions scoping the demo to a single clinic
  LAN provided Ch. 3 says so. The failure mode to avoid is discovering it during
  the defense.
- Consequently the Phase 1 checkbox stays **`[~]`, not `[x]`**. The valuable
  half is done; the half that changes a deployment decision is not.

**What this unblocks:** §5.2's scoping question is now a *scoping* question
rather than a feasibility one. Group 5 can decide whether to add virtual
consultation to Objective 1 and build Phase 3, or cut it from Figures 3/4/7/8/11
and Tables 3/4/7/8, knowing that the technology does work in this environment.

---

### 2026-07-31 — Stale Vite manifest; `npm run build` added to the phase checklist

**Phase:** 4 (follow-up) · **Status:** done

**Changed:** `public/build/` regenerated. `WELLCARE-BUILD-PLAN.md` (§10, Change
Log). **No application code was touched.**

**Why:** A confirmation run of the suite came back **112 failed, 118 passed** in
**1608 seconds** — against a run 20 minutes earlier of 230 passed in 45 seconds,
with nothing but Markdown edited in between. The duration was the tell: a real
regression does not make a suite 35× slower.

**Verified — the cause, then the fix:**
- The failure text was `Unable to locate file in Vite manifest:
  resources/js/pages/admin/activity-log/activity-log.tsx`, **not** a database or
  assertion error.
- `public/hot` did not exist, so Vite was resolving through the built manifest
  rather than a dev server.
- `public/build/manifest.json` was dated **23 April** and contained **0**
  matches for `pages/admin`. Every Phase 4 page was missing from it.
- The earlier 230-pass run had succeeded because `composer dev` was running at
  the time (for the WebRTC spike), so Vite served from the dev server and never
  consulted the manifest. When that was stopped, the stale manifest took over.
- `npm run build` → *"✓ built in 48.34s"*; the manifest now carries **113**
  `pages/admin` entries, including all 12 admin page and component modules.
- `php artisan test --compact` → **230 passed (955 assertions)** in 45.55s.
  Identical to the pre-existing figure. Nothing had regressed.

**Why this is worth a Change Log entry rather than a silent rebuild:** any test
that calls `assertOk()` on an Inertia page renders `app.blade.php`, which
resolves assets through Vite. A new page therefore silently breaks the suite
until either `npm run build` runs or a dev server is up — and it fails with a
count so alarming (112 failures) that the natural reaction is to go hunting for
a regression that does not exist. CLAUDE.md warns about this for the *UI*; it
bites the *test suite* the same way, and that is not written down anywhere.

**Added to the §10 verification list** so no future phase loses time to it.

**Blocked / left out:**
- `public/build/` is generated output. It is **not** in `.gitignore` in this
  repo, so the rebuild shows as a large diff. It should not be reviewed
  line-by-line, and whether it belongs in version control at all is a separate
  question this entry does not settle.

---

### 2026-08-01 — Phases 1, 2 and 4 committed and pushed

**Phase:** 0 (reversal of a Phase 0 decision) · **Status:** done

**Changed:** `.gitignore` (agent-tooling caches), `WELLCARE-BUILD-PLAN.md`
(§9 Phase 0 checkbox, §11 new decision row, this entry). **No application code
was touched** — this entry is about getting existing work into version control,
not changing it.

**Why:** `feat/patient-portal-records` was **0 commits ahead of `main`** and
existed only on one machine — it had never been pushed. Everything Phases 1, 2
and 4 produced (12 migrations, ~132 new project files, 143 of the 230 tests)
survived only as uncommitted working-tree state. A stray `git checkout`, a
failed merge or a disk fault would have erased three phases of work.

This **reverses** the Phase 0 decision of 2026-07-31 ("leave the uncommitted
work untouched and branch for new work instead"). That call was sound when one
phase was at stake. By 2026-08-01 three were, and the branch it created had
never actually been committed to. Per §0 the reversal is logged as a new entry
and a new §11 row rather than an edit to the original.

**Verified:**
- `git rev-list --left-right --count main...HEAD` before → **`0 0`**; after →
  **`0 4`**
- Four commits, `git log --oneline main..HEAD`:
  `0d3d36e` inherited working tree (197 files) · `515fe72` Phase 1 (20 files) ·
  `6fbfcd7` Phase 2 (25 files) · `009a498` Phase 4 (66 files) — **308 files
  total**
- `git status --porcelain` after the fourth commit → **empty**
- `git push -u origin feat/patient-portal-records` → **`* [new branch]`**, now
  tracking `origin/feat/patient-portal-records`
- **Suite re-run from the committed tree with MySQL live:**
  `php artisan test --compact` → **230 passed (955 assertions)** in 45.97s —
  reproduces the Phase 4 record exactly, so the commits preserved the work
  rather than mangling it.

**Blocked / left out:**
- **The layered commits are a narrative, not a bisectable history.** Several
  files were touched by more than one phase (`app/Models/User.php` by 1 and 4,
  `routes/web.php` by all three). Only their *final* content ever existed — the
  intermediate states were never saved. Each file was placed in the commit where
  it **originated**, so a later phase's edit rides along in an earlier commit
  (`LabTestResult.php` carries its Phase 4 `RecordsActivity` trait into the
  inherited commit; `LoaRequest.php` likewise into the Phase 2 commit).
  **Only the tip commit is green.** Do not claim bisectability in the paper.
- **MySQL was not running** when this session began, so the first attempt at a
  baseline was killed rather than quoted — the same trap the Phase 2 entry
  records. XAMPP's `mysqld` was started first; the number above is from a live
  database.
- **~107 agent-tooling files** under `.claude/` and `.github/skills/` (including
  a `__pycache__`) were gitignored rather than committed. They are local editor
  tooling, not project source.
- The commit is on a **feature branch only**. It has not been merged to `main`
  and no pull request was opened — that is Group 5's call.
- **Manual browser walkthrough still not performed.** §10's end-to-end walk
  remains outstanding across all four completed phases.

---

### 2026-08-01 — Phase 5: nurse module

**Phase:** 5 · **Status:** done

**Changed:**
- `app/Concerns/ReadsPatientRecords.php` (new) — shared read half of a patient
  record; `app/Http/Controllers/Doctor/PatientRecordController.php` refactored
  onto it
- `app/Http/Controllers/Nurse/NurseDashboardController.php` (new)
- `app/Http/Controllers/Nurse/PatientRecordController.php` (new)
- `app/Http/Controllers/Nurse/AppointmentMonitorController.php` (new)
- `app/Http/Requests/Nurse/UpdatePatientDemographicsRequest.php` (new)
- `app/Http/Controllers/DashboardController.php` — nurse landing route
- `routes/web.php` — 9 new routes in the `role:nurse` group (3 → 12)
- `resources/js/pages/nurse/dashboard/`, `.../appointments/`,
  `.../patient-records/`, `.../components/` (new — 22 files)
- `resources/js/pages/nurse/layout/nurse-dashboard-data.ts` — nav 2 → 5 items
- `tests/Feature/Nurse/{NurseAccess,NurseRecordUpdate,NurseDashboard}Test.php`
  (new — 47 tests)
- `tests/Feature/Lab/LabAccessTest.php`,
  `tests/Feature/Admin/AdminUserManagementTest.php` — both pinned the old nurse
  landing route

**Why:** §8 named the nurse module the largest remaining gap after admin, at
~40% — two of Figure 10's five processes, with the nurse landing directly on the
lab queue because it was the whole role. **Table 5 already marks nurse record
access, record update and appointment monitoring "Pass"**, so this closes a
document-integrity gap (§12 risk 4) as well as a build one. It also makes the
nurse role walkable for Objective 4's ISO 25010 sessions, which cannot evaluate
a role that has two screens.

**Verified:**
- Baseline before any code, from the freshly committed tree:
  `php artisan test --compact` → **230 passed (955 assertions)**
- After: `php artisan test --compact` → **277 passed (1179 assertions)** — +47,
  nothing broken
- `php artisan test --compact tests/Feature/Nurse` → **47 passed (223 assertions)**
- `vendor/bin/pint --dirty --format agent` → `{"result":"pass"}`
- `npx tsc --noEmit` → exit 0, no output
- `npx eslint resources/js/pages/nurse` → exit 0, **0 errors** (3 `import/order`
  errors fixed with `--fix`)
- `npx prettier --check` on the files this phase created/edited → *"All matched
  files use Prettier code style!"*
- `php artisan route:list --path=nurse` → **12 routes**, with `allergies` and
  `documents` correctly ahead of the `{patient}` wildcard
- `npm run build` → exit 0; the three new pages are in the Vite manifest

The capability split is asserted directly, because it is the point of the phase:
a nurse gets 403 on the doctor's `storeDiagnosis` route, no `nurse/*diagnos*`
route exists at all (asserted against the router, not one URL), and a
demographics update carrying `hmo_id`, `hmo_provider` and `default_coverage`
leaves all three unchanged.

**One real bug was found by the tests and fixed, not worked around:**
`UpdatePatientDemographicsRequest` was first written with
`Rule::in(['M','F'])` for gender, copied from the *user profile* request.
`patients.gender` is `enum('male','female','other')` — so `'F'` **passed
validation and MySQL then silently truncated the column to `''`**. A silent bad
write, not an error. Fixed in the rule and in `genderOptions`, and pinned by
`it('rejects a gender outside the patients enum')`.

**Blocked / left out:**
- **Diagnoses are deliberately read-only for the nurse** (§11). Fig. 10 says
  "Update Patient Records"; authoring a diagnosis is the attending doctor's
  clinical judgment. The nurse still reads them, and the UI states the reason
  rather than silently omitting the controls — a missing button reads as an
  oversight, a stated boundary reads as a decision.
- **The planned `role:nurse|doctor` guard was not used.** It cannot express a
  partial grant: adding the nurse to the doctor's record routes would have
  handed over `storeDiagnosis`, `updateDiagnosis` and `destroyDiagnosis` too.
  A separate controller plus a shared read concern was used instead (§11).
- **Two pre-existing tests asserted the old nurse landing route** and were
  updated rather than deleted — `LabAccessTest` (which now also asserts the lab
  queue is *still* reachable, since the landing moved but the access did not)
  and `AdminUserManagementTest`'s role-reassignment test.
- **The appointment monitor is read-only.** It has no confirm, cancel or
  check-in action: doctors confirm and patients check themselves in. Figure 4
  asks the nurse to *monitor* the list, not to run it.
- **`resources/js/pages/nurse/lab-queue/lab-queue.tsx` still fails
  `prettier --check`.** It is inherited work from the first commit, untouched by
  this phase; reformatting it here would mix unrelated churn into a feature
  commit. Left for whoever next edits that file — the Phase 1 lesson.
- **No nurse-side lab-result upload beyond the existing queue**, and no activity
  -log auditing added for the new nurse writes. `PatientAllergy` and
  `PatientDocument` do not use `RecordsActivity`; the writes are attributed via
  `recorded_by` / `uploaded_by` (asserted), but they do not appear in the admin
  activity log. Belongs with the Phase 6 console work.
- **Manual browser walkthrough not performed.** Verification is automated only.
  §10's end-to-end walk remains outstanding across all five completed phases —
  this is now the oldest outstanding item in the plan.

---

### 2026-08-03 — WebRTC spike run 2: two-device harness

**Phase:** 1 (closing out) · **Status:** partial — *harness done, the run itself
has not been performed*

**Changed:**
- `public/webrtc-spike.html` — room-code signalling, remote-candidate capture,
  results export, opt-in TURN toggle, insecure-origin banner
- `app/Http/Controllers/Spike/WebRtcSignalController.php` (new)
- `routes/web.php` — 3 routes inside an `app()->environment('local')` guard
- `WELLCARE-BUILD-PLAN.md` — §9 Phase 1 spike item, §12 risk 2, this entry

**Why:** §12 risk 2 (does this deployment need TURN?) is the last open question
gating Phase 3, and it can only be answered by running the spike across two
devices on *different networks*. The 2026-07-31 run could not: both peers shared
one host. Two concrete things blocked the re-run, and neither was WebRTC.

1. **Secure context.** `getUserMedia` is unavailable outside one. `127.0.0.1`
   and `localhost` qualify; `http://192.168.18.3:8000` does not. A phone opening
   the LAN address gets no camera and no meaningful error — the failure looks
   like a WebRTC problem and is not one. Fixed by serving the page over an
   HTTPS **cloudflared quick tunnel** (no account required, unlike the installed
   `ngrok`, which has no authtoken configured). The tunnel is also what lets the
   phone be on **mobile data instead of the same wifi** — the configuration that
   actually crosses a NAT boundary. Media stays peer-to-peer; the tunnel carries
   only the page and the signalling.
2. **Signalling.** A non-trickle offer carrying a full candidate set is 3–6 KB
   of base64. Hand-moving that off a phone is not a test anyone runs twice. A
   room code now moves it through a throwaway cache-backed relay. Manual
   copy-paste is retained beneath it — it is the mode already proven to work,
   and it survives the relay being unreachable.

The page also now reads **remote** candidate types and the selected pair out of
`getStats()` (three fallbacks for identifying the pair, since Firefox does not
always set `nominated`), and exports both sides' readings as one pasteable
block. Run 1 recorded no candidate types at all; that is the specific omission
that left risk 2 open, so capturing them is the point of this change.

**Verified:**
- `vendor/bin/pint --dirty --format agent` → `{"result":"pass"}`
- `php artisan route:list --path=webrtc` → **3 routes**, `Spike\WebRtcSignalController`
- `php artisan test --compact` → **277 passed (1179 assertions)** — unchanged
- Relay against a live `php artisan serve`, verbatim: `POST` offer →
  `{"stored":true}`; `GET` → `{"blob":"aGVsbG8td29ybGQ="}`; room lookup is
  case-insensitive (stored `TEST01`, read `test01`); `GET` of an unset role →
  `{"blob":null}`; **re-posting an offer wipes a stale answer** →
  `{"blob":null}`; `POST /clear` → `{"cleared":true}` then `{"blob":null}`;
  malformed room `no!` → **HTTP 422**; role `hack` → **HTTP 422**
- End to end over the tunnel `https://taxes-carol-process-forecast.trycloudflare.com`:
  `GET /webrtc-spike.html` → **HTTP 200, 30356 bytes, scheme=https**;
  `POST` → `{"stored":true}`; `GET` → `{"blob":"dHVubmVsLXRlc3Q="}`

**Blocked / left out:**
- **The actual two-device run has not been done.** Everything above proves the
  *harness* works — HTTPS reaches the page, the relay carries blobs. It proves
  nothing about ICE across a NAT, which is the entire question. §9 Phase 1 stays
  `[~]` and §12 risk 2 stays open until the run happens and its output is
  recorded here verbatim.
- **No Pest test for the relay, deliberately.** The routes are registered only
  under `app()->environment('local')`, so they do not exist in the `testing`
  environment and a feature test could not reach them without weakening the
  guard that keeps an unauthenticated endpoint out of production. It was
  verified against a live server instead, quoted above. This is throwaway
  scaffolding deleted at the top of Phase 3, not a feature — §10 already says
  Pest cannot drive WebRTC and to test what it can.
- **The relay is not the Phase 3 design and must not be mistaken for it.**
  Phase 3 replaces it with a `WebRtcSignal` broadcast on the private
  `consultation.{roomId}` channel, authorized to exactly the session's doctor
  and the appointment's guarantor. That authorization is the security boundary
  of the whole feature; this spike relay has none, which is why it is
  `local`-only and why it dies with the spike.
- **The public TURN relay in the toggle (`openrelay.metered.ca`) is a test
  service, not a deployment answer.** It exists to prove *whether a relay fixes
  a failed run*. If it does, the deliverable is still coturn or a paid hosted
  relay, budgeted per §12 risk 2.
- **`cloudflared` lives at `C:/Users/admin/tools/cloudflared.exe`, outside the
  repo, and is not wired into `composer dev`.** The path is machine-local and
  the group shares this repo; a hardcoded absolute path in `composer.json`
  would break for everyone else.

---

### 2026-08-02 — WebRTC spike run 2, attempt 1: failed on a harness defect

**Phase:** 1 · **Status:** blocked → fixed; the run still has not connected

**Changed:**
- `app/Http/Controllers/Spike/WebRtcSignalController.php` — blob cap 8192 → 65536
- `public/webrtc-spike.html` — surface validation detail on a rejected publish;
  log blob size; `resetRunState()` per attempt; relabel the link-speed line
- `WELLCARE-BUILD-PLAN.md` — §9 Phase 1 spike item, this entry

**Why:** The first genuine two-device attempt was run — a Windows host and a
macOS peer, on different networks, both reaching the page over the cloudflared
HTTPS tunnel. It never connected. **The cause was mine, in the relay, and had
nothing to do with WebRTC.**

`max:8192` on the blob was an underestimate, written from a guess rather than a
measurement. A Chrome unified-plan offer is ~7 KB of SDP *before any candidate*
— three video codecs with their rtx pairs, extmaps, ssrc groups — and base64
inflates it by a third. Measured: **11,820 characters.** Every offer `POST`
returned 422, so the offer was never stored, so the joining peer polled for two
minutes and timed out. The joiner's log read `No offer arrived within 2 minutes.
Check both devices are on the same room code` — which pointed at the two people
running the test rather than at the server that had rejected the offer.

Two secondary defects surfaced in the same session and are fixed with it:

1. **Stale readings across attempts.** `localCandidateTypes` and `stats` live in
   module scope and were only cleared on *Hang up*. The TURN-enabled attempt
   therefore reported `local cand types: host, srflx` that had actually been
   gathered by the earlier STUN-only attempt. A blended reading is worse than an
   empty one, because it looks like a result — and this harness exists purely to
   produce a trustworthy reading. `resetRunState()` now runs per attempt.
2. **A misleading label in the results block.** `navigator.connection.`
   `effectiveType` is a *speed* bucket, not a transport: broadband reports `4g`
   exactly as cellular does. Both devices reported `connection type: 4g`, which
   invites the wrong inference that both were on mobile data. Relabelled to
   `link speed bucket` with the caveat inline. Whether wifi was off is a fact
   only the tester holds.

A rejected publish also said only `Relay rejected the offer (HTTP 422)`. Laravel
puts the failing rule in the response body; the client now reads it out. An
opaque status code is undiagnosable from a phone, and that is what cost this
session.

**Verified:**
- `vendor/bin/pint --dirty --format agent` → `{"result":"pass"}`
- Relay with a blob at realistic size, verbatim: **11,820 chars** → `{"stored":true}`,
  read back at **11,820 chars** — byte-identical round trip. Under the old rule
  this exact payload was the 422.
- 422 body now carries the reason:
  `{"message":"The blob field is required.","errors":{"blob":["The blob field is required."]}}`
- Updated page live over the tunnel → **HTTP 200, 31958 bytes**, and greps
  positive for the three new markers.
- Tunnel headers show `CF-Cache-Status: DYNAMIC` — Cloudflare is not caching the
  page, so a browser hard-refresh is enough to pick up the fix.

**What the failed attempt did establish** — worth recording, because it is
evidence and it was paid for:
- **The HTTPS half of the harness works.** Both peers reported
  `secure context: true` and both were granted camera and microphone. The
  problem §9 identified — a phone on a LAN address getting no camera and no
  error — is genuinely solved.
- **The host peer gathered `host, srflx`.** STUN traversed *that* peer's NAT and
  returned a server-reflexive candidate. That is one half of the traversal
  question answered: the Windows side is not behind something that blocks STUN
  outright.

**Blocked / left out:**
- **§12 risk 2 is still open.** A gathered `srflx` candidate on one peer is not
  a connected pair. Nothing here says whether these two NATs traverse *to each
  other*, which is the actual question. No `selected pair` was ever produced,
  because ICE never ran.
- **ICE gathering timed out at 8s on every host attempt**, never reaching
  `complete`. Candidates were gathered regardless and the partial set is emitted
  by design, so this did not contribute to the failure — but it is unexplained
  and should be watched on the retry rather than assumed benign.
- **The relay's size rule was never tested against a real SDP before shipping
  it.** The previous entry's verification used a 16-character stand-in blob and
  reported the relay as working. It was working, for payloads nothing like the
  real one. The lesson is specific: a fixture that does not match production
  shape verifies nothing about the rule it is exercising.

---

### 2026-08-02 — WebRTC spike run 2: PASSED across two networks

**Phase:** 1 · **Status:** done — §9 Phase 1 spike item now `[x]`

**Changed:**
- `public/webrtc-spike.html` — call-held duration clock; sample `getStats()`
  before teardown rather than after; stop blanking `remoteTypes` on a degraded
  report; hold the peer connection in a local so Hang up cannot null it mid-flow
- `WELLCARE-BUILD-PLAN.md` — §9 Phase 1 (`[~]` → `[x]`), §12 risk 2 (largely
  retired), §12 risk 7 (new), this entry

**Why:** §12 risk 2 — *does this deployment need TURN?* — has gated the Phase 3
decision since 2026-07-31. It is now answered with measurements rather than
inference.

**Verified — the run, verbatim from both devices:**

Host, Windows 10, Chrome 150, TURN **off**:

```
signalling state:  stable
ICE gathering:     complete
local cand types:  host, srflx
selected pair:     srflx ⇄ srflx (udp)
remote video:      attached
```

Joiner, macOS, Chrome 150, TURN **on**, different network:

```
signalling state:  stable
ICE gathering:     complete
local cand types:  host, srflx
selected pair:     srflx ⇄ srflx (udp)
remote video:      attached
```

Both peers negotiated **`srflx ⇄ srflx` over UDP** — server-reflexive on both
ends, media flowing **directly peer-to-peer with no relay**. Two-way audio and
video rendered on both screens. Blob sizes through the relay: offer 9,800 chars,
answer 8,480 chars, both stored and retrieved intact.

The single most useful detail: **the joiner had a TURN relay configured and ICE
still chose the direct path.** A STUN-only run on both ends would only have
shown that a direct path *was found*; this shows it was found and **preferred
while a relay was available**. That is the strong form of the result.

**What this settles:** virtual consultation is technically feasible in this
environment. Media permission, offer/answer negotiation, cross-network NAT
traversal, cross-OS interop and signalling at real SDP sizes all work. Every
technical unknown §5.2 and §12 risk 1 carried is now retired except durability.

**Blocked / left out:**
- **The call held 17 seconds, then both sides dropped simultaneously**
  (`connected → disconnected → failed`). Feasibility was the question this
  spike existed to answer and it is answered; durability is a *new* question
  it uncovered. Logged as **§12 risk 7**, with a ≥2-minute hold as the bar
  before Phase 3 UI work. Recording this as a pass without that caveat would be
  the exact overstatement §0 forbids — a 17-second call demos as working.
- **One network pair proves one network pair.** The ~10–20% of real connections
  behind symmetric NAT are by definition not the pair tested. coturn stays in
  the deployment budget as insurance; it leaves the critical path.
- **`remote cand types: none` on both sides is a reporting artefact, now
  fixed.** `getStats()` after teardown returns a reduced report, and the old
  code overwrote the captured value with an empty set. The selected pair
  survived only because it had a guard `remoteTypes` lacked. The candidate
  types above come from the selected pair, which is the authoritative field.
- **ICE gathering timed out at 8s on every attempt, now explained and benign.**
  Candidates appear in the log *immediately* (12:36:43) and gathering simply
  never flips to `complete` before the 8s cutoff — Chrome holding the gathering
  pool open, not a stall. Both needed candidate types were present within a
  second, and the partial set connected. No change made.
- **`Cannot read properties of null (reading 'localDescription')`** appeared once
  when Hang up was pressed during the 8s gather. Fixed by holding the connection
  in a local and checking it is still current after the await.
- **§5.2 remains an open scoping decision and this run does not touch it.**
  Virtual consultation is still absent from all five numbered objectives and
  from the Scope. The spike answers *can we build it*, never *should it be in
  the objectives* — that is Group 5's call.

---

### 2026-08-03 — Phase 3: virtual consultation (WebRTC video)

**Phase:** 3 · **Status:** partial — *all code shipped and green; the two-device
call has not been walked yet, so the spike is deliberately still in the repo*

**Changed:**
- `app/Services/ConsultationSessionService.php` (new) + `app/Exceptions/InvalidConsultationTransitionException.php` (new)
- `app/Events/WebRtcSignal.php` (new — first file in `app/Events/`)
- `app/Http/Controllers/ConsultationRoomController.php` (new)
- `app/Http/Controllers/Patient/PatientConsultationController.php` (new)
- `app/Http/Controllers/Doctor/DoctorConsultationController.php` — `patientHistory()` scoped, `saveSession()` delegated to the service, `startVirtual()` + `room()` added
- `routes/channels.php` (new), `bootstrap/app.php` — `channels:` arg
- `config/webrtc.php` (new), `config/reverb.php` + `config/broadcasting.php` (published)
- 3 migrations: virtual columns on `consultation_sessions`, `appointments.consultation_type`, notification-type enum
- `app/Models/{ConsultationSession,Appointment}.php`, `database/factories/{ConsultationSession,Appointment}Factory.php`
- Booking chain: `BookAppointmentRequest`, `AppointmentController::store()`, `BookingService::bookSlot()`, `bookingdata.ts`, `step-appointment.tsx`, `step-review.tsx`, `booking-icons.tsx`, `use-step-validators.ts`
- `resources/js/lib/echo.ts`, `resources/js/hooks/use-web-rtc.ts`, `resources/js/components/consultation-room/`, `pages/doctor/consultations/room/`, `pages/user/consultations/`
- `resources/views/app.blade.php` — CSRF meta tag
- `.env`, `.env.example`, `composer.json` (`dev` → 4 processes), `package.json`
- 4 new test files under `tests/Feature/Consultation/` and `tests/Feature/Booking/`

**Why:** §9 Phase 3, unblocked by the 2026-08-03 hold test. Virtual consultation
is asserted in eleven places in the paper and **Table 3 already claims the video
session passes**, against code that did not exist.

**Verified:**
- `php artisan test --compact` → **367 passed (1396 assertions)**, up from the
  277 baseline. Per-file: `PatientHistoryScopeTest` 9, `BookingConsultationTypeTest`
  19, `ConsultationSessionLifecycleTest` 25, `ConsultationChannelAuthTest` 17,
  `ConsultationRoomAccessTest` 20.
- **Both new tests were proved to fail without their fix**, not just to pass with
  it. Removing the `doctor_id` scope → **2 failed**, including the raw-body
  sentinel check. Removing the `consultation_type` line from
  `AppointmentController::store()` → **1 failed**, which is exactly the silent
  drop that line exists to prevent.
- Migrations: `migrate` → `rollback --step=2` → `migrate`, clean both ways.
  Rollback left `consultation_sessions` on exactly its original three indexes
  and `appointments_active_slot_unique` intact. 100 appointments and 60 sessions
  backfilled to `in_person` by the column defaults; no data migration needed.
- `npx tsc --noEmit` → exit 0. `npm run build` → built. **`npm run build:ssr`
  → built** — run deliberately, since `composer dev` never exercises it and a
  module-level Echo would only surface at deploy.
- `vendor/bin/pint --dirty` → pass. `eslint --fix` on the new frontend → 0
  remaining (15 stylistic auto-fixes; the 5 errors left in that directory are
  pre-existing in files this phase did not touch).
- `php artisan channel:list` → `consultation.{roomId}` registered.
  `php artisan reverb:start` → *"Starting server on 0.0.0.0:8080"*, responds.

**Not in the original checklist, and why:**
- **`ConsultationSessionService`.** The checklist said "extend
  `consultation_sessions`" but `start()` creates no session row and
  `appointment_id` is UNIQUE, so `room_id` had nowhere to be minted. Adding the
  service also closed two live defects nothing covered: `saveSession()` set
  `appointments.status='completed'` from **any** state (a cancelled visit could
  be marked complete), and a later draft save silently un-finalized a signed
  note. Both now have guards and regression tests.
- **`patientHistory()` had no `doctor_id` scope** — any doctor could read any
  patient's last 20 SOAP notes, vitals and prescriptions by supplying an email.
  A security fix, not a Phase 3 feature; shipped first and alone.
- **Symmetric `hello` handshake.** The checklist's "doctor creates the offer"
  has no offer store behind a fire-and-forget broadcast: an offer sent before
  the patient subscribed would vanish and the call would never connect, silently.
- **ICE restart** — added after the 4m 5s drop. See §12 risk 7.
- **CSRF meta tag** in `app.blade.php`. The room signals over `fetch()`, which
  does not read the XSRF cookie the way axios does; without it every signal
  would 419.

**Blocked / left out:**
- **The two-device call has not been walked, so the spike is NOT deleted.**
  §9 Step 9 is explicit that `public/webrtc-spike.html`,
  `app/Http/Controllers/Spike/` and their routes come out only *after* a real
  call succeeds — if the new room misbehaves, the spike is the only known-good
  reference implementation in the repo. Automated tests cover channel
  authorization, the state machine and the booking rule; **Pest cannot drive
  WebRTC**, exactly as §10 says.
- **ICE restart is untested by any automated test** — it is browser behaviour.
  Verify manually by killing wifi for ~5s mid-call and confirming the call
  recovers without a rejoin.
- **`@laravel/echo-react` was installed by `install:broadcasting` and removed
  again.** §11 approved three dependencies (reverb, laravel-echo, pusher-js);
  that was a fourth. Its `useEcho` hook would also own the channel subscription
  separately from the peer-connection teardown, and the StrictMode cleanup this
  hook needs has to be unified in one place. `laravel-echo` and `pusher-js` were
  moved from `devDependencies` to `dependencies` to match repo convention.
- **`SESSION_SECURE_COOKIE` was `true`** — an ngrok leftover. Against
  `http://127.0.0.1:8000` the session cookie is never returned, so
  `/broadcasting/auth` would have 403'd with a message saying nothing about
  cookies. Set to `false` for local; must be `true` again wherever the app is
  actually served over https.
- **`install:broadcasting` timed out** at Laravel's internal 60s process limit
  during its `npm install && npm run build` step, and left a duplicate
  `BROADCAST_CONNECTION` in `.env` (`log` at line 40, `reverb` appended at the
  end). Both cleaned up by hand; the PHP-side scaffolding had already completed.
- **No `RecordsActivity` on `ConsultationSession`, deliberately.**
  `activityLogAttributes()` would name the SOAP columns, copying clinical
  narrative into `activity_log` — a table the admin UI renders in full. That is
  the mistake the Phase 4 concern's docblock warns against.
- **`meeting_link` / `platform` shipped as schema only**, per the plan. Columns
  exist, nothing reads them; they are the documented fallback.
- **§5.2 is untouched by any of this.** Virtual consultation is still in **none
  of the five numbered objectives** and not in the Scope. It needs adding to
  Objective 1 on the document track, or the whole phase earns no marks.

---

### 2026-08-03 — Vite asset preloading disabled outside production

**Phase:** 3 (follow-up) · **Status:** done

**Changed:** `app/Providers/AppServiceProvider.php`

**Why:** Opening the tunnelled app produced
`Uncaught (in promise) Error: Unable to preload CSS for /build/assets/app-DiX9nb9K.css`.

The asset was not missing. Verified directly: the file is on disk (101 KB), the
manifest points at it correctly, there is no stale `public/hot`, and it serves
**HTTP 200 with `text/css`** both locally (3 ms) and through the tunnel — 40
concurrent requests all returned 200.

The cause is contention, not a bad build. `php artisan serve` is the PHP
built-in server and handles **one request at a time**; `PHP_CLI_SERVER_WORKERS`
would raise that but is fork-based and does nothing on Windows. Laravel's
`@vite` emitted a `<link rel="preload">` *and* a `<link rel="stylesheet">` for
the same 101 KB file, so the page requested it **4 times** before it could
paint. Behind a tunnel — mandatory for the consultation room, since
`getUserMedia` needs a secure context — that doubling lands on the
single-threaded server together with the Inertia request, the page chunks and a
WebSocket upgrade. Under that load asset latency measured **0.15 s → ~1 s**, and
Vite's `__vitePreload` helper has no retry: when it gives up it rejects, and a
rejected preload rejects the dynamic page import behind it.

`Vite::usePreloadTagAttributes(false)` when `! app()->isProduction()`. Preload
tags are a production optimisation against a real web server and a liability
against a one-request-at-a-time dev server, so production keeps them.

**Verified:** CSS references per page **4 → 2**; preload tags gone, the blocking
stylesheet and module scripts remain. `php artisan test --compact
--filter="ConsultationRoomAccessTest|PatientPortalAccessTest|DashboardTest"` →
**45 passed (288 assertions)**. `vendor/bin/pint --dirty` → pass.

**Blocked / left out:** whether this fully clears the console error is unconfirmed
— it needs a browser, and the remaining candidates (tunnel cold-start; the
~2 s first-request latency measured on a cold tunnel) are environmental rather
than code. If it recurs, the next step is serving the built assets from
something other than the PHP dev server rather than tuning further.

> **Correction, same day.** The entry above identified contention as the cause
> and disabled the preload *tags*. **The error persisted**, because that is a
> different mechanism from the one at fault.
>
> The network log the user captured showed the stylesheet fetched **twice** —
> once with `sec-fetch-mode: no-cors` (the HTML `<link rel="stylesheet">`) and
> once with `sec-fetch-mode: cors`. The second is Vite's *runtime* helper, which
> dedupes against the document using a literal attribute selector, visible in
> the built bundle:
>
>     if (document.querySelector(`link[href="${h}"][rel="stylesheet"]`)) return;
>
> `h` is the build-time path `/build/assets/app-*.css`. Laravel's `asset()`
> rendered `href="https://<tunnel-host>/build/assets/app-*.css"`. An attribute
> selector compares the literal attribute value, so an absolute href can never
> match a relative `h` — the guard missed on **every** load, and Vite appended a
> second `<link rel="stylesheet" crossOrigin="">` for a stylesheet the page
> already had. That duplicate, requested last behind ~25 other assets on a
> single-threaded server through a tunnel, is what failed and rejected.
>
> Fixed with `Vite::createAssetPathsUsing()` emitting root-relative paths, so
> the dedupe matches and the duplicate is never requested at all. Local only:
> overriding this in production would break a CDN deployment via `ASSET_URL`.
>
> **Verified:** emitted href is now `/build/assets/app-DiX9nb9K.css`, byte-identical
> to the selector's target. Suite subset covering page renders and auth →
> **51 passed (301 assertions)**. Pint pass.
>
> Contention was still real — it is why the duplicate *failed* rather than
> merely being wasteful — so the preload-tag removal is kept. The lesson worth
> recording: an asset error that reproduces on every load is not a load problem,
> and the first fix treated a symptom the evidence had not yet isolated.

---

### 2026-08-03 — Signalling fix: the CSRF token could never be read from the DOM

**Symptom.** First real two-device attempt. Both peers reached the room, both
saw their own camera, neither saw the other — each stuck on "Waiting for the
other person". Console: twelve `POST /consultations/rooms/{id}/signal` →
**419**, and nothing whatsoever in `laravel.log`.

**Cause.** `use-web-rtc.ts` and laravel-echo both read the CSRF token from
`meta[name="csrf-token"]`. `resources/views/app.blade.php` renders that tag once
per **full document load**; Inertia swaps the page component and never
re-renders `<head>`. Logging in regenerates the session token. So from the first
client-side navigation onward the tag holds a token the session rejects.

The room is always reached that way — `router.post(.../start-virtual)` followed
by a redirect — so it was stale on every visit. Both signalling paths failed
together: the HTTP relay dropped the offer and every ICE candidate, and
`/broadcasting/auth` refused the private-channel subscribe. Neither peer ever
received anything, which is exactly the "renders fine, never connects" failure
mode §12 risk 6 warned about, arriving from an unexpected direction.

Every other POST in the app is immune because Inertia posts through axios, which
uses the `XSRF-TOKEN` **cookie** — refreshed by Laravel on every response. The
consultation hook is the only raw `fetch()` in the codebase.

**Reproduced before fixing**, against the running dev server with a real login
session:

```
2. POST /login  -> 200
3. GET /doctor/consultations -> 200
   login regenerated the token? YES
4. POST /signal, exactly as the hook sends it:
   freshly-rendered meta token -> 403  (CSRF passed; mayJoinRoom refusing an ended room)
   deliberately wrong token    -> 419  (CSRF rejected)
```

**Fix.** `csrfToken` is now an Inertia **page prop** on both room pages — props
are re-rendered on every visit, so they cannot go stale. It is threaded into the
relay `fetch` calls and passed to Echo as `options.csrfToken`, which
laravel-echo checks *ahead of* the meta tag. `getEcho()` now requires it rather
than defaulting, so the stale path is not reachable by omission.

**Why no test proves the 419.** Laravel skips `ValidateCsrfToken` entirely when
`runningUnitTests()`, and a 419 is never logged — the defect was invisible to
the suite by construction, which is why 367 green tests sat on top of a
signalling layer that could not authenticate a single message. The regression
guard instead asserts both room pages ship `csrfToken` matching
`session()->token()`; dropping the prop puts the client straight back on the
stale meta tag. **Confirmed to fail** for the right reason by removing the
patient prop (`Property [csrfToken] does not exist`), then restored.

**Verified:** `php artisan test --compact` → **369 passed (1420 assertions)**,
up from 367. `types:check` pass, `npm run build` and `build:ssr` both clean,
Pint pass.

**Blocked / left out:** the two-device call itself is still unrun, so **Step 9
(delete the spike) stays blocked** — the spike remains the only known-good
reference implementation in the repo. The manual ICE-restart check (kill wifi
~5 s mid-call) is also still outstanding; no Pest test can reach it.

**Note on the existing room row.** Appointment #106's session is
`consultation_status: ended` from the failed attempt. That is correct behaviour,
not residue — `openVirtualRoom()` mints a fresh `room_id` for an ended session,
so "Start Video" is the intended recovery. `canStartVideo` is true for
`in_progress`, so the button is present.

---

### 2026-08-03 — Signalling fix 2: the `hello` handshake raced its own subscription

**Symptom.** Second two-device attempt, CSRF fix in place. Signalling now
worked — the doctor's network log shows `hello`, a full 9.8 KB `offer` and ten
trickled ICE candidates all POSTing cleanly, no 419s. The doctor sat on
**"Connecting"** and never advanced; `consultation_sessions.consultation_status`
stayed `waiting`, so `markActive()` never ran and ICE never connected on either
side. The offer left and no answer came back.

**Cause.** `.listen()` only registers a callback — the actual subscribe is an
async `/broadcasting/auth` round trip plus a socket frame. The hook announced
itself with `hello` on the line *after* `.listen()`, i.e. before it had joined
anything. The doctor's own log shows the ordering plainly: the `hello` POST is
issued **before** `/broadcasting/auth`.

On the doctor's side that is survivable — the initiator only needs to *receive* a
hello. The patient runs identical code, so its hello left early too, the doctor
replied with an offer ~100 ms later, and the patient's subscription — an auth
round trip through a single-threaded dev server and a tunnel — had not landed.
The offer was broadcast to a channel with one subscriber and, broadcast being
fire-and-forget, was lost permanently.

This is §9 correction 4 arriving through the back door. The hello handshake was
added precisely to stop an offer being emitted before the patient could hear it;
because the hello itself raced, the mitigation never engaged.

**Fix**, all in `use-web-rtc.ts`:

1. **`hello` now goes out from `.subscribed()`**, so a peer only announces
   itself once it can actually receive the reply. This is the fix.
2. **The non-initiator answers a hello with a hello.** Needed for the mirror
   case — if the *patient* subscribes first their announcing hello is lost, and
   the doctor's hello is then the only evidence anyone is waiting. Cannot
   ping-pong: only the non-initiator replies to a hello, and the initiator
   replies with an offer.
3. **Duplicate-offer guard.** Both peers announce, so the initiator can receive
   two hellos; a second offer would replace the local description while the
   first answer was still in flight. Suppressed unless the connection is
   `stable` or the last offer is older than 3 s — the staleness window is what
   lets a reloading patient still obtain a fresh offer from a doctor stuck in
   `have-local-offer`.
4. **Answers are ignored outside `have-local-offer`**, since (3) makes a
   duplicate answer reachable and `setRemoteDescription` in `stable` throws
   `InvalidStateError` — inside an async handler, where it surfaces nowhere.

**Two silent-failure holes closed at the same time**, both of which cost real
debugging time this session:

- `post()` ignored the HTTP status entirely. That is why twelve consecutive 419s
  produced a UI that said "Connecting" and a `laravel.log` with nothing in it. A
  non-2xx now fails the call loudly with the status code.
- A refused channel subscribe was equally invisible. `.error()` now reports it,
  which is the failure `mayJoinRoom()` produces against a closed room.

**Verified:** `php artisan test --compact` → **369 passed (1420 assertions)**.
`types:check` pass, `npm run build` + `build:ssr` clean, eslint and prettier
clean on the changed files (the repo-wide lint baseline is untouched).

**Blocked / left out:** unchanged — the two-device call has still not completed,
so **Step 9 stays blocked** and the manual ICE-restart check is still outstanding.
No Pest test covers any of this: it is browser and socket timing, reachable only
by two real devices.

**Note on evidence.** Both fixes this session came from the browser's network
log, not the test suite or the server log, and neither defect was observable
from PHP at all. Worth stating in the paper's limitations: the WebRTC layer's
correctness rests on manual two-device verification, and the automated suite
covers its authorization and state machine only.

---

### 2026-08-03 — Signalling fix 3: `TrimStrings` was deleting the SDP's last line

**Symptom.** Third two-device attempt. Doctor "Connecting", patient "Waiting for
the other person". Doctor's network log clean — `hello`, two `offer`s and ten
ICE candidates all 200. Nothing in `laravel.log`.

**How it was found.** Not from the phone. The app already ships browser console
output to the server via Laravel Boost's `/_boost/browser-logs`, so the patient
device's errors were readable server-side the whole time:

```
Unhandled Promise Rejection OperationError
Failed to execute 'setRemoteDescription' on 'RTCPeerConnection':
Failed to parse SessionDescription.
a=ssrc:382895626 msid:4cc0d323-… ccf11fcc-…  Invalid SDP line.
   url: /user/consultations/106
```

The offer *was* arriving. The line named is the **last line of the SDP**.

**Cause.** Laravel's global `TrimStrings` middleware runs `Str::trim()` over
every string in the request, nested array values included. SDP is a
CRLF-delimited format in which every line — including the last — must be
terminated, so trimming deletes the final `\r\n` and the receiving browser
rejects the entire session description over one absent line ending.

Three things made this expensive to find:

1. **The damage is invisible to the side that causes it.** The POST returns 200,
   the event broadcasts, the server logs nothing. Only the *other* device throws.
2. **It is selective in a misleading way.** `hello` carries an empty payload and
   ICE candidate strings have no trailing whitespace, so those relay perfectly.
   Signalling looked half-working, which pointed at the socket rather than at
   the request pipeline.
3. **The rejection was unhandled.** `handleSignal` is invoked from an Echo event
   listener as `void handleSignal(...)`, so the rejection had no caller to land
   in and never reached the UI.

**Fix.** `TrimStrings::skipWhen()` and `ConvertEmptyStringsToNull::skipWhen()`
scoped to `consultations/rooms/*/signal` in `AppServiceProvider`. Scoped to the
one route deliberately: that endpoint alone is a pass-through for opaque peer
data — the controller docblock already promises it "forwards an opaque payload"
— and trimming is exactly the inspection it promises not to do. Every other
route still wants trimming.

**This one is properly testable**, unlike the previous two: `TrimStrings` runs in
feature tests. `it('relays an SDP without altering a single byte')` posts an SDP
with a trailing CRLF and asserts the broadcast payload is byte-identical.
**Confirmed to fail for the right reason** by disabling the skip
(`The expected [App\Events\WebRtcSignal] event was not dispatched` — the trimmed
SDP no longer matched), then restored.

#### Two further defects fixed in the same pass

**Reverb's payload cap — a real latent fault, not the cause of this run.**
`REVERB_MAX_REQUEST_SIZE` defaults to 10,000 bytes and covers the whole publish
request; Pusher re-escapes the SDP into a JSON string on the way in, so every
`\r\n` costs four bytes. Measured against this server through the real endpoint:

```
sdp 7500  -> 200
sdp 8000  -> 500   Pusher error: Payload too large.
```

Chrome 150 offers sit on that boundary and grow with every extra codec, ICE
candidate or track, so the default makes video consultation fail intermittently
and for no visible reason. Raised to 131,072 in `.env` and `.env.example`;
re-probed after restart, 61,740 bytes now relays where 9,240 previously failed.
**Stated plainly: this was not what broke the 11:0x run** — no
`Payload too large` was logged at that time, so those offers published fine. It
is fixed because it is real, not because it was today's cause.

**A silent-failure bug in the previous fix.** `send('offer')` set
`phase = 'failed'` on a non-2xx, and the very next line set
`phase = 'connecting'`, overwriting it. A rejected offer therefore still rendered
as a call that was still trying — the exact silence the previous entry claimed to
have closed. `post()` now returns whether the message landed, and both the offer
and answer paths bail instead of reporting progress they did not make. The Echo
listener also catches rejections from `handleSignal` and surfaces them, which is
what would have put the `setRemoteDescription` error on screen immediately.

**Verified:** `php artisan test --compact` → **370 passed (1422 assertions)**.
`types:check` pass, `npm run build` + `build:ssr` clean, Pint and Prettier clean.

**Blocked / left out:** Step 9 stays blocked — the two-device call has still not
completed end to end, and the ICE-restart check remains unrun.

**Method note worth carrying into the paper.** Three consecutive defects here
were invisible to a 370-test suite, and each was found from a different source:
the browser network log (CSRF), request ordering in that log (the subscribe
race), and server-side browser-log capture (the SDP trim). The common property
is that all three produced a **200 with no server-side trace**. The lesson for
§12 is that a signalling path needs its failures made loud by construction,
because the default behaviour of every layer involved is to succeed quietly.

---

### 2026-08-03 — Phase 3.1: consultation room hardening (stages 1–5, 10–11)

**The two-device call works.** Doctor and patient, separate networks, two-way
audio and video. That was the gate the whole phase hung on and it is passed.
What follows is the difference between a call that *connects* and a call you
would put in front of a patient — four defects reported from live use, plus ~22
found by auditing the hook, the server lifecycle and the room UI.

#### The four reported problems, and what they actually were

**1. "A ringing sound like a siren."** Not a code defect. The local `<video>`
carries `muted` correctly (checked, including whether SSR was dropping the
attribute — React 19 emits it). It is cross-device acoustic feedback: device A's
speaker into device B's microphone, back to A, round again until it howls. Echo
cancellation is structurally unable to fix this — AEC cancels a device's *own*
output from its *own* microphone and cannot touch a second device in the room.

Mitigated as far as code can: `echoCancellation` / `noiseSuppression` /
`autoGainControl` are now requested explicitly rather than left to the platform
(Safari, iOS and several Windows drivers do not enable them reliably, and a
driver-controlled AGC is the amplifier in the loop — it hears the howl and turns
the gain *up*). Added a mute-speaker control, which stops it instantly, and a
headphone advisory in the room copy. **Stated plainly: headphones or physical
separation are the fix. Nothing in the code can cancel sound travelling through
the air between two devices.**

**2. "End call doesn't end or exit."** Far worse than it looked. `hangUp()` fired
a POST and set a label. It never stopped the local tracks, never closed the peer
connection, never cleared the video elements. **Both parties went on streaming
audio and video to each other underneath a "Call ended" overlay**, camera light
still on — and the button then disabled itself, so there was no second attempt.
In a consultation that is a privacy failure, not a cosmetic one.

The real teardown existed only in the effect cleanup, which needs an unmount that
never came. It is now a `teardown()` published on the ref bag and shared by
`hangUp`, the `bye` handler and the cleanup, so the three cannot drift.

**3. "It still says connecting after the video appears."** A lost race, not a
stuck state. `setPhase('connecting')` ran *after* `await send(...)`, while
`oniceconnectionstatechange` set `connected` during that await. On a reconnect
ICE completes in milliseconds and the POST does not, so `connecting` landed last
— and the answering peer is the ICE-controlled agent, which never transitions
again, so nothing ever corrected it. A redundant duplicate `hello` could knock a
live call back the same way.

Fixed at the root with a monotonic `advancePhase()` that refuses to regress,
`connecting` moved before the round trip, `onconnectionstatechange` added as the
primary signal, and `ontrack` now advancing the phase — remote media arriving is
the most trustworthy evidence a call is up. The overlay is also gated on actual
video frames rather than on negotiation state, and no longer swallows clicks.

**4. "Vitals is hidden at the bottom."** The grid had no height bound and
`alignItems: 'start'`; the right rail ran SOAP (~550px) → Vitals → buttons, so
Vitals sat ~750px down — below the fold on any 768px screen — while the video
column ended at ~440px and sat on 400px of dead space. The console now fills the
viewport, **only SOAP scrolls**, and Vitals plus Save/Finalize are pinned strips
that cannot leave the screen. The two-column grid became `auto-fit`, so it also
collapses to one column without a media query.

#### Also fixed in the same pass

- **Role-aware leave.** Only the doctor's End Call or Finalize closes a
  consultation now. A patient hanging up or dropping returns the room to
  `waiting` with the same `room_id`, the doctor is told "patient left", and the
  patient rejoins from their list. A patient on a phone drops constantly; that
  was never a decision to end a medical consultation.
- **`bye` moved from the controller into `endCall()`.** `finalize()` ends the
  call through a different door and previously announced nothing — the doctor
  signed off and the patient sat watching a frozen frame with a running clock.
  Every close path now notifies by construction.
- **`complete()` closes a live room**, instead of leaving one that renders and
  offers a Join Call button but can never connect.
- **Row locking.** `openVirtualRoom()` now re-reads under `lockForUpdate()` — a
  double-click minted two `room_id`s, the exact failure its own docblock says
  idempotency prevents. `markActive()` became a conditional update so a late
  `/join` cannot resurrect an ended call.
- **Signalling resilience.** Only `hello`/`offer`/`answer` are fatal — one failed
  ICE-candidate POST used to kill a healthy call. `fetch` is wrapped, candidates
  drain individually (stale ones from a peer's pre-refresh session are
  *guaranteed*, not exceptional), incoming offers roll back on glare, and `/join`
  fires once rather than on every ICE settle.
- **The non-initiator can recover.** Previously only the doctor restarted ICE and
  the patient's side did nothing at all — frozen frame, green dot, ticking clock,
  indefinitely. It now reports `reconnecting`, asks the initiator to re-offer
  (with `iceRestart` when the connection is unhealthy), and fails with a real
  message after a ceiling.
- **Audio-only fallback.** A camera held by Zoom or Teams used to fail the whole
  consultation while the microphone was available the entire time.
- **Media errors say what to do.** Raw `NotAllowedError: Permission denied` over
  body copy advising you to check your internet connection — wrong for every
  media failure there is.
- **Autoplay recovery.** The remote element is unmuted, and unmuted autoplay
  needs a gesture; after a refresh there is none, so it never started — silently.
- **Autosave.** SOAP and vitals were held in React state and written only on a
  button press. A crash or a stray navigation lost the whole clinical note.
- **The patient room works on a phone.** The sidebar was `width: 260,
  flexShrink: 0` with no media query anywhere, leaving ~66px of content on a
  390px handset — for the party who is always on a phone.

**Verified:** `php artisan test --compact` → **381 passed (1442 assertions)**, up
from 370. `types:check`, `npm run build`, `build:ssr`, Pint, Prettier and ESLint
all clean. Every new server-side test was confirmed to fail for the right reason
before being accepted — removing the `bye` broadcast reds all three close paths,
including `finalize`.

**Blocked / left out:** the remaining stages are deliberately not in this entry —
peer mute/camera state and the `pagehide` beacon, ended rooms no longer 404ing,
the stale-session sweep, and the presence channel. **Presence is last on
purpose:** `routes/channels.php`, `WebRtcSignal::broadcastOn()` and the hook's
`echo.private()` must change together, Laravel resolves both `private-` and
`presence-` prefixes to the same registered callback so the channel-auth test
passes either way, and a half-conversion delivers nothing and logs nothing —
symptomatically identical to the CSRF failure this feature already spent a cycle
on. It gets its own two-device verification.

Nothing in stages 1, 2, 4, 5 or 11 is reachable by Pest — it is browser and
WebRTC behaviour. The two-device script in the plan file is the verification.

---

### 2026-08-03 — A dead Reverb looked exactly like "nobody has joined yet"

**Symptom.** Both peers stuck on "Waiting for the other person" with working
local video, no console errors, nothing in `laravel.log`.

**Cause.** Reverb was not running — nothing listening on 8080. With no WebSocket
server the private channel never subscribes, so `.subscribed()` never fires, so
the announcing `hello` is never sent, so neither peer ever learns the other is
there. Every layer reports success and the UI truthfully says it is waiting.

Not a code defect, but it exposed one: **the failure was unreportable.** The
channel's `.error()` handler only receives `pusher:subscription_error`, which
requires a live connection to be delivered over — a server that is simply absent
produces no channel error at all. Now bound to the connection's `state_change`,
so `unavailable`/`failed` says the server is unreachable and names `composer dev`
as the thing to start. `composer dev` already runs `reverb:start` as its fourth
process; `php artisan serve` on its own does not, and that gap is easy to hit.

**Audio diagnostics, from the same run.** The new `consultation audio` log line
settles what was previously guesswork about the screech:

```
doctor (Windows PC): device "Microphone (High Definition Audio Device)"
                     echoCancellation true · noiseSuppression true
                     autoGainControl  false · 48000Hz
patient (Android):   device "Default"  — same processing flags
```

So echo cancellation **is** applied on the PC, and the AGC reversal took effect.
The remaining variable is the render side: capture is on the analogue jack, and
AEC subtracts what it believes is being played — if Windows is rendering to a
different device (this machine also exposes `N200HDV8` monitor audio over HDMI
and a separate USB Audio device) that belief is wrong and the earcup-to-boom-mic
leak survives untouched. Hence the in-call Speaker picker.

**Correction worth recording:** the previous entry attributed the screech to two
devices sharing a room. The user disproved that — they were in different
locations, and the fault followed the PC rather than the role. The same-room
mechanism is real but was not this. Diagnosing hardware from a description was
the mistake; the fix was to make the client report what it actually negotiated.

**Verified:** Reverb listening on 8080 again; `php artisan test --compact` →
**381 passed (1442 assertions)**; build, types, Pint, Prettier, ESLint clean.

---

### 2026-08-04 — The screech, settled; and Phase 3.1 stages 7–9

**The screech is a two-device acoustic loop, and the user found it.** Their
description is exact: the phone sits within earshot of the PC's microphone, the
PC's speaker plays the phone's audio, the phone's microphone picks that up, sends
it back, and each lap adds a little gain until it howls.

This closes a diagnosis that took three wrong turns, and the wrong turns are
worth recording because each was a plausible theory that the evidence killed:

| Theory | Killed by |
|---|---|
| Local `<video>` feeding back into its own mic | `muted` was already set — the code was correct |
| Constraints being ignored by the driver | `getSettings()` proved AEC on, AGC off, and the loop persisted |
| Capture and render on different Windows devices | Fault reproduced with the phone next to the PC regardless of which output was selected |

The mechanism is physics, not software: acoustic echo cancellation subtracts a
device's **own** output from its **own** microphone. The offending sound here
arrives through the air from a *second* device it has no reference signal for.
No constraint, no library, and no amount of DSP can cancel it. Distance,
headphones, or Mute speaker break the loop; nothing in the code can.

**Consequence — the device pickers are gone.** They were added on the
now-disproved theory and were never in this phase's locked scope. They also read
as clutter under the call controls, which is what the user said. The `getSettings()`
diagnostic logging stays: it is what ruled the browser out, and it costs one
console line. The advisory copy now describes the loop and offers the three
things that actually stop it.

**Stage 7 — the other side stops being a guess.**
- `state` messages carry mic/camera on-off, so a muted peer shows a badge rather
  than being mistaken for a broken call. Published on every connect *and*
  reconnect, because signalling is fire-and-forget with no store: a toggle
  broadcast before the other peer subscribed is simply gone.
- `pagehide` + `navigator.sendBeacon`. React does not run effect cleanups on
  unload, so a refresh or a closed tab left the other party watching a frozen
  frame for the ~30s it takes ICE consent to expire — long enough that they
  refresh too, and then neither is where the other expects. The beacon carries
  `_token` in a JSON body because a beacon cannot set headers, and Laravel's CSRF
  middleware reads `$request->input('_token')`, which for a JSON content type
  reads the decoded body.
- Guarded on `event.persisted`. A bfcache restore brings the page back *with its
  peer connection intact*; announcing a departure we then undo would leave the
  other side having rebuilt while this one kept the old — a deadlock in which
  each waits for a handshake the other already had.

**Stage 8 — closed rooms stop being a trap.**
- Both room pages stop 404ing. The 404 was reached by the most ordinary sequence
  there is: the call ends, the patient presses back, and the visit has
  simultaneously vanished from a list that only shows live rooms. A patient whose
  connection dropped mid-consultation had no route back in and nothing on screen
  to separate "the visit is over" from "my phone is broken". They now get a named
  reason — `not_open` / `ended` / `finalized` — and a way onward. A separate page
  component, not a branch inside `room.tsx`: that file calls `useWebRtc` at the
  top of its body and hooks cannot be skipped, so a branch would still turn the
  camera on in order to say the call was over.
- The doctor is redirected to their consultations list with a reason instead,
  since reopening the room is one click from there.
- `consultation_started` had **no case** in `urlForNotification()` and fell
  through to `/user/dashboard`, which has no join button. The single most
  time-critical notification in the app pointed at the wrong page while a doctor
  sat waiting. Now `/user/consultations`.
- That list polls every 15s (`usePoll`, `only: ['consultations']`). Nothing
  pushed room-open to an idle page: the notification lands in the database but
  the bell is shared on the *next* Inertia request, so the page stayed empty
  while the doctor waited on the other side of it.

**Stage 9 — `consultations:close-stale`, hourly.** A privacy sweep, not
housekeeping. Nothing in the app ends an abandoned call: every close path is a
deliberate human act — End Call, Finalize, Complete — and none of them runs when
the laptop shuts or the browser crashes. The row stayed `waiting`/`active` with
`ended_at` NULL forever, and gate 2 of `mayJoinRoom()` kept returning **true**,
so the room remained a live, subscribable, private A/V channel. A months-old
consultation should not be one bookmark away. Ends through `endCall()` rather
than a bulk UPDATE so the `bye` broadcast fires here as it does everywhere else,
and filters on `started_at` rather than `updated_at` — the latter moves on every
SOAP draft save, which would keep resetting the clock on exactly the rooms most
likely to be abandoned mid-visit.

**Verified:** `php artisan test --compact` → **395 passed (1519 assertions)**,
up from 381. The notification-routing test was proven red by deleting its one
line; the closed-room test failed on a missing Vite entry before the page
existed. `npm run types:check` clean, Pint clean, no new ESLint findings.

**Still open:** Stage 6 (presence channel) is deliberately last — it is the one
change that can take the feature down silently, and it needs its own two-device
run. The spike (`Spike/WebRtcSignalController`, `public/webrtc-spike.html`) stays
until this pass is verified on hardware; it remains the only known-good reference
implementation in the repo.

---

### 2026-08-04 (second entry) — What two-device verification found, and §5.2 resolved

Four reports came back from the hardware round. **Three were real defects and
two of those were mine, introduced by the previous entry's own fixes.** Recording
them in full, because the pattern is more useful than the individual bugs: every
one was a case of a change being correct in isolation and wrong in combination
with something else on the page.

**1. The departure beacon covered the rare exit and missed the common one.**
`pagehide` fires on a refresh or a closed tab. It does *not* fire on an Inertia
client-side navigation — the document is never unloaded — so tapping a link in
the sidebar tore the page down and told the other peer nothing at all. That is
the ordinary way a person wanders out of a call, and it left the other party on
a frozen frame for the ~30s ICE consent takes to expire. Departure is now
announced from the effect cleanup as well, guarded by a `departureAnnounced`
flag so the three exit paths (End Call → `/leave`, `pagehide` → beacon, unmount
→ keepalive fetch) cannot double-announce and make the peer rebuild twice.

**2. Adding polling broke the notification bell.** The bell carried
`useEffect(() => setOpen(false), [props])` — and `usePage()` returns a fresh
`props` identity on *every* render, so the dropdown closed on any prop change
whatsoever. Harmless for as long as those pages were static. The previous entry
added a 15-second poll to the consultations list; from then on the panel closed
itself between `mousedown` and `click`, the notification vanished from under the
user's finger, and it read as a dead link. Now bound to
`router.on('navigate')`, which also clears a pre-existing ESLint error on that
file.

A second, independent bug in the same handler: `markRead` was fired *before*
`router.visit`, and mark-read answers `back()` — a redirect to the page you are
already on. Two Inertia visits raced and the cheap one routinely landed last,
cancelling the navigation. Invisible while every notification pointed at the
page its reader was already likely to be on; `consultation_started` was the
first with a genuinely different destination.

**3. The closed-room page was a dead end.** The list polls; the page a dropped
patient actually lands on did not. So they sat on "This call has ended" while
the doctor reopened the room, and only a manual refresh revealed it. It polls
every 8s now, and since the controller renders either component for the same
URL, a reopened room turns that page back into the live room by itself.

**4. `consultations:close-stale` was correct and looked broken.** It reported
`Closed 0` across a dozen invocations. Cause: the rooms were `ended` at the
time, so the backdating step matched zero rows and there was nothing to sweep.
The command was right; its output could not distinguish "nothing matched the
cutoff" from "nothing was open at all", so the operator had no way to tell a
working run from a broken one. Now reports `Closed N of M open virtual room(s)`
and says so explicitly when M is zero. Two tests pin the wording — output that
a human relies on to make a judgement is behaviour, not decoration.

**Also added, at the user's request:** a confirmation before either side ends a
call, with the doctor's offering **Finalize & end visit** as the primary action
alongside "End call, keep draft". Ending with unsaved notes flushes them first —
autosave runs on a 4s idle timer and the room closes immediately after, which
would make that loss permanent. Navigating away mid-call now prompts too, with
non-GET visits exempted so autosave does not interrogate the doctor every four
seconds while they type.

**`TWO-DEVICE-TESTING.md`** (repo root) documents the whole local setup:
startup order, the `public/hot` trap that makes Vite unusable through a tunnel,
two curl commands that catch most misconfigurations before a device is touched,
and failure symptoms indexed by what is actually on screen.

**§12 risk 7 — RESOLVED.** 17s (2026-08-02, asymmetric TURN) → 4m 05s
(2026-08-03, `srflx ⇄ srflx`) → no drop observed (2026-08-04). The ≥2-minute bar
is met, so TURN stays insurance. Stated rather than glossed: the 2026-08-04 runs
were `host ⇄ host` on one network, and no run on the current build has been held
for a full consultation's length. That cross-network long-hold number is the
remaining evidence Table 3 would need.

**§5.2 — RESOLVED as far as code can resolve it, which is not at all.** Virtual
consultation is now ~90% built and still appears in **no graded objective**. The
"or cut it" option has expired — cutting would mean deleting working software
*and* rewriting five figures and four tables. Draft wording for a sub-objective
1.7 is in **§5.2a**, written to describe only what exists: in-system video (not
an external meeting link), authorized to two named accounts (not a role), against
the same patient record as in-person visits. **It needs Group 5's acceptance and
no engineering whatsoever, and until it exists the most expensive component of
this build is graded against nothing.**

**Verified:** `php artisan test --compact` → **397 passed (1523 assertions)**.
Types, Pint and the touched files' ESLint clean.

---

### 2026-08-04 (third entry) — Stage 6: presence, and the last silent failure

**The report that forced this.** The patient force-quit their phone browser. The
doctor's screen showed *"Reconnecting — the connection dropped and is being
restored. Please stay on this page."* over a frozen frame, for a person who was
never coming back. Both halves of that were wrong, and neither could be fixed
where the previous stages were working.

**Why no client-side fix could reach it.** A force-quit browser runs no
JavaScript. The `pagehide` beacon added in Stage 7 is genuinely correct — its
body shape was verified against the live CSRF middleware, `_token` in a JSON
body, HTTP 200 — but there is no execution context left in which to fire it. Any
approach that depends on the departing client cooperating has this hole by
construction. The remaining peer was left to time out ICE consent, ~30 seconds,
and was told a reassuring lie throughout.

**Presence is the only mechanism that does not need that cooperation.** Reverb
sees the socket close and fires `leaving` in well under a second.
`consultation.{roomId}` is now a presence channel:

- `routes/channels.php` returns `['id', 'name']` for an authorized member and
  `false` otherwise. **The array is the authorization** — returning `true` is the
  subtle wrong answer, because Laravel accepts any truthy value and the
  subscribe then succeeds with an empty member payload, leaving
  `here`/`joining`/`leaving` carrying nothing the client can identify a peer by.
- `WebRtcSignal::broadcastOn()` returns a `PresenceChannel`.
- `useWebRtc` subscribes with `echo.join()`, and `.here()` replaces
  `.subscribed()` — it fires at the same moment *and* carries the roster, so
  "waiting for the other person" became a fact instead of an assumption.

The authorization rule itself is untouched: still `mayJoinRoom()`, still exactly
one implementation, still identity-based rather than role-based.

**The hazard this file warned about, and how it is now caught.** Laravel
registers `consultation.{roomId}` once and resolves both
`private-consultation.X` and `presence-consultation.X` to the same callback, so
the existing registry assertion passes either way and a half-converted state
authorizes correctly and then **delivers nothing, logging nothing**. Three new
tests close it, and each was proven to fail against its specific half-conversion:
reverting only the event to `PrivateChannel` fails the channel-name assertion;
returning `true` instead of the member array fails both roster assertions.

**Two further fixes from the same screenshot.**

- **`peerPresent` short-circuits recovery.** Presence is authoritative about
  whether there is anyone to reconnect *to*, so a departed peer now goes straight
  to `waiting` instead of burning three ICE restarts against nobody.
  `handlePeerGone()` is shared by the `peer-left` relay and presence `leaving`,
  and it advances to `waiting` — never `reconnecting`. Telling a doctor a
  connection is "being restored" about a patient who closed their browser is
  worse than silence: it invites them to sit and wait.
- **The status overlay got a scrim.** Gating it on stalled state (previous entry)
  made it appear over a held video frame for the first time, and white text on a
  brightly-lit face was close to unreadable — at exactly the moment the message
  matters most.

**Verified:** `php artisan test --compact` → **409 passed (1564 assertions)**.
Types, Pint, ESLint clean on touched files. Reverb WebSocket handshake confirmed
end-to-end through the tunnel (`101 Switching Protocols`).

**Not yet verified, and it is the point of the stage:** presence has had no
two-device run. It is the one change in this phase that can break the call
silently, which is why it was sequenced last and shipped alone.

---

### 2026-08-04 (fourth entry) — Presence verified; the spike is gone; Phase 3.1 closed

**Verified on two devices.** Exiting the browser, closing the tab and navigating
to another page all now release the other peer immediately, in both directions,
and either party can rejoin — including by simply reopening the page, without
going back through the list. That was the last unverified behaviour in this
phase and the one the presence conversion existed for.

**Step 9 discharged — the spike is deleted.** `app/Http/Controllers/Spike/`,
`public/webrtc-spike.html`, and the `local`-only route block plus its two
imports. It was three **unauthenticated** routes backing a static page —
deliberately outside `auth`, because the page carried no session and could not
present a CSRF token — and that is not a shape to leave in a repository one day
longer than it earns. Its gate ("only once a real two-device call succeeds, and
only once the hardening pass is verified") is now met on both counts, and
everything it proved lives in `ConsultationRoomController` under test.

Deleting it exposed two stale artefacts worth noting, because both were silent:
Wayfinder's generated barrel still imported `./Spike` (a `tsc` error, since these
files are generated and gitignored, and regenerate on any Vite run), and
`php artisan wayfinder:generate` regenerates **without** the `formVariants: true`
that `vite.config.ts` passes — so running it by hand silently drops every
`.form` helper and breaks five unrelated pages. `npm run build` is the correct
regeneration path; the artisan command is not a substitute.

**Gate results.**

| Gate | Result |
|---|---|
| `php artisan test` | **409 passed (1564 assertions)** |
| `npm run types:check` | clean |
| `npm run format:check` | clean |
| `vendor/bin/pint --dirty --test` | clean |
| `composer ci:check` | **fails** — see below |

`ci:check` fails at `lint:check`, and honesty matters more than a green tick
here: it fails on **202 pre-existing ESLint errors across the repository**
(unused imports, unnecessary escapes, `setState` in effects), none of them in any
file this phase touched. The count went *down* by one — the notification bell's
`setState`-in-an-effect was fixed as part of the dropdown repair. This is
long-standing lint debt in the booking wizard, the patient dashboard and the
sidebar, and clearing it is its own task with its own regression risk; it should
not be smuggled into a consultation phase.

**Phase 3.1 is closed.** What remains for virtual consultation is not code:

1. **§5.2a — accept sub-objective 1.7.** Draft wording is ready. Until it exists
   the most expensive component of this build is graded against nothing.
2. **§12 risk 7 — one cross-network long-hold run.** Every measurement so far is
   either same-network (`host ⇄ host`) or shorter than a real consultation.
3. **§6 — record that `meeting_link` and `platform` are unused columns.** The
   ERD and Fig. 8 describe generating links to an external provider; what was
   built is native in-app WebRTC with no third party.

---

### 2026-08-04 (fifth entry) — Risk 7 closed on measurement; paper items handed off

**`24m 12s`, pair `srflx ⇄ srflx (udp)`, two separate WiFi networks.** This is
the number §12 risk 7 has been waiting for since 2026-08-02, and it settles the
last engineering question in the phase:

| | |
|---|---|
| **Duration** | 24m 12s — the length of a real consultation, against an original failure at 17s |
| **Pair** | `srflx ⇄ srflx` — both peers behind NAT, connected **directly** |
| **Relay** | none — TURN was never used |

The pair type is the part that matters and is easy to misread. `host ⇄ host`
means the two devices were on the same LAN and no NAT was traversed at all, so a
hold test on it proves nothing; every 2026-08-04 run before this one was
`host ⇄ host`. `srflx` on both sides means the STUN hole punch succeeded through
two separate NATs *and* stayed alive for 24 minutes, which is precisely the
consent-freshness mechanism that failed in the 17-second run. Recorded in
`TWO-DEVICE-TESTING.md` §5.5a so the next person reads the pill rather than
trusting which network they think they are on.

TURN therefore stays insurance. The one case still unmeasured is mobile data —
carrier-grade NAT is where STUN most often fails — but that is a deployment
question about a harder network, not a doubt about the build.

**The two remaining items are paper items and have been handed to the client.**
Neither requires a line of code, and both are now out of this file's hands:

1. **§5.2a — sub-objective 1.7.** Drafted here; accepting or rewording it is
   Group 5's call.
2. **§6 — `meeting_link` and `platform` are unused columns.** The ERD (Fig. 7)
   and Fig. 8 describe generating links to an external provider; what was built
   is native in-app WebRTC with no third party. Better for privacy — no patient
   audio or video crosses a vendor — but the document implies an integration
   that does not exist.

**Phase 3 and 3.1 are complete.** Nothing in the virtual-consultation feature is
now blocked on engineering.

---

### 2026-08-04 (sixth entry) — Phase 3 closed and committed

**Committed** to `feat/patient-portal-records`:

| Commit | Contents |
|---|---|
| `style: format resources/ with prettier` | 84 files, mechanical only |
| `feat(consultation): in-app WebRTC video consultation` | 62 files — the feature, its tests, and the spike removal |
| `docs: …` | this file, `TWO-DEVICE-TESTING.md`, `PHASE-3-PLAN.md` |

The formatting split was verified rather than assumed: each file's HEAD version
was extracted, run through prettier, and compared byte-for-byte against the
working tree. 84 matched — pure churn from `npm run format`, which rewrites files
that predate the script. The 12 that did not match carry real changes and went in
the feature commit. Without that split the feature diff would have been 10,000
lines of which two thirds were whitespace.

---

## What this phase actually taught — seven silent defects

Worth its own section because it is the transferable part, and because it is the
strongest evidence in this repository for a specific claim: **for this feature,
a green test suite meant almost nothing.** 370 tests passed throughout the period
in which every one of these was live.

| # | Symptom on screen | Actual cause | How it was found |
|---|---|---|---|
| 1 | "Waiting for the other person", both sides | Stale CSRF token — Inertia never re-renders `<head>`, so `meta[name=csrf-token]` goes stale on the first client-side navigation. Every signal POST 419'd | Browser network log |
| 2 | Same | `hello` sent before the channel subscription completed; the offer was broadcast to a channel with one subscriber and lost | Request *ordering* in that same log |
| 3 | Patient stuck, doctor "Connecting" | `TrimStrings` stripped the SDP's trailing CRLF → `setRemoteDescription` failed with "Invalid SDP line" on the far peer only | Boost `browser-logs` — the phone's console, read server-side |
| 4 | Same | Reverb was not running. Nothing listens, nothing subscribes, nothing errors | `netstat` |
| 5 | Video visible, overlay still says "Connecting" | Phase written by two sources; the signalling path wrote *after* an awaited round trip and overwrote the ICE handler's `connected` | Reading the two writers |
| 6 | Notification click does nothing | `PatientDashboardController` builds its own notifications payload, overriding the shared prop, with `action_url` hardcoded `null` | Logging in over HTTP and reading the actual props |
| 7 | Peer frozen after a browser is force-quit | No JavaScript runs on force-quit, so no goodbye is possible; and the status overlay was suppressed because the dead peer's `<video>` never fires `emptied` | A user screenshot |

**The common shape.** WebRTC signalling, Laravel broadcasting and Inertia are all
fire-and-forget. A dropped message does not raise — it produces *waiting*. Every
layer reports success, every log is empty, and the UI truthfully describes a
state that is wrong. Four of the seven were found by reading a log rather than by
reasoning, and two of them (1 and 3) had already survived a correct-looking fix
aimed at the wrong cause.

**What was changed as a result**, so the next failure is not silent:
- The client reports a dead realtime server explicitly instead of waiting
  forever (`SIGNALLING_UNREACHABLE`).
- Signalling failures are scoped: losing an ICE candidate is survivable, losing
  an offer is not, and the fatal ones say so on screen.
- `consultation audio` logs what the browser *actually applied*, which is what
  ruled the browser out as the source of the reported screech.
- `consultations:close-stale` reports `Closed N of M open rooms` — the earlier
  bare `Closed 0` could not distinguish "nothing matched" from "nothing was
  open", and cost a full round of testing on a command that was working.
- `TWO-DEVICE-TESTING.md` indexes failures by *what you see*, not by cause.

**Two corrections recorded against my own earlier claims**, because both were
stated confidently and were wrong:
1. The screech was attributed to a device/render mismatch and to same-room
   acoustics before the user's own evidence settled it as a two-device loop.
   Diagnosing hardware from a description was the error; making the client
   report its negotiated settings was the fix.
2. A test asserting the notification URL passed while the bug was live, because
   it exercised the page I had just fixed rather than the page the user was on.
   The replacement asserts every page that ships notifications, and was proven
   red first.

---

### 2026-08-04 (seventh entry) — `composer ci:check` passes for the first time

Pushed to `origin/feat/patient-portal-records`.

**The 202 ESLint errors were 48.** `lint:check` runs `eslint .`, and
`.claude/worktrees/` holds three full duplicate checkouts of this repository.
They are gitignored, but ESLint's flat config does not read `.gitignore`, so
every finding in real source was counted once per worktree plus once for the
original. Adding `.claude/**` to the ignore list removed three quarters of the
number without touching a line of source — worth recording, because the inflated
count is exactly what made this backlog look too big to approach.

**Three of the remaining 48 were real defects, each masked by the noise:**

| File | Defect |
|---|---|
| `pages/doctor/components/stat-cards.tsx` | A hook called inside `.map()`. Survives only because the list is a fixed-length constant; hook order breaks the moment it is filtered or fetched |
| `session-editor/session-editor.tsx` | The prepopulate effect depended on `[consultation]` — a fresh object every parent render — so an unrelated re-render of the list **overwrote clinical notes the doctor was typing** with the last saved values |
| `consultations/components/consultation-detail-modal.tsx` | Patient-history fetch had no cancellation, so switching patients quickly could land the first response after the second and show **one patient's history under another's name** |

The second and third are the kind this project cannot afford: silent, plausible,
and about clinical data. Neither had a test, and neither would have been found by
reading the feature — they were found by taking a lint rule seriously instead of
suppressing it.

The rest were the same shape as each other: state mirroring props is now derived,
and state that must be *adjusted* when props change uses a comparison during
render (React's documented pattern) rather than an effect that renders once with
stale values and again with correct ones.

**Formatting was committed separately from behaviour, both times.** Prettier (84
files) and Pint (40 files) each got their own commit, verified mechanical rather
than assumed — for Prettier by reconstructing each file from HEAD and comparing
byte-for-byte. Neither had ever been run over these files, which is why
`ci:check` failed regardless of what a given change touched.

**Six `exhaustive-deps` warnings remain, deliberately.** They are warnings, and
each needs a judgement about whether adding the dependency changes behaviour.
Bulk-applying them is how a lint pass turns into a regression.

**Gate results — all green:**

| Gate | Result |
|---|---|
| `npm run lint:check` | 0 errors, 6 warnings |
| `npm run format:check` | clean |
| `npm run types:check` | clean |
| `vendor/bin/pint --test` | pass |
| `php artisan test` | **409 passed (1564 assertions)** |
| **`composer ci:check`** | **passes end to end — first time** |
