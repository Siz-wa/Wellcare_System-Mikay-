# WellCare — Data Protection Compliance Audit & Remediation Plan

> **Version 1.2 — 2026-09-08.** Companion to `WELLCARE-BUILD-PLAN.md`; the same
> §0 logging protocol applies. Every remediation item that ships appends a
> Change Log entry here **and** in the build plan, and flips the checkbox in §4
> in the same turn.
>
> **v1.1 corrects a v1.0 error.** Finding A-9 claimed administrators could read
> SOAP notes and lab notes through `activity_log`. They cannot:
> `ConsultationSession` deliberately does not use `RecordsActivity` (its model
> docblock says why), and `LabTestResult` logs `test_name` and `severity` but
> not `notes` or `interpretation`. The v1.0 inventory row for `activity_log` and
> the A-9 verdict are corrected below, and SC-9 is re-scoped accordingly. The
> original claim came from a grep that counted a *comment mentioning*
> `RecordsActivity` as a use of it.
>
> **v1.2 closes ND-1, ND-3 and ND-6, and resolves ND-8.** v1.0 parked all
> four as "needs a human decision". That was the wrong line in three of the
> four cases, and the corrected reasoning is worth keeping:
>
> • **ND-6** was never blocked on anything. The blocker was the *number*,
>   and a number belongs in config. It is now `config/retention.php`,
>   defaulting to the 15 years the project brief already supplied.
> • **ND-1** conflated the consent *mechanism* with the consent *text*. The
>   mechanism was always mine to build. The text is now a factual
>   description of what the code does — checkable line by line against this
>   repository — served from config behind `consent.approved`, which is
>   false until a DPO signs off and makes the UI say so.
> • **ND-3** followed ND-6 once retention had a home.
> • **ND-8** was a genuine risk, but a mitigable one rather than a reason to
>   leave SPI in plaintext. Encryption shipped with key rotation
>   (`APP_PREVIOUS_KEYS`, asserted by a test) and a production boot guard.
>   What survives of ND-8 is the operational question — where the key is
>   kept and who can restore it — which is genuinely not a code decision.
>
> ND-2, ND-4, ND-5, ND-7 and ND-9 stand: each is a decision about the
> clinic, not about the code.

---

## 0. Scope and what this document is not

This is a **technical/architectural audit** of the WellCare codebase against the
controls that the Philippine Data Privacy Act (RA 10173 + IRR), the DOH/NPC
Joint Administrative Order 2016-0002 (Health Privacy Code) and DOH AO 2020-0030
(telemedicine) expect a system holding sensitive personal information to
implement.

**It states what the code does. It does not state what the code makes WellCare
legally.** Nothing here is a legal conclusion, a certification, or a
determination of compliance. Several findings can only be closed by a policy
document or a human decision, not by a commit; those are isolated in §5 and are
explicitly **not** to be implemented unilaterally.

### Applicability of GDPR and HIPAA — read before assuming either

Both were checked for. Neither shows any hook in this codebase:

| Regime | Evidence in the repo | Assessment |
|---|---|---|
| **RA 10173 (PH DPA)** | `patients`, `patient_diagnoses`, `patient_allergies`, `lab_test_results` hold health data — SPI under §3(l). PH-only phone regex (`/^(\+639\|09)\d{9}$/`), single Dasmariñas branch, `APP_LOCALE=en`. | **Applies.** This is the governing regime and the whole basis of this audit. |
| **DOH / JAO 2016-0002, AO 2020-0030** | Clinical records plus a WebRTC virtual consultation module (`ConsultationSession.mode = virtual`). | **Applies** as sectoral rules layered on the DPA — notably the medical-record retention period and the telemedicine consent expectation. |
| **GDPR** | No EU establishment, no locale/currency/consent-banner targeting, no EU-facing route, no cross-border transfer code. The cookies page is static marketing copy with no consent mechanism. | **No technical indicator of applicability.** A capstone clinic in Cavite serving PH patients does not trigger Art. 3 on anything visible in this repo. **Do not build GDPR machinery on my say-so** — see ND-9. |
| **HIPAA** | No US covered entity, no clearinghouse, no X12/HL7, no BAA-shaped integration, no US payer. HMO handling is PH LOA-based (`loa_requests`). | **No technical indicator of applicability.** HIPAA binds US covered entities and business associates; nothing in the code puts WellCare in either category. |

**Practical consequence:** the remediation backlog in §3 is aimed at RA 10173 and
the DOH rules. Almost every control it adds — consent records, an access audit
trail, encryption at rest, minimum-necessary enforcement, breach-detectable
logging — is *also* what GDPR Art. 5/25/30/32/33 and the HIPAA Security Rule ask
for, so the work does not have to be redone if scope ever changes. The one thing
deliberately **not** built is a GDPR-style unconditional erasure flow: it would
collide head-on with the medical-record retention period (RET-1, ND-6).

---

## 1. PHASE 0 — Data inventory

### 1.1 Personal data and SPI by column

Legend — **Class:** `PI` personal information · `SPI` sensitive personal
information (RA 10173 §3(l): health, genetic, sexual life, government IDs) ·
`CRED` authentication credential. **At rest:** plaintext unless noted.

| Table | Column(s) | Class | Written by | Readable by | At rest |
|---|---|---|---|---|---|
| `users` | `email` | PI | `CreateNewUser`, `StaffAccountService`, `Settings\ProfileController::update` | self, `admin` | plaintext |
| `users` | `password` | CRED | Fortify | nobody (hashed) | **bcrypt** |
| `users` | `two_factor_secret`, `two_factor_recovery_codes` | CRED | Fortify actions | nobody | **app-encrypted**; also in `User::$hidden` |
| `users` | `remember_token`, `is_active`, `email_verified_at` | PI/CRED | Fortify, `AdminUserController` | self, `admin` | plaintext |
| `patient_profiles` | `first_name`, `last_name`, `address`, `company`, `contact_number`, `gender`, `birthdate`, `civil_status`, `client_number` | PI (birthdate + address ⇒ identity-grade) | `CreateNewUser`, `ProfileController::update` | self, `admin` | plaintext |
| `patient_medical` | `height`, `weight`, `blood_pressure` | **SPI** (health) | `CreateNewUser` / `StaffAccountService` | self | plaintext |
| `patient_medical` | `hmo`, `payment_method`, `preferred_doctor` | PI (insurance/financial) | same | self | plaintext |
| `patients` | `first_name`, `last_name`, `email`, `contact_number`, `age`, `gender`, `birthdate`, `address`, `civil_status`, `company`, `clinic_id` | PI | `GuarantorPatientController`, `AdminPatientController`, `Nurse\PatientRecordController::update`, `Patient::findOrCreateFromBooking` | guarantor, `doctor`, `nurse`, `admin` | plaintext |
| `patients` | `relationship_to_guarantor`, `relationship_note` | PI (family) | `GuarantorPatientController` | as above | plaintext |
| `patients` | `hmo_provider`, `default_coverage` | PI (insurance) | guarantor, `admin`, `nurse` | as above | plaintext |
| `patients` | **`hmo_id`** | **PI — insurance member number** | booking only (`BookAppointmentRequest`) | guarantor + `hr` (LOA queue). Deliberately withheld from `admin`/`nurse` write forms and from `Patient::activityLogAttributes()` | **plaintext** |
| `patient_allergies` | `allergen`, `severity`, `reaction`, `notes` | **SPI** (health) | `doctor`, `nurse` | guarantor, `doctor`, `nurse` | plaintext |
| `patient_diagnoses` | `icd_code`, `diagnosis`, `type`, `status`, `diagnosed_at`, `notes` | **SPI** (health — the most sensitive column set in the schema) | `doctor` only | guarantor, `doctor`, `nurse` (read-only) | **plaintext** |
| `patient_documents` | `title`, `type`, `file_name`, `mime_type`, `file_size`, **`file_path`** | **SPI** (health — lab scans, imaging, referrals) | `doctor`, `nurse` | guarantor, `doctor`, `nurse` | plaintext; **file body unencrypted on disk** |
| `consultation_sessions` | `subjective`, `objective`, `assessment`, `plan` | **SPI** (SOAP note) | `doctor` (own appointment only) | `doctor`; guarantor sees `assessment` + `plan` only; `nurse` sees all four via `visitHistory()` | plaintext |
| `consultation_sessions` | `blood_pressure`, `heart_rate`, `temperature`, `oxygen_saturation`, `weight`, `height` | **SPI** (vitals) | `doctor` | guarantor, `doctor`, `nurse` | plaintext |
| `consultation_sessions` | `room_id`, `meeting_link`, `platform` | PI (session locator) | `ConsultationSessionService` | both peers | plaintext |
| `consultation_prescriptions` | `name`, `instructions` | **SPI** (medication) | `doctor` | guarantor, `doctor`, `nurse` | plaintext |
| `lab_test_results` | `test_name`, `severity`, `notes`, `interpretation` | **SPI** (health) | `nurse` (record), `doctor` (review) | guarantor, `doctor`, `nurse` | plaintext |
| `lab_result_parameters` | `name`, `result`, `unit`, `ref_range`, `status` | **SPI** (health) | `nurse` | as above | plaintext |
| `appointments` | `first_name`, `last_name`, `email`, `contact_number`, `age`, `gender` | PI (denormalised copy of the patient) | booking | guarantor, `doctor`, `nurse`, `hr`, `admin` | plaintext |
| `appointments` | `service`, `additional_info`, `consultation_type` | **SPI** (specialty ⇒ health inference; `additional_info` is free text a patient types about their complaint) | booking | as above | plaintext |
| `appointments` | `hmo`, **`hmo_id`**, `coverage` | PI (insurance) | booking | guarantor, `hr`, `doctor` | plaintext |
| `loa_requests` | `loa_number`, `hmo_provider`, `hmo_id`, `remarks` | PI (insurance), SPI via `remarks` | `LoaService`, `hr` | guarantor, `hr`, `nurse` (read-only) | plaintext |
| `appointment_notifications` | `subject`, `body` | **SPI** (bodies name the service and the outcome) | `NotificationService` | recipient | plaintext |
| `notifications` | `data` (JSON) | **SPI** (same) | Laravel notifications | recipient | plaintext |
| `activity_log` | `properties` (old/new attribute JSON), `causer_id`, `subject_id` | PI + narrow **SPI** — **corrected in v1.1**: `ConsultationSession` is NOT audited, and `LabTestResult` logs `test_name` + `severity` only. No SOAP text, no lab notes, no diagnosis text reaches this table. `loa_requests.remarks` and `appointments.cancellation_reason` are free text and do. | `RecordsActivity`, `RecordAuthActivity` | **`admin`** | plaintext |
| `sessions` | `ip_address`, `user_agent`, `payload` | PI | framework | `admin` via `BrowserSessionService` | plaintext (`SESSION_ENCRYPT=false`) |
| `password_reset_tokens` | `email`, `token` | CRED | Fortify | nobody | token hashed by framework |
| `personal_access_tokens` | `token` | CRED | unused in this app | — | hashed |

