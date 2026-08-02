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
| Virtual consultation | ⚠️ *(11 places, none of them an objective — §5.2)* | ❌ | 0% |
| **ISO 25010 evaluation (Obj. 4)** | ✅ | ❌ | 0% — *added 2026-07-31* |
| **Implementation & training plan (Obj. 5)** | ✅ | ❌ | 0% — *added 2026-07-31* |

**Updated 2026-08-01 (Phase 5).** Four of the concentrated gaps are now closed:
the patient read-side portal (Phase 1), the LOA/HMO domain (Phase 2), the admin
module (Phase 4) and the nurse module (Phase 5). **The largest remaining
software gap is analytics (Obj. 1.5, still 0%)** — every other module is at 75%
or above. After that the remaining work is Phase 3 (a scoping decision, §5.2)
and Phase 7 (Objectives 4 and 5, neither of which is code).

Virtual consultation stays at 0% and remains **a scoping question, not a build
one** (§5.2). The spike has now been run and passed on a single machine, so
feasibility is no longer the open item — Group 5's decision is. NAT traversal
and therefore TURN are still unanswered (§12 risk 2).

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
- [~] **WebRTC spike** (one day): two browser tabs, prove a peer connection
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

### Phase 3 — Virtual consultation, in-app WebRTC video

Highest-risk item in the project. The Phase 1 spike de-risks it. If the spike
fails, the link-based fallback below is already part of the schema and costs
nothing extra.

**Dependencies — require approval before installing:** `laravel/reverb`
(first-party WebSocket server), `laravel-echo` + `pusher-js` on the frontend.
Reverb needs its own process — add `php artisan reverb:start` to the
`concurrently` list in `composer dev`.

- [ ] Extend `consultation_sessions`: `mode` (`in_person|virtual`), `room_id`
      (uuid), `consultation_status` (`waiting|active|ended`), `started_at`,
      `ended_at`, plus the ERD's `meeting_link` and `platform` as the fallback.
- [ ] Add `appointments.consultation_type` — patient picks in-person vs. virtual
      during booking. Needs a field in `step-appointment.tsx` and a rule in
      `BookAppointmentRequest`.
- [ ] `WebRtcSignal` broadcast event on private channel `consultation.{roomId}`,
      carrying `{type: offer|answer|ice-candidate, payload, fromUserId}`.
- [ ] Channel authorization in `routes/channels.php` — **only** the session's
      `doctor_id` and the appointment's guarantor account. This is the security
      boundary for the whole feature: an unauthorized join is a live audio and
      video leak of a medical consultation. It gets its own test.
- [ ] `useWebRtc` hook + shared video-room component (local/remote streams, mute,
      camera toggle, end call), used by the doctor session editor and a new
      patient-side join page. Doctor creates the offer, patient answers.
- [ ] Native `RTCPeerConnection` + `getUserMedia`; no third-party peer library.

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
- [ ] **Decide virtual consultation's status** (§5.2): add it to Objective 1 and
      build it, or cut it from Figures 3/4/7/8/11 and Tables 3/4/7/8. It cannot
      stay documented in eleven places and absent from every objective.
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
2. **TURN is a deployment prerequisite, not a code task — still open.** The
   single-machine spike could not answer this: both peers shared one host, so
   ICE never crossed a network boundary and no candidate types were recorded.
   Budget for coturn or a hosted relay, **or** scope the demo to a single
   network and say so in Ch. 3's limitations. Deciding that deliberately is
   fine; discovering it live at defense is not. A second spike run with the far
   tab on a different device (a phone on mobile data, not the same wifi) is the
   cheapest way to settle it.
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