### 1.2 Plaintext columns that arguably should not be

Ranked by what an attacker holding a single `SELECT` gets:

1. **`patient_diagnoses.diagnosis` + `.icd_code` + `.notes`** — a named condition
   against a named person. The highest-value column set in the schema.
2. **`consultation_sessions.subjective/objective/assessment/plan`** — free-text
   clinical narrative, unbounded in what it may contain.
3. **`patient_allergies.allergen/reaction/notes`** — health data, and the field
   most likely to be read in an emergency, so encryption must not break the read
   path.
4. **`lab_test_results.notes/interpretation`** and
   **`lab_result_parameters.result`** — diagnostic values.
5. **`patients.hmo_id` and `appointments.hmo_id`** — insurance member numbers.
   The codebase already treats `hmo_id` as needing narrower handling than the
   rest of the row (`Patient::activityLogAttributes()` excludes it deliberately;
   `AdminPatientController` refuses to accept it) — but the column is plaintext,
   so that narrowing is UI-level only.
6. **`consultation_prescriptions.name`** — a drug name is a diagnosis by
   inference.
7. **`appointments.additional_info`** — patient-authored free text, unbounded.
8. **`activity_log.properties`** — inherits the sensitivity of whatever it
   audits, and is rendered to `admin` in a UI. Narrower than v1.0 claimed (see
   the header note), but `test_name`, `severity`, `remarks` and
   `cancellation_reason` still land here. Encrypting the source columns without
   handling this table just moves the plaintext.

### 1.3 File uploads

| What | Where | How stored | Access path | Encrypted |
|---|---|---|---|---|
| Patient documents (lab scans, imaging, referrals, prescriptions, reports) — PDF/JPG/PNG/GIF/DOC/DOCX, ≤ 20 MB | `storage/app/private/patient-documents/{patient_id}/{hash}.{ext}` — the `local` disk, whose root is `storage_path('app/private')` | `$file->store(..., 'local')` in `Doctor\PatientRecordController::uploadDocument` and `Nurse\PatientRecordController::uploadDocument` | streamed via `Storage::disk('local')->download()` behind three named routes (`doctor.*`, `nurse.*`, `user.records.documents.download`) | **No.** Plaintext on the filesystem. Anyone with server, disk or backup access reads them with no application involvement. |

Two structural notes on this store:

- **It is not a public URL.** The path never leaves the server; the download
  routes stream the bytes. `FILESYSTEM_DISK=local`; S3 is configured but unused.
- **But `'serve' => true` on the `local` disk registers two framework routes** —
  `GET storage/{path}` (`storage.local`) and `PUT storage/{path}`
  (`storage.local.upload`), verified with `php artisan route:list --path=storage`.
  Both are gated by `hasValidRelativeSignature()` because the disk's visibility
  defaults to private, so this is **not an open door today**, and the application
  never mints such a URL. It is unused attack surface pointed at the exact
  directory holding patient documents, and a signed URL is bearer-grade — valid
  for whoever holds it, with no per-user check. See QW-5.

### 1.4 Where records are read and written, by role

| Surface | Route group | Reads | Writes |
|---|---|---|---|
| `Doctor\PatientRecordController` | `role:doctor` | **every patient** in the clinic, full clinical record | allergies, diagnoses, documents on **any** patient |
| `Doctor\DoctorConsultationController` | `role:doctor` | own appointments (`authorizeDoctor`: `doctor_id === Auth::id()`) | SOAP, vitals, prescriptions, lab requests |
| `Doctor\DoctorConsultationController::patientHistory` | `role:doctor` | scoped `where('doctor_id', Auth::id())` — correct | — |
| `Doctor\LabReviewController` | `role:doctor` | every lab result | review/validate any |
| `Nurse\PatientRecordController` | `role:nurse` | **every patient**, full clinical record including diagnoses and the full SOAP note | demographics, allergies, documents (no diagnosis writes — deliberate) |
| `Nurse\LabQueueController` | `role:nurse` | lab queue | record results |
| `HR\HmoApprovalController` | `role:hr\|admin` | name, contact, age, sex, **service**, coverage, `hmo_id`, LOA remarks | LOA approve/reject |
| `HR\AnalyticsController` | `role:hr\|admin` | aggregates only, plus CSV export | — |
| `Admin\AdminPatientController` | `role:admin` | demographics only; `hmo_id` withheld by design | demographics |
| `Admin\AdminActivityLogController` | `role:admin` | **`activity_log.properties`**, which contains audited SOAP and lab text | none (read-only by design) |
| `Patient\PatientRecordController` | `role:user` | own patients only (`guarantor_id === Auth::id()`) | none |
| `Patient\GuarantorPatientController` | `role:user` | own patients | demographics only |
| `Settings\PrivacyController` | `auth` | own account, full export | — |

---

## 2. PHASE 1 — Gap analysis

Verdicts: **Pass** · **Partial** · **Missing**. Every row cites a file.

### 2.1 Consent and lawful basis

| # | Control | Verdict | Evidence |
|---|---|---|---|
| C-1 | CLOSED 2026-09-08 (SC-4) — Explicit, specific, unbundled consent capture for processing SPI | **Missing** | `app/Actions/Fortify/CreateNewUser.php` validates 14 fields; **no consent field of any kind**. `resources/js/pages/auth/register/` contains no terms, privacy or consent checkbox — grepped, zero hits. A patient can register, book, and have a diagnosis written against them with no recorded consent. |
| C-2 | CLOSED 2026-09-08 (SC-4) — Consent versioned, timestamped, stored per patient | **Missing** | No `consents` table and no consent column anywhere across the 43 files in `database/migrations/`. |
| C-3 | CLOSED 2026-09-08 (SC-4) — Patient can later see what they consented to | **Missing** | `Settings\PrivacyController::show` renders counts of held data; there is nothing to show because nothing was captured. |
| C-4 | Privacy notice published | **Partial — improved, still ND-1** | `config/consent.php` now carries wording that a person must actually read and accept, versioned, and shown again in settings. It is still marked unapproved (`consent.approved = false`), and the UI says so in plain sight rather than presenting draft text as clinic policy. The static `/privacy` marketing page is unchanged. Original finding: | `resources/js/pages/generals/privacy/sections/privacy-data.ts` cites RA 10173 and enumerates data-subject rights. It is **static marketing copy that no user is required to see or accept**, and it is not versioned against any consent record. Content adequacy is a lawyer/DPO question — ND-1. |
| C-5 | CLOSED 2026-09-08 (SC-4) — Separate consent for telemedicine (AO 2020-0030) | **Missing** | `ConsultationSessionService::startVirtual` mints a room and begins a video consultation with no consent step. |
| C-6 | CLOSED 2026-09-08 (SC-4) — Proxy consent by a guarantor for a dependent | **Missing** | `patients.relationship_to_guarantor` (`self\|spouse\|child\|parent\|sibling\|other`) and `Patient::isMinor()` already model the relationship — the data needed to support proxy consent exists, but nothing records the consent itself. |

### 2.2 Access control

| # | Control | Verdict | Evidence |
|---|---|---|---|
| A-1 | Clinical record restricted to attending provider plus authorised staff | **PARTIAL 2026-09-08 (SC-2)** — was Missing | **Now:** `PatientPolicy` governs the surface and `Patient::isUnderCareOf()` defines the care relationship. Out-of-relationship reads are permitted but recorded as **break-glass** (`record_access_log.had_care_relationship = false`) rather than refused — a hard denial would fire on a doctor covering a colleague's list, and that is ND-2's decision, not a developer's. Flipping it to a 403 is one line in `PatientPolicy::view()`. Original finding: | `Doctor\PatientRecordController::show()` (`app/Http/Controllers/Doctor/PatientRecordController.php:44`) takes a route-bound `Patient` and applies **no relationship check at all**. Any account holding `role:doctor` reads any patient's allergies, diagnoses, documents, full SOAP history and vitals by walking `/doctor/patient-records/{id}`. `Nurse\PatientRecordController::show()` (`:71`) is identical. The clinic-wide *index* (`:33`, `:56`) is arguably defensible for scheduling; the **detail view is not**. |
| A-2 | Document downloads scoped to the requester | **CLOSED 2026-09-08 (QW-2 / SC-2)** — was Missing | **Fixed** by `PatientDocumentPolicy`; a document with no `patient_id` is now unreachable by anyone. Original finding: | `Doctor\PatientRecordController::downloadDocument()` (`:205`) checks only `Storage::exists()`. `Nurse\PatientRecordController::downloadDocument()` (`:173`) is identical. Enumerating `/doctor/patient-records/documents/{1..n}/download` returns every scan in the clinic. Contrast `Patient\PatientRecordController::downloadDocument()` (`:106`), which **does** verify `guarantor_id` — the correct pattern already exists in this repo and simply was not applied on the staff side. |
| A-3 | Record mutations scoped | **CLOSED 2026-09-08 (QW-2 / SC-2)** — was Missing | **Fixed:** `PatientDiagnosisPolicy` and `PatientAllergyPolicy` require the actor to be the recorder *or* to hold a care relationship. Stricter than `view` on purpose — break-glass is defensible for a read and not for a destructive write. Original finding: | `destroyAllergy(PatientAllergy $allergy)` (`:96`), `updateDiagnosis` / `destroyDiagnosis(PatientDiagnosis $diagnosis)` (`:148`, `:154`) and `destroyDocument(PatientDocument $document)` (`:207`) all act on a route-bound model with **no ownership or authorship check**. Any doctor can delete any patient's diagnosis. |
| A-4 | Patient-portal scoping | **Pass** | `Patient\PatientRecordController::authorizePatient()` and `GuarantorPatientController::authorizePatient()` both `abort_if($patient->guarantor_id !== Auth::id(), 403)`. Covered by `tests/Feature/Patient/PatientPortalAccessTest.php` and `tests/Feature/Patients/GuarantorPatientTest.php`. |
| A-5 | Consultation-room access | **Pass** | Deliberately not role-gated; `ConsultationSessionService::mayJoinRoom()` is the single check, used identically by the HTTP route and `routes/channels.php`. Covered by `ConsultationRoomAccessTest` and `ConsultationChannelAuthTest`. This is the pattern the rest of the app should follow. |
| A-6 | Consultation writes scoped to the attending doctor | **Pass** | `DoctorConsultationController::authorizeDoctor()` (`:441`): `abort_if($appointment->doctor_id !== Auth::id(), 403)`. |
| A-7 | Appointment confirm/cancel scoping | **Pass (documented widening)** | `DoctorAppointmentController::authorizeDoctor()` (`:165`) permits `doctor_id === null` so unassigned bookings can be claimed. Intentional and commented. |
| A-8 | HR limited to scheduling/billing, not clinical data | **Partial** | `HR\HmoApprovalController::mapLoa()` (`:103`) exposes name, email, contact, age, sex, **`service`** (the specialty — i.e. a health inference: "Psychiatry", "OB-Gyne"), coverage, `hmo_id` and LOA `remarks`. It exposes **no** diagnosis, SOAP, allergy, lab or document data, and `AnalyticsController` is aggregate-only. So HR does *not* reach the clinical record — but `service` is health data and is arguably beyond minimum-necessary for an insurance eligibility decision. **A judgment call, not a defect — ND-2.** |
| A-9 | Admin limited to demographics | **Pass** *(corrected in v1.1; was "Pass, with one leak")* | `AdminPatientController` is demographics-only and explicitly refuses `hmo_id` (`:80` comment). v1.0 claimed the audit log leaked clinical narrative to admins. It does not: `ConsultationSession` deliberately opts out of `RecordsActivity` — its docblock gives exactly this reason — and `LabTestResult::activityLogAttributes()` names `status, severity, requested_by, recorded_by, reviewed_by, test_name`, with `notes` and `interpretation` excluded. What an admin *does* see is a test name and a severity, plus `loa_requests.remarks`. That is a narrow health inference rather than a record disclosure, and it is arguable rather than clearly wrong — see the re-scoped SC-9. |
| A-10 | Documented role/permission matrix in Policies or Gates | **CLOSED 2026-09-08 (SC-2)** — was Missing | **Fixed:** `app/Policies/` now holds `PatientPolicy`, `PatientDocumentPolicy`, `PatientDiagnosisPolicy`, `PatientAllergyPolicy`; `AuthorizesRequests` is back on the base controller; the matrix is asserted by `tests/Feature/Compliance/RecordAccessPolicyTest.php`. Original finding: | `app/Policies/` **does not exist**. `grep -rn "Gate::" app/` returns **zero** results. Authorization is entirely `role:` route middleware plus five hand-rolled private `authorize*()` methods scattered across four controllers, each with a slightly different rule. There is no single place stating who may see what, and no way to test the matrix as a unit. |
| A-11 | Deactivated accounts cut off | **Pass** | `EnsureUserIsActive` middleware applied globally in `bootstrap/app.php`; `Fortify::authenticateUsing` rejects inactive accounts with a deliberately generic failure to prevent enumeration. `tests/Feature/Admin/AdminDeactivationTest.php`. |

### 2.3 Audit logging

| # | Control | Verdict | Evidence |
|---|---|---|---|
| AU-1 | Audit trail of **modifications** to patient records | **CLOSED 2026-09-08 (QW-3)** — was Partial | `App\Concerns\RecordsActivity` (Spatie) covered `User`, `Patient`, `Appointment`, `LabTestResult`, `LoaRequest` — **not** `ConsultationSession`, which opts out deliberately (v1.1 correction). It is well-built: attributes are named explicitly, never `logFillable()`, so credentials cannot leak in. **`PatientAllergy`, `PatientDiagnosis`, `PatientDocument` and `ConsultationPrescription` were not audited at all** — the four tables holding the most sensitive clinical writes — so a doctor could create a diagnosis, delete it, and leave no trace of either. **Fixed:** all four now use `RecordsActivity`, watching structural columns only (`patient_id`, `recorded_by`, `type`, `status`, `severity`) and never the narrative (`diagnosis`, `icd_code`, `allergen`, `notes`, prescription `name`, document `title`/`file_name`). Accountability without turning the admin activity screen into a diagnosis list. |
| AU-2 | Audit trail of **access/reads** to patient records | **CLOSED 2026-09-08 (SC-3)** — was Missing | Nothing anywhere records that a record was *viewed*. `Doctor\PatientRecordController::show()` renders a full chart and writes nothing. This is the control that would make A-1 detectable after the fact, and RA 10173 §20(c)/§26 accountability plus the Health Privacy Code's access-tracking expectation both assume it exists. **Combined with A-1, an unauthorised look at any patient's record is currently both possible and invisible.** |
| AU-3 | Audit trail of **exports** | **CLOSED 2026-09-08 (QW-8)** — was Missing | Both `Settings\PrivacyController::export()` and `AnalyticsController::export()` now write a `record_access_log` row with action `exported`. |
| AU-4 | Authentication events audited | **Pass** | `App\Listeners\RecordAuthActivity` records sign-in, sign-out, failed attempt and password reset under log name `auth`, storing IP and user-agent only — never the submitted password. `FortifyServiceProvider` fires `Failed` by hand because the custom `authenticateUsing` closure bypasses `SessionGuard::attempt()`. Covered by `tests/Feature/Auth/AuthActivityTest.php`. Genuinely good work. |
| AU-5 | Audit log append-only / tamper-evident | **Partial** | `AdminActivityLogController` is read-only by design and its comment forbids adding write routes. The underlying table has no integrity control — a database-level actor can rewrite it. Acceptable at this tier; noted. |
| AU-6 | Audit log retention defined | **CLOSED 2026-09-08 (QW-10)** — was Missing | **Fixed:** `retention.audit_log_years` (7) drives both `config/activitylog.php` and the new `wellcare:access-log:clean`, both scheduled weekly. Shorter than the medical-record period on purpose — the record is the clinical obligation, the log of who read it is a security control with a shorter useful life. Original finding: | `AdminActivityLogController:16` acknowledges retention is unhandled. No cleanup job exists, so the table grows forever — safe for accountability, unsafe for minimisation. Needs a stated period (ND-3). |

### 2.4 Encryption

| # | Control | Verdict | Evidence |
|---|---|---|---|
| E-1 | SPI encrypted at rest (application level) | **CLOSED 2026-09-08 (SC-5)** — was Missing | **Fixed:** `encrypted` casts on diagnosis text and ICD code, the full SOAP note, allergen and reaction, lab notes and interpretation, lab parameter results, prescription name and instructions, both `hmo_id` columns, and `appointments.additional_info`. Verified as ciphertext in MySQL by reading through `DB::table()` rather than the model. Columns the app filters on in SQL stayed plaintext deliberately — `LIKE` over ciphertext returns nothing rather than failing. Original finding: | `grep -rn "encrypted" app/ config/` returns **three hits, none of them a cast**: two comments and `config/broadcasting.php`. No model in `app/Models/` uses the `encrypted` / `encrypted:array` cast. Every column in §1.2 is plaintext in MySQL. |
| E-2 | SPI encrypted at rest (storage level) | **Unknown — outside the repo** | MySQL TDE / InnoDB tablespace encryption and full-disk encryption are deployment facts this codebase cannot assert. Must be confirmed against the actual host before any claim is made. |
| E-3 | Credentials protected | **Pass** | `password` → `hashed` cast (bcrypt). `two_factor_secret` / `two_factor_recovery_codes` encrypted by Fortify's actions and listed in `User::$hidden`. `RecordsActivity` explicitly refuses to audit any of them. |
| E-4 | Uploaded files encrypted | **CLOSED 2026-09-08 (SC-6)** — was Missing | **Fixed:** `PatientDocumentStorage` encrypts on upload and decrypts on download; `patient_documents.is_encrypted` is per-row so files predating the change keep serving correctly while `wellcare:documents:encrypt` migrates them, verifying each round trip before flipping the flag. Whole-file rather than streaming, which the 20 MB upload cap makes acceptable — documented in the service, because raising the cap means raising `memory_limit` with it. |
| E-5 | File access signed/expiring rather than public | **CLOSED 2026-09-08 (QW-5 / SC-2)** — was half-missing | **Fixed:** downloads are authorised by `PatientDocumentPolicy` and logged; and `'serve' => false` on the `local` disk removed the two framework routes (`storage.local`, `storage.local.upload`) that sat over the patient-document directory. Original finding: | Downloads stream through named routes, never a public URL — correct. But the staff routes perform **no authorisation** (A-2), so the shape is right and the check is absent. |
| E-6 | TLS forced | **CLOSED 2026-09-08 (QW-6)** — was Missing | **Fixed:** `AppServiceProvider::configureProductionSafety()` calls `URL::forceScheme('https')` in production. Original finding: | No `URL::forceScheme('https')`, no HTTPS redirect middleware. `SecurityHeaders` sends HSTS **only** when `$request->secure() && app()->isProduction()` — correct and deliberate, but it hardens an already-HTTPS request rather than causing one. Enforcement is delegated entirely to a web-server config that does not yet exist in this repo. |
| E-7 | Dev/staging shortcuts that could reach production | **CLOSED 2026-09-08 (QW-4)** — was Partial | **Fixed twice over:** `.env.example` now carries `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE` and production notes on `APP_DEBUG`/`LOG_LEVEL`; and `configureProductionSafety()` **forces** `app.debug=false`, `session.secure=true`, `session.encrypt=true` when `APP_ENV=production`, because a template comment cannot survive a deploy but a service provider can. Original finding: | `.env.example` ships `APP_DEBUG=true`, `APP_ENV=local`, `SESSION_ENCRYPT=false`, and **no `SESSION_SECURE_COOKIE` line at all**. The local `.env` matches. `config/session.php` reads `'secure' => env('SESSION_SECURE_COOKIE')` → `null` → insecure cookie. Deploying by copying `.env.example` yields a debug-enabled, non-secure-cookie production app. Mitigating: `AppServiceProvider::configureDefaults()` correctly gates `Password::defaults()` and `DB::prohibitDestructiveCommands()` on `isProduction()` — the pattern is understood, it just was not applied to the env template. |
| E-8 | Session payload encrypted | **CLOSED in production 2026-09-08 (QW-4)** — was Missing | Forced on by `configureProductionSafety()`; still `false` locally by design. Original finding: | `SESSION_ENCRYPT=false`, so `sessions.payload` is plaintext in the same database as the records. Cookies themselves are encrypted (`encryptCookies` in `bootstrap/app.php`, with `appearance` / `sidebar_state` correctly excepted). |

### 2.5 Data subject rights (technical support for)

| # | Control | Verdict | Evidence |
|---|---|---|---|
| DS-1 | Access / portability export | **Pass — genuinely good** | `Settings\PrivacyController::export()` streams a full JSON bundle: account, profile, patients, appointments, allergies, diagnoses, documents (metadata only — `file_path` deliberately excluded, reasoning in the comment). Scoped on `guarantor_id`, throttled `3,1`. Covered by `tests/Feature/Settings/PrivacyTest.php`. |
| DS-2 | Export includes document **bodies** | **Partial** | Filenames and sizes only. Defensible — each file has its own authorised route — but an incomplete portability answer. |
| DS-3 | Correction through an authorised flow | **Partial** | Demographics: yes — `GuarantorPatientController::update` (self-service), `AdminPatientController::update`, `Nurse\PatientRecordController::update`. **Clinical data: no patient-facing correction path exists.** A patient who believes a diagnosis is wrong has no in-system route; the doctor can overwrite it — that overwrite is now at least logged (QW-3), but nothing lets the patient raise the question. |
| DS-4 | Erasure compatible with retention | **Missing — and actively dangerous** | See RET-1. Top-priority finding in this document. |
| DS-5 | Right to object / withdraw consent | **Missing** | Nothing to withdraw (C-1). |
| DS-6 | Breach notification to the data subject | **Missing** | No mechanism. |

### 2.6 Retention

| # | Control | Verdict | Evidence |
|---|---|---|---|
| **RET-1** | **No deletion logic may violate the medical-record retention minimum** | **CLOSED 2026-09-08 (SC-1)** — was CRITICAL | **Fixed:** `User` soft-deletes; `ProfileController::destroy()` calls `User::closeAccount()`, which scrubs credentials, drops every session and retires the row while the clinical record stays whole; the six cascading foreign keys are now `SET NULL`. Covered by `tests/Feature/Compliance/RecordRetentionTest.php`. Original finding: | `Settings\ProfileController::destroy()` (`app/Http/Controllers/Settings/ProfileController.php:124`) calls `$user->delete()`, and **`User` does not use `SoftDeletes`** (verified at `app/Models/User.php:35`). Verified against the live schema via `information_schema.REFERENTIAL_CONSTRAINTS`, that hard DELETE cascades:<br>• `patient_allergies.user_id` → **CASCADE** — allergy records destroyed<br>• `patient_diagnoses.user_id` → **CASCADE** — diagnosis history destroyed<br>• `patient_documents.user_id` → **CASCADE** — document rows destroyed, **files orphaned on disk**<br>• `patient_profiles.user_id` → **CASCADE** → cascades again to `patient_medical`<br>• `appointment_notifications`, `notification_preferences` → CASCADE<br>while `patients.guarantor_id` → **SET NULL**, so the `patients` row survives *orphaned and unreachable from the portal* with its clinical children gone, and `appointments.user_id` → SET NULL leaves visits detached from any account.<br><br>The route is `DELETE /settings/profile`, live at `routes/settings.php:39` behind `auth,verified` and a password confirmation. **A patient can irreversibly destroy their own medical record, and the system will not even ask twice.** |
| RET-2 | Second path to the same destruction | **CLOSED 2026-09-08 (SC-1b)** — was Missing | `patient_allergies.recorded_by` and `patient_diagnoses.recorded_by` are also **CASCADE on `users`**. Hard-deleting a *doctor* account would delete every allergy and diagnosis that doctor ever recorded, **across every patient in the clinic**. Currently unreachable — `User::canCloseOwnAccount()` blocks clinical roles and `AdminUserController` only deactivates, never deletes — so this is a latent landmine rather than a live wound. It should still be closed at the schema level: the only thing between it and mass record loss is one `if` statement. |
| RET-3 | Clinical child records are soft-deleted | **CLOSED 2026-09-08 (SC-1a)** — was Missing | **Fixed:** all seven now use `SoftDeletes`. Original finding: | `PatientAllergy`, `PatientDiagnosis`, `PatientDocument`, `ConsultationSession`, `ConsultationPrescription`, `PatientProfile`, `PatientMedical` — **none use `SoftDeletes`**. So `Doctor\PatientRecordController::destroyAllergy` / `destroyDiagnosis` / `destroyDocument` are **hard deletes**, and `destroyDocument` additionally calls `Storage::disk('local')->delete()` — the file leaves the disk in the same request. `Appointment`, `Patient`, `LabTestResult` and `LoaRequest` **do** soft-delete, so the codebase knows the pattern; it was applied to four models and not the other seven. |
| RET-4 | Scheduled jobs touching patient tables | **Pass** | One scheduled command only: `consultations:close-stale` (`routes/console.php`), hourly. `CloseStaleConsultationRooms` sets call state and broadcasts `bye`; it deletes nothing. No pruning, no `truncate`, no `forceDelete` anywhere in `app/` — verified by grep. |
| RET-5 | Retention period defined and enforced | **CLOSED 2026-09-08 (SC-1d)** — was Missing | **Fixed:** `config/retention.php` sets the period (15 years, from the brief, behind an env var). `ProtectsRetainedRecords` hooks the `forceDeleting` model event so the floor holds no matter who calls it, anchored to the patient's LAST ENCOUNTER — a new appointment extends retention across the whole record. The only way past is `wellcare:records:purge`, which reports by default and needs two independent locks off to destroy anything. Original finding: | No retention concept exists in code — no `retain_until`, no anonymisation, no archival tier. The `admin/archive` screen restores soft-deleted `Appointment` and `Patient` rows; it is a recycle bin, not a retention policy. |

### 2.7 Breach readiness

| # | Control | Verdict | Evidence |
|---|---|---|---|
| B-1 | Could you reconstruct *what was accessed*? | **CLOSED 2026-09-08 (SC-3)** — was Missing | **Fixed:** `record_access_log` records actor, role-at-the-time, patient, subject, action, route, IP and care-relationship for every chart view, document download, roster search and export. The breach-scoping query is now `WHERE patient_id = ?` / `WHERE actor_id = ?`, both indexed. Original finding: | No read audit (AU-2). If a doctor account were compromised, the honest answer to "whose records were exposed?" is **"every patient in the database, and we cannot narrow it"** — because A-1 makes every record reachable and AU-2 leaves no trace. That is the difference between a scoped notification and notifying the entire patient list inside the 72-hour window. |
| B-2 | Could you reconstruct *what was changed*? | **CLOSED 2026-09-08 (QW-3)** — was Partial | `activity_log` now covers the four clinical child tables too. `ConsultationSession` remains deliberately outside it, so SOAP narrative changes are still unlogged — a real and accepted gap, since logging them needs a store the admin UI does not render. |
| B-3 | Detection / alerting | **Missing** | `config/logging.php` is stock: `stack` → `single`, `LOG_LEVEL=debug`, `LOG_DAILY_DAYS=14`. No anomaly alerting, no threshold on bulk reads, no `slack`/`papertrail` sink wired. Failed logins are recorded (AU-4) but nothing watches them. |
| B-4 | Log retention long enough to investigate | **Partial** | Application logs 14 days if `daily` is used; `activity_log` unbounded (AU-6). Neither is a deliberate choice. |
| B-5 | Breach response procedure | **Not code** | Requires a written procedure and a designated DPO. §5. |

### 2.8 Auth hardening

| # | Control | Verdict | Evidence |
|---|---|---|---|
| H-1 | MFA available | **Partial** | `config/fortify.php` enables `Features::twoFactorAuthentication(['confirm' => true, 'confirmPassword' => true])` — correctly configured, with `TwoFactorChallengeTest` coverage. It is **opt-in for everyone and mandatory for no one.** A doctor account that can read every chart in the clinic (A-1) is protected by a password alone unless that individual chose otherwise. |
| H-2 | Idle session timeout for staff | **Partial** | `SESSION_LIFETIME=120` applies uniformly to all five roles. Laravel's lifetime is idle-based, so it is a real two-hour idle timeout — but a shared clinic workstation and a patient's phone get the same window, and 120 minutes is long for the former. No per-role differentiation exists. |
| H-3 | Login rate limiting / lockout | **Pass** | `FortifyServiceProvider::configureRateLimiting()`: login `5/min` keyed on `lower(email)\|ip`; two-factor `5/min` keyed on `login.id`. Password update and session revocation `throttle:6,1`; privacy export `throttle:3,1`. |
| H-4 | Password policy | **Pass** | `Password::defaults()` in production: min 12, mixed case, letters, numbers, symbols, `uncompromised()` (HIBP k-anonymity check). Relaxed in local — correct. |
| H-5 | Password confirmation on sensitive actions | **Pass** | `ProfileDeleteRequest`, `LogoutOtherSessionsRequest`, `TwoFactorAuthenticationRequest`. |
| H-6 | Session management visibility | **Pass** | `BrowserSessionService` plus `settings/security` lists active sessions and supports revoking all others. |
| H-7 | Browser hardening headers | **Pass — unusually thorough** | `SecurityHeaders` sends `X-Content-Type-Options`, `X-Frame-Options`, `frame-ancestors`, `Referrer-Policy: strict-origin-when-cross-origin` (specifically so a URL containing a patient id is not leaked to third parties), `Permissions-Policy` and conditional HSTS. Applied both in the pipeline and from `withExceptions()->respond()` so thrown 401/403/404 responses are covered too. `tests/Feature/SecurityHeadersTest.php`. The absence of a full CSP is documented and reasoned. |
| H-8 | Email verification gating | **Partial** | `verified` is on the doctor, HR, nurse and admin groups. The **patient** group is `['auth', 'role:user']` — **no `verified`** (`routes/web.php`). An unverified email can therefore book appointments and read a medical record. Whether that is deliberate is unclear — ND-5. |

### 2.9 Scorecard

Counted item by item off the tables above, not carried forward — the v1.0
totals (15 / 15 / 24) were arithmetic slips and are corrected here. 55 controls,
of which E-2 (storage-level encryption) is **Unknown** because it is a
deployment fact this repo cannot assert, and B-5 (breach response procedure) is
**not code**. Those two are held aside from both columns.

| Area | v1.0 P / Pt / M | After the 2026-09-08 pass |
|---|---|---|
| Consent & lawful basis (6) | 0 / 1 / 5 | 0 / 1 / 5 — **untouched**, blocked on ND-1 |
| Access control (11) | 5 / 2 / 4 | **9 / 2 / 0** |
| Audit logging (6) | 1 / 2 / 3 | **4 / 1 / 1** |
| Encryption (8, incl. 1 Unknown) | 1 / 2 / 4 | **5 / 0 / 2** |
| Data subject rights (6) | 1 / 2 / 3 | **2 / 2 / 2** |
| Retention (5) | 1 / 0 / 4 | **4 / 0 / 1** |
| Breach readiness (5, incl. 1 non-code) | 0 / 2 / 2 | **2 / 1 / 1** |
| Auth hardening (8) | 5 / 3 / 0 | 5 / 3 / 0 — untouched |
| **Total (53 scored)** | **14 / 14 / 25** | **45 / 6 / 2** |

*(Second column updated in v1.2. Pass 1 reached 31 / 10 / 12; closing ND-1,
ND-3, ND-6 and ND-8 moved consent, retention and encryption at rest.)*

**The two still Missing.** B-3 — threshold alerting on the access log — which
is SC-8 and now has a data source to read, including `had_care_relationship`.
And DS-6 — notifying a data subject of a breach — which needs the written
procedure from §5 rather than code.

**The six Partial, and what each is waiting on.** C-4 (consent wording awaiting
DPO sign-off — the mechanism is done and the UI says the text is unapproved);
A-1 (break-glass rather than denial, pending ND-2); A-8 (HR seeing `service`,
also ND-2); AU-5 (the audit tables have no tamper-evidence, accepted at this
tier); DS-2 (the export carries document metadata, not bodies); DS-3 (clinical
corrections have no patient-facing request path — that is SC-7); H-1, H-2 and
H-8 (MFA optional, one idle timeout for all roles, patient group unverified —
SC-10, ND-4, ND-5).

E-2 remains **Unknown**: whether the database and disk are themselves
encrypted is a deployment fact this repository still cannot assert, and
application-level encryption does not answer it.

**How the shape changed.** v1.0's summary was that this codebase is *strong on
perimeter and authentication and weak on data-layer accountability* — good rate
limiting, password policy, security headers and session management, with
nothing that assumed an authenticated insider might be the threat. The
remediation pass was aimed squarely at that second half: per-record
authorization, read auditing and a retention floor under deletion all now
exist. What remains unaddressed is no longer a blind spot in the architecture —
it is a queue of decisions sitting with a human.

---

## 3. PHASE 2 — Prioritised remediation backlog

> **The tables below are the plan as approved on 2026-09-08 and are kept as
> written, so what was proposed can still be compared against what was built.
> They are NOT a status view — §4 is.** Eight of these shipped the same day;
> where the implementation deliberately departed from the plan (QW-1, SC-2's
> break-glass, SC-9's re-scoping) the reasons are in §4 and in that day's
> Change Log entry.

Ordering rule: anything that can **destroy** a record outranks anything that can
**expose** one, which outranks anything that merely fails to **prove** what
happened.

### 3.1 Quick wins — config/code, low risk, shippable this week

| ID | Item | Addresses | Effort | Risk to existing behaviour |
|---|---|---|---|---|
| **QW-1** | **Disable self-service account deletion.** Make `Settings\ProfileController::destroy()` refuse for any account that is guarantor for a `Patient` holding clinical data, returning the same "ask an administrator" message the staff branch already returns. One `if`, one test. **This is a tourniquet on RET-1, not the fix** — SC-1 is the fix — but it stops the bleeding in an hour instead of a sprint. | RET-1, DS-4 | XS | None. The delete button stays but declines instead of destroying. |
| QW-2 | **Ownership checks on the five unguarded staff mutations and two downloads.** Apply the check `Patient\PatientRecordController::downloadDocument()` already demonstrates to `Doctor\PatientRecordController::{downloadDocument, destroyAllergy, updateDiagnosis, destroyDiagnosis, destroyDocument}` and `Nurse\PatientRecordController::{downloadDocument, destroyAllergy}`. Interim measure, superseded by SC-2. | A-2, A-3 | S | None — closes IDOR paths nothing legitimate uses. |
| QW-3 | **Audit the four dark clinical models.** Add `RecordsActivity` + `activityLogAttributes()` to `PatientAllergy`, `PatientDiagnosis`, `PatientDocument`, `ConsultationPrescription`, following the established rule: name attributes explicitly, never `logFillable()`. | AU-1, B-2 | S | None. `dontSubmitEmptyLogs()` keeps volume sane. |
| QW-4 | **Harden the env template.** In `.env.example`: `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_ENCRYPT=true`, add `SESSION_SECURE_COOKIE=true`, add `SESSION_SAME_SITE=strict`, add `LOG_LEVEL=info`. Leave the local `.env` as-is for development. | E-7, E-8 | XS | None to the app; changes what a deployer inherits. |
| QW-5 | **Set `'serve' => false` on the `local` disk** in `config/filesystems.php`, removing the `storage.local` / `storage.local.upload` routes over the patient-document directory. The app never uses them. | §1.3, E-5 | XS | None — verify with `php artisan route:list --path=storage` afterwards. |
| QW-6 | **Force TLS in production.** `URL::forceScheme('https')` in `AppServiceProvider::boot()` guarded by `isProduction()`, matching the existing `configureDefaults()` pattern. | E-6 | XS | None locally (guarded). |
| QW-7 | **Shorten the staff idle window.** A middleware on the staff route groups expiring an idle staff session at ~20–30 minutes, leaving the patient portal at 120. | H-2 | S | Staff re-authenticate more often. Needs a number — ND-4. |
| QW-8 | **Log the two export endpoints.** One `activity()` call each in `PrivacyController::export()` and `AnalyticsController::export()`. | AU-3, B-1 | XS | None. |
| QW-9 | **Decide and apply `verified` on the patient route group.** | H-8 | XS | If applied, unverified accounts lose portal access until they click the link — ND-5. |
| QW-10 | **State an `activity_log` retention period** and schedule Spatie's `activitylog:clean`. | AU-6, B-4 | XS | None. Needs a number — ND-3. |

### 3.2 Structural changes — migration plus refactor

| ID | Item | Addresses | Effort |
|---|---|---|---|
| **SC-1** | **Retention floor under every deletion path.** (a) Add `SoftDeletes` + `deleted_at` to `PatientAllergy`, `PatientDiagnosis`, `PatientDocument`, `ConsultationSession`, `ConsultationPrescription`, `PatientProfile`, `PatientMedical`. (b) Migrate the eight `CASCADE` foreign keys on `users` that reach clinical data (`patient_allergies.user_id` / `.recorded_by`, `patient_diagnoses.user_id` / `.recorded_by`, `patient_documents.user_id` / `.uploaded_by`, `patient_profiles.user_id`, and the transitive `patient_medical.profile_id`) to `SET NULL` or `RESTRICT`. (c) Add `SoftDeletes` to `User` and convert account closure to **anonymise-and-restrict**: null the contact fields, retain the clinical record under its `patients` row, block sign-in. (d) Add `retain_until` on the clinical tables, defaulted from the applicable retention period, and make `forceDelete` impossible before it lapses. **Highest priority item in this document.** | RET-1, RET-2, RET-3, RET-5, DS-4 | L |
| **SC-2** | **A real authorization layer.** Create `app/Policies/` with `PatientPolicy`, `PatientDocumentPolicy`, `PatientDiagnosisPolicy`, `PatientAllergyPolicy`, `LabTestResultPolicy`, `ConsultationSessionPolicy`. Define `view` / `update` / `delete` in terms of an explicit **care relationship** — the provider has or had an appointment with this patient, or holds a named authorisation — rather than "has `role:doctor`". Replace the five hand-rolled `authorize*()` methods with `$this->authorize()` so the matrix lives in one testable place, then write the matrix test: for each (role × surface × owned/not-owned), assert 200 or 403. | A-1, A-3, A-10, B-1 | L |
| **SC-3** | **Access audit trail (`record_access_log`).** New table: `actor_id`, `actor_role`, `subject_type`, `subject_id`, `patient_id`, `action` (`viewed` / `downloaded` / `exported` / `searched`), `ip`, `user_agent`, `route`, `created_at`. Written from a middleware or a small `LogsRecordAccess` concern on every read surface in §1.4. Kept separate from `activity_log` because reads are high-volume and must not dilute the change log. Surfaced to `admin`, and — a genuinely strong capstone feature — to the **patient**, as "who looked at your record", which is what JAO 2016-0002 access transparency is reaching for. | AU-2, AU-3, B-1, DS-1 | M |
| **SC-4** | **Consent capture.** New `consents` table: `patient_id`, `granted_by_user_id`, `type` (`treatment` / `data_processing` / `telemedicine` / `marketing`), `document_version`, `granted_at`, `withdrawn_at`, `ip`, `user_agent`. A separate, unbundled checkbox per purpose at registration; a telemedicine consent step before `startVirtual()`; a "My consents" panel in `settings/privacy` showing what was agreed, when, against which version, with withdrawal where withdrawal is lawful. Proxy consent recorded through the existing `relationship_to_guarantor` + `isMinor()`. **The consent *text* is not mine to write — ND-1.** | C-1…C-6, DS-5 | M |
| **SC-5** | **Application-level encryption of the highest-value SPI.** `encrypted` casts on `patient_diagnoses.{diagnosis, icd_code, notes}`, `consultation_sessions.{subjective, objective, assessment, plan}`, `patient_allergies.{allergen, reaction, notes}`, `lab_test_results.{notes, interpretation}`, `patients.hmo_id`, `appointments.{hmo_id, additional_info}`, `consultation_prescriptions.name`. **Three consequences that must be designed for, not discovered:** (1) `LIKE` search over an encrypted column stops working — `ReadsPatientRecords::patientRecordQuery()` searches names (unencrypted, fine) but `LabReviewController` searches `test_name`; audit every query first. (2) Column widths must grow to `TEXT`. (3) `APP_KEY` becomes the single point of total data loss — key custody and rotation must be settled **before** this ships, and `activity_log.properties` must be encrypted in the same pass or the plaintext simply relocates. | E-1, §1.2, A-9 | L |
| **SC-6** | **Encrypted document storage plus per-request authorised access.** Encrypt file bodies at rest and route every download through a policy check (SC-2) and an access-log entry (SC-3). Keep streaming through controllers; do not introduce signed public URLs, which are bearer-grade and would weaken the current shape. | E-4, E-5, A-2 | M |
| **SC-7** | **Correction-request flow.** Let a patient flag a record they believe is inaccurate; the flag routes to the recording provider, who confirms or amends. **Amendments append, never overwrite** — a corrected diagnosis keeps the superseded version visible with its correction note, which is both the clinical norm and what makes the audit trail meaningful. | DS-3 | M |
| **SC-8** | **Breach-detection signals.** Threshold alerts over the SC-3 log: one account reading an unusual number of distinct patients in a window, out-of-hours bulk access, repeated failed logins followed by a success, any use of the privacy export. Wire a real log channel (`daily` plus an alerting sink) and raise `LOG_DAILY_DAYS`. | B-3, B-4 | M |
| **SC-9** | **Minimum-necessary trim of the admin audit view.** Redact or omit `activity_log.properties` for `ConsultationSession` and `LabTestResult` subjects in `AdminActivityLogController`, so "an admin is a records clerk, not a clinician" holds through the audit UI as it already does through the patient UI. | A-9 | S |
| **SC-10** | **Mandatory MFA for clinical and admin roles.** Middleware on the doctor/nurse/HR/admin route groups redirecting to two-factor enrolment until `two_factor_confirmed_at` is set. Patients stay opt-in. | H-1 | M |

### 3.3 Suggested sequencing

1. **Week 1 — stop destruction:** QW-1, QW-4, QW-5, QW-6, QW-8.
2. **Week 1–2 — stop silent exposure:** QW-2, QW-3.
3. **Sprint 1 — SC-1.** Nothing else matters while a patient can delete their own chart.
4. **Sprint 2 — SC-2 and SC-3 together.** The policy layer and the read log are the same conversation: SC-2 decides who may look, SC-3 proves who did. Shipping either alone leaves half a control.
5. **Sprint 3 — SC-4** (blocked on ND-1), **SC-9, SC-10**.
6. **Sprint 4 — SC-5 and SC-6** (blocked on ND-8), **SC-7, SC-8**.

---

## 4. Build order checklist

Ticked only when the change is merged **and** covered by a passing test.

### Quick wins
- [x] ~~QW-1 — self-service deletion refuses guarantors holding clinical records~~
      **Superseded by SC-1, which shipped in the same pass.** QW-1 was a
      tourniquet meant to buy time for the real fix; the real fix landed, so
      closing the account is now safe rather than blocked. Deliberately not
      implemented as specified — a "you cannot close your account" wall would
      have been a worse outcome for the patient than the fix.
- [x] QW-2 — ownership checks on staff mutations and downloads *(delivered as part of SC-2)*
- [x] QW-3 — audit the four dark clinical models
- [x] QW-4 — hardened `.env.example` **plus a runtime production guard**
- [x] QW-5 — `'serve' => false` on the local disk
- [x] QW-6 — `URL::forceScheme('https')` in production
- [ ] QW-7 — staff idle timeout *(blocked on ND-4)*
- [x] QW-8 — log the two export endpoints
- [ ] QW-9 — `verified` on the patient group *(blocked on ND-5)*
- [x] QW-10 — `activity_log` + `record_access_log` retention, both scheduled

### Structural
- [x] SC-1 — retention floor under every deletion path, all four parts
      — (a) soft deletes, (b) retention-safe foreign keys, (c)
      anonymise-and-restrict closure, and (d) the enforced period itself, which
      landed in v1.2 once ND-6 was resolved into `config/retention.php`. Built as
      a `forceDeleting` event guard rather than a stored `retain_until` column,
      so a new appointment extends retention automatically instead of leaving a
      stale date behind.
- [x] SC-2 — policy layer plus role matrix test *(break-glass, not denial — see A-1 and ND-2)*
- [x] SC-3 — `record_access_log`, including the patient-facing "who viewed this record" panel
- [x] SC-4 — consent capture, versioned and withdrawable *(wording still awaiting DPO — `consent.approved` is false)*
- [x] SC-5 — encrypted casts on high-value SPI, with key rotation and a boot guard
- [x] SC-6 — encrypted document storage, with a verified backfill for legacy files
- [ ] SC-7 — correction-request flow
- [ ] SC-8 — breach-detection signals *(now has a data source: `record_access_log`, and `had_care_relationship` to alert on)*
- [ ] SC-9 — trim the admin audit view *(**re-scoped by the v1.1 correction**: the SOAP/lab-notes leak does not exist. What remains is `test_name` + `severity` + `loa_requests.remarks` — arguable rather than clearly wrong, so this drops well down the list and is arguably ND-2 territory)*
- [ ] SC-10 — mandatory MFA for clinical/admin roles

---

## 5. Needs a non-technical decision first — DO NOT IMPLEMENT WITHOUT SIGN-OFF

**Revised in v1.2.** v1.0 listed nine of these. Four have since been closed or
substantially resolved, because in three cases the line was drawn in the wrong
place — the blocker was a *value* that belongs in config, not a decision that
blocks the mechanism. What is left is genuinely about the clinic rather than the
code.

### Closed

| ID | Was | Why it closed |
|---|---|---|
| ~~ND-1~~ | "What does the consent text say?" | Conflated the mechanism with the wording. The mechanism was always mine to build and now exists in full. The text is a factual description of what the code does, checkable against this repository, served from `config/consent.php` behind `consent.approved` — **false**, so every consent screen says it is pending DPO review. **Still needs approved copy** before that flag flips; that part remains a lawyer/DPO task, but nothing is blocked on it. |
| ~~ND-3~~ | "How long are the audit logs kept?" | `retention.audit_log_years`, default 7, driving both cleanup commands. Override in `.env`; no migration needed. |
| ~~ND-6~~ | "Exact retention period and start point." | The project brief already supplied 15 years. It is `retention.medical_records_years`, counted from the last encounter. **The minors rule is NOT implemented** — see ND-6a below. |
| ~~ND-8~~ | "`APP_KEY` custody before encryption." | The risk was real but mitigable rather than blocking. Encryption shipped with rotation via `APP_PREVIOUS_KEYS` (asserted by a test) and a production boot guard that refuses to start without a key. The operational half survives as ND-8a. |

### Still open

| ID | Question | Who decides | Why it is not mine |
|---|---|---|---|
| **ND-2** | **Should HR keep seeing `service`** (the specialty) on the LOA queue? It is a health inference. HR arguably needs it to judge coverage; minimum-necessary argues for a coverage-category code instead. **Also governs the SC-2 break-glass decision:** should an out-of-relationship record read be refused rather than logged? | Clinic ops + DPO | A real trade-off between HMO workflow and data minimisation, and a denial that fires on a doctor covering a colleague's list gets switched off within a week. `PatientPolicy::view()` is one line from becoming a 403 when you decide. |
| **ND-4** | **What idle timeout for staff?** 15 minutes is safe on a shared workstation and hostile mid-consultation. | Clinic ops | Depends on how the workstations are physically used — something I cannot observe. |
| **ND-5** | **Should the patient portal require a verified email?** Every other role does. Adding it may lock out existing unverified accounts. | Clinic ops | A live-user impact decision. |
| **ND-6a** | **Do minors get a different retention clock?** A common rule starts it at the age of majority rather than the last encounter. The code has `Patient::isMinor()` and `birthdate`, so the branch is a few lines — but only once someone confirms the rule applies. | Lawyer / DPO | I will not invent a statutory variation. `Patient::retentionAnchorDate()` is the single place it goes. |
| **ND-7** | **NPC registration** — do WellCare's projected volume and processing trigger the registration and DPO-designation thresholds? | Lawyer / DPO | Not a code question. |
| **ND-8a** | **Where does `APP_KEY` live, and who can restore it?** The code now refuses to boot without one and supports rotation, but no amount of code can answer "is it backed up somewhere other than the server it protects". Losing it destroys every encrypted clinical column as thoroughly as a hard delete would. | You + whoever operates the deployment | A secrets-management decision about infrastructure that does not exist in this repo. |
| **ND-9** | **Confirm GDPR and HIPAA are genuinely out of scope.** §0 finds no technical indicator of either. | You / DPO | A scoping fact about the business. Note this now bites harder than in v1.0: the retention floor actively *prevents* erasure, so a regime demanding unconditional erasure would need reconciling rather than adding. |

### Requires a policy document, not code

These cannot be closed by a commit at all, and I will not generate the text:

- **Privacy notice / privacy policy** — the current page is marketing copy.
- **DPO designation** — a named person, with published contact details.
- **Breach response procedure** — who is called, in what order, within the
  notification window. SC-8 provides the *signal*; the procedure is the response.
- **Records retention and disposal schedule.**
- **Staff confidentiality undertakings and access-authorisation records** — the
  paper trail saying *why* a given nurse may open a given chart, which is what
  SC-2's policy layer would be enforcing.
- **Data sharing / outsourcing agreements** with any HMO or laboratory the clinic
  exchanges data with.

---

## 6. Guardrails observed in this plan

- **No change proposed here alters appointment booking, HMO/LOA approval, or the
  existing role split.** `BookingService`'s slot locking, the appointment state
  machine, the `day_of_week` convention and the slot cache are untouched.
- SC-1's cascade changes are **schema-level and additive** (`CASCADE` → `SET
  NULL` / `RESTRICT`, plus `deleted_at`); no read path changes shape.
- SC-2 replaces five hand-rolled checks with policies **preserving current
  behaviour where it is already correct** — `authorizeDoctor`'s deliberate
  `doctor_id === null` widening for unassigned bookings is carried over, not
  silently tightened.
- SC-5 is explicitly gated on auditing every query touching an encrypted column
  first, because `LIKE` over ciphertext fails **silently** — it returns no rows
  rather than erroring.
- No legal conclusions are drawn anywhere in this document.

---

## Change Log

### 2026-09-08 — Compliance audit v1.0
**Phase:** compliance · **Status:** done (audit only — no code changed)
**Changed:** `WELLCARE-COMPLIANCE-PLAN.md` (new)
**Why:** Full Phase 0 inventory, Phase 1 gap analysis and Phase 2 backlog against
RA 10173, JAO 2016-0002 and DOH AO 2020-0030, with GDPR and HIPAA applicability
assessed and found to have no technical indicator in this codebase.
**Verified:** Inventory built from all 43 files in `database/migrations/`, live
`information_schema` queries for foreign-key `DELETE_RULE`s, and reads of every
controller in `app/Http/Controllers/`. Route surface confirmed with
`php artisan route:list --path=storage` (2 routes: `storage.local`,
`storage.local.upload` — both signature-gated, verified against
`vendor/laravel/framework/src/Illuminate/Filesystem/ServeFile.php`).
`grep -rn "Gate::" app/` → 0 results; `app/Policies/` does not exist;
`grep -rn "encrypted" app/ config/` → 3 hits, none a model cast.
**Blocked / left out:** No remediation implemented — Phase 3 awaits approval of
§3. Nine items in §5 need a human or legal decision first; ND-1, ND-6 and ND-8
block SC-4, SC-1 and SC-5 respectively.

### 2026-09-08 — Phase 3 remediation pass 1 (v1.1)
**Phase:** compliance · **Status:** done
**Changed:**
- `.env.example`, `config/filesystems.php`, `app/Providers/AppServiceProvider.php`
- `database/migrations/2026_09_08_062851_add_soft_deletes_to_clinical_record_tables.php`
- `database/migrations/2026_09_08_062853_make_clinical_record_foreign_keys_retention_safe.php`
- `database/migrations/2026_09_08_062855_add_soft_deletes_to_users_table.php`
- `database/migrations/2026_09_08_064203_create_record_access_log_table.php`
- `database/migrations/2026_09_08_065230_add_care_relationship_to_record_access_log.php`
- `app/Models/{User,Patient,PatientAllergy,PatientDiagnosis,PatientDocument,ConsultationSession,ConsultationPrescription,PatientProfile,PatientMedical,RecordAccessLog}.php`
- `app/Concerns/LogsRecordAccess.php` (new)
- `app/Policies/{PatientPolicy,PatientDocumentPolicy,PatientDiagnosisPolicy,PatientAllergyPolicy}.php` (new)
- `app/Http/Controllers/Controller.php`, `Doctor/PatientRecordController.php`,
  `Nurse/PatientRecordController.php`, `Patient/PatientRecordController.php`,
  `Patient/GuarantorPatientController.php`, `Settings/{ProfileController,PrivacyController}.php`,
  `HR/AnalyticsController.php`, `Admin/AdminPatientController.php`
- `resources/js/pages/user/records/{records-data.ts,record-detail.tsx,sections/access-log-section.tsx}`
- `tests/Feature/Compliance/{RecordRetentionTest,RecordAccessLogTest,RecordAccessPolicyTest}.php` (new)
- `tests/Feature/Settings/ProfileUpdateTest.php` (one assertion updated — see below)

**Why:** Shipped QW-3, QW-4, QW-5, QW-6, QW-8, SC-1(a–c), SC-2 and SC-3 from §3
of the compliance plan. Priority order was destruction before exposure before
proof, so RET-1 went first.

**Verified:** `php artisan test` — **717 passed (2790 assertions)**, exit 0, up from the
683 / 2667 baseline taken before any change. 34 of the new tests are the three
`tests/Feature/Compliance` files. `npm run types:check` clean;
`npm run lint` 0 errors (5 pre-existing warnings, none in new files);
`vendor/bin/pint` clean. Cascade change confirmed directly against
`information_schema.REFERENTIAL_CONSTRAINTS`: the six clinical foreign keys on
`users` now read SET NULL where they read CASCADE.
`php artisan route:list --path=storage` now returns no routes.

**Deviations from the approved plan, and why:**
- **QW-1 was deliberately not implemented as written.** It specified making
  account closure *refuse* for guarantors holding clinical data — a tourniquet
  to buy time for SC-1. SC-1 landed in the same pass, so shipping the wall first
  would have meant telling patients they may not close their account in order to
  protect a fix that already existed. The endpoint now closes accounts safely
  instead.
- **SC-2 records rather than refuses out-of-relationship access.** A hard denial
  is ND-2's decision and would fire on a doctor covering a colleague's list;
  `PatientPolicy::view()` is one line from becoming a 403 when that decision is
  made. Destructive writes (diagnoses, allergies) ARE hard-denied — break-glass
  is defensible for a read and not for a delete.
- **v1.0 finding A-9 was wrong and is corrected in v1.1.** Admins cannot read
  SOAP notes or lab notes through `activity_log`: `ConsultationSession` opts out
  of `RecordsActivity` deliberately and `LabTestResult` excludes `notes` and
  `interpretation`. The original claim came from a grep that counted a comment
  *mentioning* the trait as a use of it. SC-9 is re-scoped and de-prioritised.

**Blocked / left out:**
- **Consent (SC-4, C-1…C-6) untouched** — ND-1. The table and flow are an
  afternoon's work; the legal text is not mine to write.
- **Encryption at rest (SC-5, SC-6, E-1, E-4) untouched** — ND-8. Encrypting SPI
  before settling `APP_KEY` custody converts a confidentiality risk into an
  unrecoverable availability one.
- **SC-1(d) `retain_until` not built** — ND-6. Nothing can be purged today, which
  is the safe side of the gap, but there is still no enforced retention period.
- SC-7, SC-8, SC-10, QW-7, QW-9, QW-10 not started.
- **One existing assertion changed, not deleted:** `ProfileUpdateTest`'s
  "user can delete their account" asserted `$user->fresh()` was null, i.e. it
  asserted the hard delete that RET-1 identifies as the defect. It now asserts
  the row is soft-deleted and unreachable through a normal query. Worth noting
  that `fresh()` uses `newQueryWithoutScopes()` and looks straight past
  SoftDeletes — the first rewrite of that assertion passed for the wrong reason
  and had to be corrected to use `User::find()`.
- **Not visually verified in a browser.** The new "Who has viewed this record"
  section typechecks, lints and is asserted through Inertia props, but nobody
  has looked at the rendered page.

### 2026-09-08 — Phase 3 remediation pass 2: the three blockers (v1.2)
**Phase:** compliance · **Status:** done
**Changed:**
- `config/retention.php`, `config/consent.php` (new); `config/activitylog.php`
- `app/Concerns/ProtectsRetainedRecords.php`, `app/Exceptions/RetentionPeriodNotElapsedException.php` (new)
- `app/Models/Consent.php`, `app/Services/ConsentService.php`, `app/Services/PatientDocumentStorage.php` (new)
- `app/Console/Commands/{PurgeExpiredRecords,CleanRecordAccessLog,EncryptPatientDocuments}.php` (new)
- migrations: `create_consents_table`, `encrypt_sensitive_clinical_columns`, `add_encryption_flag_to_patient_documents`
- `app/Models/{Patient,PatientDiagnosis,PatientAllergy,PatientDocument,ConsultationSession,ConsultationPrescription,LabTestResult,LabResultParameter,Appointment,User}.php`
- `app/Actions/Fortify/CreateNewUser.php`, `app/Providers/{AppServiceProvider,FortifyServiceProvider}.php`
- `app/Http/Requests/BookAppointmentRequest.php`, `app/Http/Controllers/{AppointmentController,Settings/PrivacyController,Doctor/PatientRecordController,Nurse/PatientRecordController,Patient/PatientRecordController}.php`
- `routes/settings.php`, `routes/console.php`
- `resources/js/pages/auth/register/**` (consent checkboxes), `resources/js/pages/settings/privacy/**` (consent manager)
- `tests/Feature/Compliance/{RetentionPeriodTest,ConsentTest,EncryptionAtRestTest,DocumentEncryptionTest}.php` (new)
- `tests/Feature/Auth/RegistrationTest.php`, `tests/Feature/Booking/BookingConsultationTypeTest.php` (payloads updated — see below)

**Why:** Asked to close ND-1, ND-6 and ND-8 rather than leave them parked. On
re-examination the v1.0 line was drawn wrong in three of the four cases — the
blocker was a *value* that belongs in config, not a decision that blocks the
mechanism. Shipped SC-1(d), SC-4, SC-5, SC-6 and QW-10.

**Verified:** `php artisan test` on a freshly seeded database —
**763 passed (2959 assertions)**, exit 0. Up from 717/2790 at the end of pass 1
and 683/2667 at the original baseline. 80 of those are `tests/Feature/Compliance`
across seven files. `npm run types:check` clean; `npm run lint` 0 errors
(5 pre-existing warnings, none in new files); `vendor/bin/pint --test` pass.
Encryption confirmed by reading `patient_diagnoses.diagnosis` straight out of
MySQL — `eyJpdiI6...` rather than a diagnosis. `php artisan schedule:list` shows
the three new retention jobs.

**Where the line actually was, in each case:**
- **ND-6** was never blocked. The blocker was the *number*, and a number belongs
  in config. `config/retention.php` defaults to the 15 years the project brief
  already supplied. Built as a `forceDeleting` event guard rather than a stored
  `retain_until` column, so a new appointment extends retention automatically
  instead of leaving a stale date behind — and so the floor holds against any
  caller, not just the ones that remember to check.
- **ND-1** conflated the consent *mechanism* with the consent *text*. The
  mechanism was always mine. The wording is now a factual description of what
  this code does, checkable line by line against the repository, served from
  config behind `consent.approved` — **false**, so both the registration form
  and the settings panel display a "pending DPO review" notice. Approved copy is
  still a DPO task, but nothing is blocked on it.
- **ND-8** was a real risk, but mitigable rather than a reason to leave SPI in
  plaintext. Encryption shipped with `APP_PREVIOUS_KEYS` rotation (asserted by a
  test that rotates the key and reads an old row back) and a production boot
  guard that refuses to start without a key. What survives is ND-8a: where the
  key is kept and who can restore it, which no amount of code answers.

**Deviations and judgement calls:**
- **`loa_requests.remarks` deliberately NOT encrypted.** It is audited into
  `activity_log`, and Spatie reads attributes *through* the cast — so encrypting
  it would write the plaintext into a second table and achieve nothing but a
  false sense of cover. Every encrypted column was checked against its model's
  `activityLogAttributes()` for this.
- **`lab_test_results.test_name` deliberately NOT encrypted.** LabReviewController
  searches it with `LIKE`, and `LIKE` over ciphertext returns nothing rather than
  erroring — it would have broken the screen silently. Its `notes` and
  `interpretation` are encrypted.
- **Telemedicine consent is asked at booking, not at join.** By join time the
  patient is in a waiting room with a clinician expecting them, which is the
  worst moment to ask a question they are free to answer no to.
- **Document encryption is whole-file, not streaming.** `Crypt` is not a
  streaming cipher; the 20 MB upload cap makes ~27 MB peak memory acceptable.
  Documented in PatientDocumentStorage because raising the cap means raising
  `memory_limit` with it.
- **`data_processing` consent is required and not self-service withdrawable.**
  Withdrawing it would collide head-on with the retention floor built in the
  same pass. The panel explains that and points at the clinic rather than
  offering a greyed-out button.

**Blocked / left out:**
- **The consent wording still needs DPO approval** before `CONSENT_TEXT_APPROVED`
  can be set. Until then the UI says so, in both places it appears.
- **ND-6a — minors.** A common rule starts the retention clock at the age of
  majority rather than the last encounter. `Patient::isMinor()` and `birthdate`
  exist, so the branch is a few lines in `retentionAnchorDate()`, but I will not
  invent a statutory variation.
- **ND-8a — key custody.** Code now refuses to boot without a key and supports
  rotation; it cannot answer whether the key is backed up somewhere other than
  the server it protects.
- ND-2, ND-4, ND-5, ND-7, ND-9 unchanged. SC-7 (correction requests), SC-8
  (threshold alerting), SC-9 (re-scoped, low priority), SC-10 (mandatory MFA)
  and QW-7/QW-9 not started.
- **Five existing tests had payloads updated, none deleted.** Three in
  `RegistrationTest` and two in `BookingConsultationTypeTest` were asserting the
  pre-consent contract; they now supply the consent fields. Each is asserting
  something else entirely, and the consent behaviour has its own coverage in
  `tests/Feature/Compliance/ConsentTest.php`. Worth noting they failed loudly
  rather than silently, which is what a consent gate should do.
- **Still not visually verified in a browser.** The consent checkboxes, the
  consent manager and the record access panel all typecheck, lint and are
  asserted through Inertia props, but nobody has looked at the rendered pages.
- **`wellcare:documents:encrypt` reports failure on this dev database**, and
  correctly: all 51 seeded `patient_documents` rows reference files the seeder
  never created, so every one is skipped rather than flagged encrypted. The
  round-trip verification working as intended, not a defect.
