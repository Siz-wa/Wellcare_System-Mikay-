# WellCare — Administrative Governance Audit & Remediation Plan

> **Does this system need a super administrator, and does the `admin` role it
> already has resemble a real one?** Created 2026-09-10.
>
> Companion to `WELLCARE-COMPLIANCE-PLAN.md`. That document audits what happens
> to *patient data*. This one audits what happens to *privilege* — who may
> create an account, who may grant a role, who watches the people who can do
> both, and what stops one of them from quietly becoming somebody else.
>
> Same conventions as the compliance plan: verdicts are **Pass** · **Partial** ·
> **Missing**, every row cites a file, and nothing is marked closed until a test
> asserts it.

---

## 0. Scope, and what this document is not

**In scope.** The privilege model: roles, the route middleware that enforces
them, account provisioning and lifecycle, role assignment, credential handling
by administrators, separation of duties between administrative functions, and
the audit surface over administrative action.

**Not in scope.** Patient-data controls — consent, encryption, retention,
data-subject rights, breach readiness. Those are audited in
`WELLCARE-COMPLIANCE-PLAN.md` and are not repeated here. Where a governance
finding depends on one of them it cites the compliance ID (`A-9`, `AU-5`) rather
than restating it.

**Not legal advice.** The statutory citations in §2 identify the obligations a
system of this kind is measured against, and where this codebase stands relative
to them. Whether WellCare Clinics & Laboratory as an organisation discharges
those obligations is a question for its Data Protection Officer and counsel, not
for a repository.

**A note on the phrase "super admin".** It is used loosely in industry to mean
two different things: (a) *the tenant-spanning operator* in multi-tenant SaaS —
one account that administers many customer organisations; and (b) *the
break-glass owner* — the small, rarely-used account that appoints administrators
and recovers the system when they are locked out. This document rejects (a) as
inapplicable and recommends a narrow version of (b). Every use of "Super
Administrator" below means (b).

---

## 1. The question, answered

**Verdict: WellCare does not need a super administrator placed *above* the
current `admin` role. It needs the current `admin` role split *sideways*, plus
one deliberately small top tier scoped to appointment and recovery only.**

Three reasons, in order of weight.

**1. A rank above "can do everything" is not a control.** The `admin` role today
holds every administrative capability the system has, and several it should not.
Introducing a tier above it does not restrict anything; it only adds a second
account that can also do everything. Privilege is reduced by narrowing roles, not
by deepening the hierarchy — this is the whole content of NIST SP 800-53 AC-6
(least privilege) and AC-5 (separation of duties).

**2. The multi-tenant justification does not exist here.** The system serves a
single branch — WellCare Clinics & Laboratory, WalterMart Dasmariñas. There is no
second clinic, no tenant boundary, and therefore no operator who must reach
across one. The commonest real-world reason to build a super admin is absent.

**3. The one legitimate justification *is* present, and the codebase already
contains the evidence.** `StaffAccountService::guardLastActiveAdmin()`
(`app/Services/StaffAccountService.php:241`) refuses to deactivate or demote the
last active administrator, with the comment: *"There is no console recovery UI
and no second admin by default, so removing the last active admin bricks the
module permanently."* That guard is a workaround for a missing role. A system
that must refuse a legitimate operation because it has no recovery path is
telling you it needs an owner tier — a narrow one, whose entire purpose is to
appoint administrators and to be the way back in.

So the answer is yes-but-not-the-one-you-asked-about: build the top tier, make it
*small*, and spend the real effort on narrowing the tier below it.

---

## 2. What the standards actually require

The controls a system like this is measured against, and what each demands of an
administrator role specifically.

### 2.1 Philippine law and regulation — binding

| Instrument | What it requires of privileged access |
|---|---|
| **RA 10173 — Data Privacy Act of 2012**, and its IRR | Health data is **sensitive personal information** (§3(l)). §20(c) requires organisational, physical and technical security measures proportionate to the risk. §21 makes the Personal Information Controller accountable for data under its control. §§25–32 attach **criminal liability**, with §§27–29 covering unauthorised access, intentional breach, and **unauthorised processing by personnel with access** — the insider case, which is precisely the administrator threat model. |
| **NPC Circular 2023-06** — Security of Personal Data in the Government and Private Sector (in force 30 March 2024; **repeals NPC Circular 16-01**) | Rule IV governs online and physical access to personal data. Where personnel are given online access to **sensitive personal information or a high volume of personal data**, access rights and authentication mechanisms must be *defined and controlled by a system management tool*. The NPC's own FAQ states that a username, password and an approver may **not** be sufficient on their own. Also requires an acceptable-use policy, authorised-device control, and logging. |
| **NPC Circular 2023-04** — Guidelines on Consent | Relevant indirectly: an administrator who can alter or approve consent records affects the lawful basis for all downstream processing. Consent configuration is therefore a privileged setting, not an operational one. |
| **Joint AO 2016-0002 (DOH–DOST–PhilHealth)** — the **Health Privacy Code**, Privacy Guidelines for the Philippine Health Information Exchange | Assigns audit authority over a patient's shared health record jointly to the **Medical Records Officer and the Data Protection Officer**. This is the most directly applicable provision in this document: Philippine health regulation names an oversight role that is *distinct from the system administrator*, and WellCare has no such role in code. |
| **DOH AO 2020-0030** — Telemedicine guidelines | Applies to the consultation module; consent and record-keeping obligations follow the same access-control expectations. |
| **RA 11223 — Universal Health Care Act** | Underpins the PHIE and the health-information-exchange obligations the Health Privacy Code implements. |

### 2.2 International practice — what a defence panel will expect to see cited

| Instrument | What it requires of privileged access |
|---|---|
| **HIPAA Security Rule** (US, 45 CFR §164) | Not binding on a Philippine clinic with no US patients (see `WELLCARE-COMPLIANCE-PLAN.md` §0), but it is the reference implementation the industry designs against. §164.308(a)(3) workforce security — authorisation, clearance, **termination procedures**. §164.308(a)(4) information access management — how access is authorised, established and modified. §164.312(a)(2)(i) **unique user identification** — no shared or generic administrator accounts, because attribution is the precondition for every other control. §164.312(a)(2)(ii) **emergency access procedure** — the break-glass mandate. |
| **NIST SP 800-53 Rev. 5** | **AC-2** account management (provisioning, review, disabling). **AC-5** separation of duties — no single individual holds unchecked authority over a critical operation. **AC-6** least privilege, and **AC-6(5) privileged accounts** — privileged accounts restricted to a defined, minimal set. **IA-2(1)** MFA for privileged accounts. **AU-9(4)** protection of audit information — audit records protected **from the privileged users they record**. |
| **ISO/IEC 27001 + ISO 27799:2025** (health informatics) | Segregate duties and control privileged access for administrators and EHR super-users. RBAC at minimum-necessary. Remove generic accounts. Appoint a **health information custodian in writing**. ISO 27799 is the healthcare-specific overlay on ISO 27002, and is the standard NPC Circular 16-01 pointed at for organisations processing more than 1,000 individuals' data. |
| **ONC / ASTP Health IT Certification, 45 CFR §170.315(d)** | The closest thing in existence to a functional specification for this question. **(d)(1)** authentication, access control, authorisation. **(d)(2)** auditable events and tamper-resistance — note it requires that *the ability to disable auditing be restricted to a limited set of users*. **(d)(3)** audit reports. **(d)(5)** automatic access time-out. **(d)(6)** **emergency access**. |
| **OWASP Top 10 (2021) A01 / A07** | A01 Broken Access Control — privilege escalation and acting as another user are named sub-cases. A07 Identification and Authentication Failures — default and shipped credentials. Both have live instances in this codebase (GV-1, GV-9). |

### 2.3 The one sentence that summarises all of it

> Healthcare does not solve privilege with a taller hierarchy. It solves it with
> **narrower roles**, **mandatory MFA on privileged accounts**, and **an audit
> trail the privileged accounts cannot reach**.

Everything in §5 and §6 follows from that sentence.

---

## 3. PHASE 0 — The administrator as built

Verified against `routes/web.php` and the six controllers in
`app/Http/Controllers/Admin/`, 2026-09-10.

### 3.1 Capability inventory

Granted by two route groups: `routes/web.php:281` (`role:admin`) and
`routes/web.php:165` (`role:hr|admin`).

| Capability | Route | Implementation |
|---|---|---|
| System overview dashboard | `admin.dashboard` | `AdminDashboardController` |
| Create any account, **including another admin** | `admin.users.store` | `AdminUserController.php:76` → `StaffAccountService::create()` |
| Edit any account's **email and password** | `admin.users.update` | `AdminUserController.php:88` → `StaffAccountService::update()` |
| Change any user's role | `admin.users.role` | `:100` → `StaffAccountService::changeRole()` (`:190`) |
| Activate / deactivate any account | `admin.users.activate` / `.deactivate` | `:211` `setActive()` |
| Edit patient demographics | `admin.patients.update` | `AdminPatientController` (clinical data excluded) |
| View and **restore** soft-deleted patients and appointments | `admin.archive.*` | `AdminArchiveController` |
| Read the change-history audit log | `admin.activity-log` | `AdminActivityLogController` (read-only by design) |
| Verify / reject / suspend PRC credentials | `admin.staff.verify` etc. | `AdminStaffController` → `CredentialingService` |
| Confer clinical specialty | `admin.staff.specialty` | `AdminStaffController` |
| Publish / reject doctor availability | `admin.staff.schedule.*` | `AdminStaffController` → `AvailabilityService` |
| Mark a doctor out of office | `admin.doctors.out-of-office` | `AppointmentController` |
| **Approve / reject HMO LOA requests** | `hr.hmo-approvals.approve` / `.reject` | inherited via `role:hr\|admin` |
| **Export analytics CSVs** | `hr.analytics.export` | inherited via `role:hr\|admin` |

### 3.2 What is already right, and should not be disturbed

Recorded explicitly, because a remediation plan that lists only faults invites
the rewriting of things that work.

| Control | Evidence |
|---|---|
| **No user-delete route exists anywhere.** Offboarding is deactivation. | `routes/web.php:281-296`; `User::canCloseOwnAccount()` blocks clinical roles |
| **Self-action guards.** An admin cannot change their own role or deactivate themselves. | `StaffAccountService.php:190,211` |
| **Last-admin guard**, enforced at the service layer so a console command or seeder cannot bypass it. | `:241`, asserted by `tests/Feature/Admin/AdminDeactivationTest.php` |
| **The audit log has no write routes**, and its controller docblock forbids adding any. | `AdminActivityLogController.php:12-17` |
| **`record_access_log` is append-only** — no `updated_at`, no `SoftDeletes`, `nullOnDelete` on the actor FK so the evidence outlives the account it describes. | `2026_09_08_064203_create_record_access_log_table.php` |
| **MFA is mandatory for staff, not offered.** `admin` is in `PROTECTED_ROLES`. | `EnsureTwoFactorEnrolled.php:47`, applied globally in `bootstrap/app.php` |
| **Deactivation takes effect mid-session**, not at next logout. | `EnsureUserIsActive`, global |
| **Admin screens carry no clinical data.** `hmo_id` is explicitly refused; diagnoses, SOAP notes, labs and documents are unreachable from `/admin/*`. | `AdminPatientController.php:94-97`; compliance plan A-9 |
| **Patient reads run through `PatientPolicy`**, not the route middleware alone. | `AdminPatientController.php:34` |

This is a stronger administrative baseline than most systems of this size. The
findings below are about the seams between these controls, not about their
absence.

---

## 4. PHASE 1 — Governance gap analysis

| # | Control | Verdict | Evidence |
|---|---|---|---|
| **GV-1** | **An administrator cannot silently assume another account's identity** | **CLOSED 2026-09-10 (GV-1)** — was Missing, the priority finding | `UpdateUserRequest::authorize()` returns `true` (`app/Http/Requests/Admin/UpdateUserRequest.php:24`) and its rules accept `email` and `password` for **any** target user, with no role restriction and no re-authentication (`AdminUserController.php:88`). An administrator resets a doctor's password, signs in as that doctor, and reads every chart in the clinic. `activity_log` does not even record the password change — `User::activityLogAttributes()` returns `['email','is_active']` — and every chart read that follows is attributed to the doctor. This defeats the A-9 "admin limited to demographics" boundary entirely: the administrator cannot read clinical data *on their own screens*, and can reach all of it in two requests. The admin-on-admin case is the same defect: any admin may take over any peer admin. OWASP A01; HIPAA §164.312(a)(2)(i); NIST AC-6(5). |
| **GV-2** | **Permissions are expressed as capabilities, not role names** | **CLOSED 2026-09-10** — was Missing | `spatie/laravel-permission` is installed and its tables are migrated (`2026_04_04_170300_create_permission_tables.php`), but `RoleAndPermissionSeeder` creates **five roles and zero permissions**, and `grep -rn "Permission::" app/ database/` returns nothing. Authorisation is role-*name* string matching in route middleware. There is no vocabulary in which to say "this administrator may manage users but may not restore archived records", so every admin account is identical and maximal. The permission tables are carried at full cost and zero benefit. ISO 27799 RBAC-at-minimum-necessary. |
| **GV-3** | **Separation of duties between administrative functions** | **CLOSED 2026-09-10** — was Missing | `routes/web.php:165` puts `admin` in the same group as `hr`, so the account that provisions users also **approves HMO LOA requests** — a benefit-eligibility decision with financial consequence — and can also restore archived records and suspend the credentials of the clinician who raised the request. One account holds provisioning + transaction approval + record restoration. NIST AC-5 exists to prevent exactly this combination. |
| **GV-4** | **Administrative reads of patient data are audit-logged** | **CLOSED 2026-09-10** — was Missing | `LogsRecordAccess` is used by `Doctor\PatientRecordController`, `Nurse\PatientRecordController`, `Patient\PatientRecordController`, `HR\AnalyticsController` and `Settings\PrivacyController`. It is **not** used by `AdminPatientController` (`:28`, which pages up to 200 patients with name, email, contact number and clinic ID) or `AdminArchiveController` (`:28`, which lists soft-deleted patients — records somebody deliberately removed). The compliance plan's own SC-3 rationale is *"viewing is the whole of the harm in an unauthorised access"*; it was applied to four roles and not to the fifth. |
| **GV-5** | **An oversight role exists that is independent of the administrator** | **CLOSED 2026-09-10** — was Missing | There is no `dpo` role, no Medical Records Officer role, and no surface anywhere that reads `record_access_log`. The Health Privacy Code names the Medical Records Officer and Data Protection Officer as the parties authorised to audit a shared health record; RA 10173 requires a PIC to designate a DPO. Neither exists in code. The administrator reads the activity log that records the administrator's own actions, and nobody reads the access log at all. NIST AU-9(4). |
| **GV-6** | **Granting the administrator role is distinguished from ordinary account management** | **CLOSED 2026-09-10** — was Partial | `assignRole` is correctly a separate route with its own confirmation and its own reasoning (`AdminUserController.php:95-99`), and self-promotion is refused. But an admin creating a *second* admin is a single unremarkable `POST /admin/users`, and promoting an existing account is a single `POST /admin/users/{user}/role`. No approval, no dual control, no notification to anyone. The set of people who can read every account in the system can be doubled without anybody being told. |
| **GV-7** | **Account lifecycle events are visible to their subject** | **CLOSED 2026-09-10** — was Missing | Nothing notifies a user when their role is changed, their account is deactivated, or their email address is altered by an administrator. The `appointment_notifications` table is appointment-scoped; `NotificationService` targets by role for clinical events. A person whose access has been changed learns about it by being unable to log in. NIST AC-2; HIPAA §164.308(a)(3). |
| **GV-8** | **Privileged sessions are shorter than ordinary ones** | **CLOSED 2026-09-10** — was Missing | `SESSION_LIFETIME=120` applies uniformly to all roles. A shared clinic workstation running an administrator session and a patient's phone get the same two-hour idle window. ONC §170.315(d)(5). Carried forward from compliance plan H-2. |
| **GV-9** | **No shipped or default privileged credentials** | **CLOSED 2026-09-10** — was Partial | `AdminSeeder` creates `admin@wellcare.com / password123`, active and email-verified, with no forced password change on first login. Correct and necessary for a seeded demo — `migrate:fresh --seed` must produce a reachable admin — but nothing distinguishes the demo path from a production one. OWASP A07. |
| **GV-10** | **Break-glass / emergency administrative access** | **CLOSED 2026-09-10 (account scope)** — was Missing | `PatientPolicy` implements break-glass for clinicians — an out-of-relationship read is permitted and recorded as `had_care_relationship = false` — which is genuinely good design. There is no equivalent for administrative access, and no emergency path into the system at all: `guardLastActiveAdmin` refuses the lockout rather than providing a way back from it. ONC §170.315(d)(6); HIPAA §164.312(a)(2)(ii). |
| **GV-11** | **Administrators are subject to unique user identification** | **Pass** | No shared accounts; every action carries `causer_id`; `AdminSeeder` creates one named individual rather than a generic `administrator` login. |
| **GV-12** | **MFA mandatory for privileged accounts** | **Pass** | `EnsureTwoFactorEnrolled::PROTECTED_ROLES` includes `admin`, applied globally in `bootstrap/app.php`, with non-safe methods refused outright rather than redirected. Satisfies NIST IA-2(1) and NPC Circular 2023-06 Rule IV. *(This supersedes compliance plan H-1 "Partial", which is stale.)* |
| **GV-13** | **Privileged accounts cannot delete the evidence of their own actions** | **Partial** | No application path writes to or deletes from `activity_log` or `record_access_log`, and both controllers are read-only by construction. But neither table has an integrity control, and a database-level actor can rewrite both. Unchanged from compliance plan AU-5; acceptable at this tier, restated here because it is the ceiling on every other finding in this table. |

### 4.1 Scorecard

The audit column is the state on 2026-09-10 before any work; the second column
is after the remediation pass logged at the bottom of this file.

| Area | Audit P / Pt / M | After the 2026-09-10 pass |
|---|---|---|
| Identity & authentication of administrators (GV-11, GV-12) | 2 / 0 / 0 | 2 / 0 / 0 |
| Privilege boundaries (GV-1, GV-2, GV-3, GV-6) | 0 / 1 / 3 | **4 / 0 / 0** |
| Oversight & audit (GV-4, GV-5, GV-13) | 0 / 1 / 2 | **2 / 1 / 0** |
| Lifecycle & operational safety (GV-7, GV-8, GV-9, GV-10) | 0 / 1 / 3 | **4 / 0 / 0** |
| **Total (13)** | **2 / 3 / 8** | **12 / 1 / 0** |

**Nothing is Missing.** One control remains **Partial**: GV-13, tamper-evidence
on the audit tables themselves, which is deferred with its reasoning in §6.2 and
is the ceiling on everything else in this table — every other control here
assumes those two tables tell the truth.

**One scope note on GV-10.** What was built is break-glass for *account* access:
`wellcare:admin:recover` restores administrative rights to a locked-out clinic,
with a mandatory recorded reason, a named operator, and notification to every
owner and DPO. It deliberately does **not** grant an administrator access to a
patient record, because whether that should ever be possible is **GD-3 in §7 —
an open decision belonging to the DPO and medical director**. A console command
that quietly settled it would be a developer overruling a policy question.

**The shape of it.** This codebase authenticates its administrators well and
constrains them barely at all. Every control that asks *"is this really the
administrator?"* passes — MFA is mandatory, sessions are invalidated on
deactivation, accounts are individually named. Every control that asks *"and
should the administrator be able to do that?"* is missing. That is the mirror
image of the pattern the compliance plan found in the data layer before its
September pass, and it has the same root: the system was built to keep outsiders
out, and has not yet been built to constrain the insiders it lets in.

---

## 5. PHASE 2 — The target model

Three tiers, plus one oversight role that sits outside the hierarchy rather than
inside it.

```
                      ┌──────────────────────────────────┐
   appoints ────────► │  TIER 0 — System Owner           │  1–2 accounts
                      │  grants/revokes `admin`          │  console-created
                      │  system configuration            │  MFA mandatory
                      │  break-glass recovery            │  NO patient data
                      └──────────────┬───────────────────┘
                                     │ appoints
                      ┌──────────────▼───────────────────┐
                      │  TIER 1 — Administrator          │  several accounts
                      │  accounts · credentialing        │  capability-scoped
                      │  demographics · archive · audit  │  MFA mandatory
                      │  CANNOT grant `admin`            │  NO clinical data
                      │  CANNOT decide LOAs              │
                      └──────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────┐
   │  OUTSIDE THE CHAIN — Data Protection Officer                   │
   │  reads activity_log AND record_access_log                      │
   │  reviews break-glass events · handles data-subject requests    │
   │  CANNOT manage accounts — that separation IS the control       │
   └────────────────────────────────────────────────────────────────┘
```

### 5.1 Tier 0 — System Owner

The account that exists so the others can be constrained. Deliberately boring and
deliberately rare.

| It may | It may not |
|---|---|
| Grant and revoke the `admin` role — the **only** role that can | Read any patient record, demographic or clinical |
| Recover the system when the last administrator is locked out | Approve LOAs, credential doctors, or touch the clinic's day-to-day |
| Approve system configuration: retention period, consent version, security settings | Be created through any HTTP route |
| Be created only by `php artisan wellcare:owner:create` | Have MFA disabled |

**Why no patient data at all.** The tier that can appoint administrators is the
tier with the most to gain from a compromise. Giving it clinical reach as well
would mean a single credential compromise is simultaneously a total governance
failure and a total data breach. Keeping them separate means an owner compromise
costs you the *control plane* and not the *record*.

### 5.2 Tier 1 — Administrator

Everything the role does today, minus two things — granting `admin`, and deciding
LOAs — and expressed as **capabilities** rather than as a role name, so the
question "what may this administrator do?" has an answer that is not "everything".

Proposed permission vocabulary:

| Permission | Grants |
|---|---|
| `users.view` | See the account roster |
| `users.create` | Provision a non-privileged account |
| `users.update` | Edit an account's profile — **never its credentials** (GV-1) |
| `users.credentials.reset` | Trigger a password-reset email to the account's own address |
| `users.role.assign` | Change a role, `admin` excluded |
| `users.status.change` | Activate / deactivate |
| `admin.grant` | Grant or revoke `admin` — **Tier 0 only** |
| `staff.credential` | Verify, reject, suspend PRC credentials; confer specialty |
| `staff.schedule.publish` | Publish or reject availability |
| `patients.demographics.view` / `.update` | The `/admin/patients` surface |
| `archive.view` / `archive.restore` | The recycle bin |
| `audit.read` | The change-history log |
| `access-log.read` | The **read**-access log — **DPO only** |
| `loa.decide` | Approve / reject LOA — **HR only** (GV-3) |
| `analytics.view` | Reports and exports — HR *and* admin |
| `system.configure` | Retention, consent version — **Tier 0 only** |

### 5.3 The Data Protection Officer

The role Philippine health regulation actually names, and the answer to *"who
audits the auditor?"*

Its defining property is what it **cannot** do: it cannot create, edit, promote,
deactivate or delete any account. That inability is not a limitation of the role,
it *is* the control — it is what makes the DPO's view of administrator activity
independent of the administrators it describes (NIST AU-9(4)). Correspondingly it
is the only role that can read `record_access_log`, including the break-glass
events `PatientPolicy` records.

---

## 6. PHASE 3 — Remediation backlog

IDs are `GV-n` matching §4. Ordered by risk-reduction per hour of work.

### 6.1 Build order

- [x] **GV-1 · Close the account-takeover path.** *Done 2026-09-10.* `password`
      removed from `UpdateUserRequest` and from `StaffAccountService::update()`
      entirely; the edit form no longer renders the field on the edit path and
      sends an explicit allow-list rather than the whole form.
      `POST /admin/users/{user}/reset-password` mails a Fortify reset link to the
      account's **own** address. `User::ROLE_TIERS` / `mayAdminister()` refuse any
      credential or profile mutation aimed sideways or upwards.
- [x] **GV-4 · Log administrative reads.** *Done 2026-09-10.* `LogsRecordAccess`
      on `AdminPatientController::index` and `AdminArchiveController::index`,
      both recording an unscoped `searched` like the other index surfaces.
- [x] **GV-3 · Split `role:hr|admin`.** *Done 2026-09-10.* LOA approve/reject
      moved to a `role:hr` group. The queue itself stays visible to an
      administrator — visibility without authority — and the page is told via a
      `canDecide` prop so it renders the boundary instead of buttons that 403.
- [x] **GV-2 · Seed real permissions.** *Done 2026-09-10.* 18 permissions across
      7 roles in `RoleAndPermissionSeeder::PERMISSIONS` / `::MATRIX`; the admin
      route group is gated on `permission:` per capability. The matrix is
      asserted row by row in `GovernanceRoleTest`.
- [x] **GV-5 · Add the DPO role.** *Done 2026-09-10.* `Dpo\DpoOversightController`
      with three read-only screens — oversight dashboard, record access log
      (filterable, break-glass first), change log. Holds `audit.read` and
      `access-log.read` and **no** account permission; it is the only role that
      can read `record_access_log`.
- [x] **GV-6 · Add the `owner` tier.** *Done 2026-09-10.*
      `php artisan wellcare:owner:create` (console only, full password policy
      regardless of `APP_ENV`), `Owner\OwnerDashboardController`, and
      `User::mayGrantRole()` — which is what now stops an administrator minting
      a second administrator.
- [x] **GV-7 · Notify account-lifecycle events.** *Done 2026-09-10.*
      `AccountChangedNotification` on role change, suspension, reactivation,
      email change and admin-initiated password reset. Sends **mail**, not the
      in-app bell — a suspended account cannot sign in to read a bell. The
      sign-in-address notice goes to the address being **replaced**, so a change
      made by somebody who has already taken the mailbox does not notify only
      them.
- [x] **GV-8 · Per-role session lifetimes.** *Done 2026-09-10.*
      `config/security.php` + `EnforceIdleTimeout`. Owner and DPO 15 min, admin
      and HR 20, doctor and nurse 30, patient stays at 120. Idle-based, so
      continuous work is never interrupted. ONC §170.315(d)(5).
- [x] **GV-9 · Force a password change on first login.** *Done 2026-09-10.*
      `users.must_change_password` + `EnsurePasswordIsChanged`. Set when an
      administrator provisions an account (the one moment two people
      legitimately know a credential), cleared by a password change or a
      completed reset. Seeded privileged accounts are flagged **outside local
      and testing** — which is the thing the GV-9 finding actually asked for:
      something that distinguishes the demo path from a production one.
- [x] **GV-10 · Break-glass administrative access.** *Done 2026-09-10, account
      scope only.* `wellcare:admin:recover` — refuses to run while an active
      administrator exists (unless `--force`, which is recorded), demands a
      reason of real length, names an operator and captures the OS account
      beside it, writes to `activity_log` under the log name `emergency`, and
      emails every owner and DPO. Surfaced in its own panel on the DPO
      dashboard, because a break-glass event buried in routine change history is
      one nobody reviews. **Does not grant clinical access — see GD-3.**

### 6.2 Explicitly deferred

**GV-13 — tamper-evident audit tables.** Hash-chaining or an append-only external
sink is the correct answer, and it is disproportionate at this tier. Recorded so
that the ceiling on §4's other controls is stated rather than implied.

---

## 7. Needs a non-technical decision first — DO NOT IMPLEMENT WITHOUT SIGN-OFF

Mirrors `WELLCARE-COMPLIANCE-PLAN.md` §5. These are the clinic's calls, not a
developer's.

| # | Decision | Who decides |
|---|---|---|
| **GD-1** | **Who holds the System Owner account, in the real clinic?** A tier that appoints administrators needs a named human with the authority to do so — the clinic owner or medical director, not the IT contractor. If nobody will hold it, the tier should not be built. | Clinic management |
| **GD-2** | **Who is the Data Protection Officer?** RA 10173 requires a PIC to designate one; the Health Privacy Code pairs them with a Medical Records Officer for record audit. The role exists in law whether or not it exists in the system. | Clinic management |
| **GD-3** | **May an administrator ever read a patient's clinical record?** Currently no, by design (A-9). Options: keep the hard boundary, or add break-glass with a mandatory reason. The second is more honest about what happens in a real clinic; the first is easier to defend. | DPO + medical director |
| **GD-4** | **Should administrator actions on an account be visible to that account holder?** ~~GV-7 assumes yes.~~ **Implemented as yes on 2026-09-10** — see GD-7, which is the same question now that there is a live behaviour to overrule rather than a design assumption to settle. | Clinic management + HR |
| **GD-5** | **Retention of the governance audit trail.** `retention.audit_log_years` is 7 for the change log. Whether privileged-action records should be kept longer is an accountability-versus-minimisation trade, same as ND-3. | DPO |
| **GD-6** | **The idle-timeout figures themselves.** `config/security.php` sets 15 minutes for owner and DPO, 20 for admin and HR, 30 for doctor and nurse, 120 for patients. The *shape* is defensible — the obligation follows the blast radius — but the numbers are an engineer's judgement, not a standard. The clinical figure especially: a clinician re-authenticating mid-consultation in front of a patient is a real care cost, and 30 minutes is a guess at where that balances. Overrule with a policy. | DPO + medical director |
| **GD-7** | **Who receives account-change notices, and whether suspensions should be quiet.** GV-7 emails the affected person on every role change, suspension, reactivation and email change. There are staff-relations situations in which a clinic would rather a suspension were not announced to its subject the moment it happens. Currently it always is. | Clinic management + HR |

---

## Change Log

### 2026-09-10 — Governance audit v1.0
**Phase:** governance · **Status:** done
**Changed:** `WELLCARE-GOVERNANCE-PLAN.md` (new)
**Why:** The compliance plan audits patient data and says almost nothing about
privilege. The question "does this need a super admin" could not be answered
without an inventory of what `admin` actually holds, and that inventory turned up
GV-1 — a live privilege-escalation path that the compliance plan's A-9 "Pass"
masks.
**Verified:** Every row in §3 and §4 read off the named file at the named line on
2026-09-10. GV-12 corrects compliance plan H-1, which predates
`EnsureTwoFactorEnrolled` and is stale.
**Blocked / left out:** §6.1 is a backlog, not work done. §7 is unanswered by
design.

### 2026-09-10 — Governance remediation pass 1 (v1.1)

**Phase:** governance · **Status:** done (6 of 10 backlog items)

**Closed: GV-1, GV-2, GV-3, GV-4, GV-5, GV-6.**

**GV-1 — the account-takeover path.** `password` removed from
`UpdateUserRequest` and from `StaffAccountService::update()`. `User::ROLE_TIERS`
ranks authority over *other accounts* (owner 3 · admin/dpo 2 · hr/doctor/nurse 1
· user 0); `mayAdminister()` requires strict inequality, so an administrator
reaches accounts below their tier and never sideways. New route
`POST /admin/users/{user}/reset-password` mails a Fortify link to the account's
own address — the administrator starts the recovery and never holds the
credential. The edit form no longer renders a password field and sends an
explicit allow-list rather than the whole payload.

*Deliberate asymmetry:* `setActive()` is **not** tier-guarded. A compromised
admin account must be suspendable at 2am without waiting for the owner, and
suspension is loud, audited and reversible where a silent credential reset is
none of those. Reasoned in the method's docblock and asserted by a test.

**GV-2 — the permission vocabulary.** `RoleAndPermissionSeeder` now creates
**18 permissions across 7 roles** (`::PERMISSIONS` and `::MATRIX`), and the
admin route group is gated `role:admin|owner` plus `permission:` per capability.
The matrix is asserted row by row, and the seeder is idempotent (`syncPermissions`),
so a permission removed from the arrays is removed from the role on the next run.

**GV-3 — separation of duties.** LOA approve/reject moved out of `role:hr|admin`
into a `role:hr` group. The queue stays visible to an administrator — the admin
dashboard counts `pendingLoa` — and `HmoApprovalController::index` now sends
`canDecide` so the page renders the boundary instead of buttons that 403.

**GV-4 — administrative reads.** `LogsRecordAccess` added to
`AdminPatientController::index` and `AdminArchiveController::index`.

**GV-5 — the DPO.** New `dpo` role and `Dpo\DpoOversightController` with three
read-only screens. Holds `audit.read` + `access-log.read` and **no** account
permission; it is the only role that reads `record_access_log`. `record_access_log`
has been written since the September compliance pass and **nothing read it** —
this is the reader.

**GV-6 — the owner tier.** `php artisan wellcare:owner:create` (console only;
full production password policy regardless of `APP_ENV`; password prompted, never
an option, so it stays out of shell history and `ps`).
`Owner\OwnerDashboardController`. `User::mayGrantRole()` stops an administrator
minting a second administrator. `owner` is absent from `StoreUserRequest::ROLES`
so no web route can mint it — two independent walls.

**GV-12 correction.** The audit found MFA already mandatory for `admin` via
`EnsureTwoFactorEnrolled`, which **supersedes compliance plan H-1 "Partial"**.
`owner` and `dpo` were added to `PROTECTED_ROLES` in this pass.

**Changed:**
`app/Models/User.php` · `app/Services/StaffAccountService.php` ·
`app/Http/Controllers/Admin/{AdminUserController,AdminPatientController,AdminArchiveController}.php` ·
`app/Http/Controllers/HR/HmoApprovalController.php` ·
`app/Http/Controllers/DashboardController.php` ·
`app/Http/Requests/Admin/{StoreUserRequest,UpdateUserRequest}.php` ·
`app/Http/Middleware/EnsureTwoFactorEnrolled.php` · `routes/web.php` ·
`database/seeders/{RoleAndPermissionSeeder,DatabaseSeeder}.php` ·
`database/factories/UserFactory.php` ·
`resources/js/pages/admin/users/*` · `resources/js/pages/admin/layout/*` ·
`resources/js/pages/hr/hmo-approvals/hmo-approvals.tsx` ·
`tests/Feature/Admin/ActivityLogTest.php`

**Added:** `app/Console/Commands/CreateOwnerAccount.php` ·
`app/Http/Controllers/Owner/OwnerDashboardController.php` ·
`app/Http/Controllers/Dpo/DpoOversightController.php` ·
`database/seeders/GovernanceSeeder.php` ·
`resources/js/pages/owner/{owner-data.ts,dashboard.tsx}` ·
`resources/js/pages/dpo/{dpo-data.ts,dashboard.tsx,access-log.tsx,activity-log.tsx,components/access-row.tsx}` ·
`tests/Feature/Admin/AdminPrivilegeBoundaryTest.php` ·
`tests/Feature/Governance/GovernanceRoleTest.php`

**Verified:**
- `php artisan test --compact tests/Feature/Admin/AdminPrivilegeBoundaryTest.php` — **19 passed (68 assertions)**
- `php artisan test --compact tests/Feature/Governance/` — **24 passed (100 assertions)**
- `php artisan test --compact tests/Feature/Admin/` — **139 passed (523 assertions)**
- `npm run types:check` — clean; `npm run lint` — no new errors (1 pre-existing in `session-editor.tsx`)
- `vendor/bin/pint --dirty` — pass
- Live DB after seeding: admin 14 permissions, dpo 2 (`audit.read, access-log.read`), owner 9; `admin->mayGrantRole('admin') === false`, `owner->mayGrantRole('admin') === true`
- `php artisan test --compact` (full suite) — **1208 passed, 2 failed (4273 assertions)**.
  Both failures are `tests/Feature/Booking/AppointmentReminderTest` and are a
  **pre-existing time-of-day flake unrelated to this pass**: the two same-day
  reminder tests build an appointment at `today()` + `now()->addHours(3)`
  formatted as `g:i A`. Run after 21:00 the addition rolls past midnight, so
  "2:20 AM" recombined with `today()` lands ~21 hours in the PAST and no
  same-day reminder fires. Confirmed at 2026-09-10 23:20 local. The fix is to
  freeze the clock (`$this->travelTo(today()->setHour(9))`) in those two tests;
  left alone here because it is outside this pass's scope.

**One pre-existing test was amended, not deleted.**
`ActivityLogTest > it offers no route to edit or delete an entry` asserted there
was exactly ONE route whose URI contains `activity-log`. That count was a *proxy*
for the real property and broke when a legitimate second READ route appeared
(`dpo.activity-log`). It now asserts the property itself — every route over that
table is GET-only — plus the exact set of readers. Strictly stronger: a second
GET was always fine and a single POST never was.

**Blocked / left out:** GV-7 (subject notification), GV-8 (per-role session
lifetimes), GV-9 (forced first-login password change), GV-10 (time-boxed
emergency elevation) and GV-13 (tamper-evident audit tables) are **not built**.
The owner tier provides a *recovery path*, which is not the same as break-glass
elevation. §7's five decisions remain open and are not code.

### 2026-09-10 — Governance remediation pass 2 (v1.2)

**Phase:** governance · **Status:** done — the backlog is empty except GV-13

**Closed: GV-7, GV-8, GV-9, GV-10.** Together with pass 1, twelve of the
thirteen controls in §4 now pass and none is Missing.

**GV-7 — the subject is told.** `AccountChangedNotification` fires on role
change, suspension, reactivation, email change and an admin-initiated password
reset. Two decisions worth keeping:

*It sends mail, not the in-app bell.* Every other notification in this
application is `via(['database'])` and that is right for "your appointment was
confirmed". It is wrong for three of these five, because the whole point is that
the person may no longer be able to sign in. A suspension notice visible only
after logging in is not a notice — so this class deliberately does not extend
`WellcareNotification`, which hard-codes the database channel.

*The email-change notice goes to the OLD address.* If the change was made by
somebody who has already taken over the mailbox, sending to the new address
notifies only them. `notifyAccountChange()` takes `$previousEmail` and routes
on-demand for exactly this case.

Failures are swallowed and logged, the same trade `LogsRecordAccess` makes and
in the same direction: a mail transport that is down must not stop an
administrator suspending a compromised account.

**GV-8 — idle timeout follows the blast radius.** `config/security.php` and
`EnforceIdleTimeout`. Owner and DPO 15 minutes, admin and HR 20, doctor and
nurse 30, patient unchanged at 120.

The asymmetry is the same one `EnsureTwoFactorEnrolled` uses, and for the same
reason: a shared reception workstation and a patient's phone are not the same
risk, and charging the patient the same inconvenience buys nothing while costing
access to care for the people least able to work around a login wall. Clinical
roles get a *longer* window than administrators on purpose — a clinician
re-authenticating mid-consultation in front of a patient is a real care cost.
Those figures are a judgement and are now **GD-6** in §7.

Application-level rather than a session-driver setting because Laravel resolves
`session.lifetime` before it knows who is signed in. The stamp lives in the
session, not on `users`: it is per-SESSION, so a phone and a workstation expire
independently, and it avoids writing to `users` on every request.

**GV-9 — a password somebody else chose does not survive first contact.** New
`users.must_change_password` plus `EnsurePasswordIsChanged`.

This closes the gap GV-1 could not. GV-1 removed the administrator's ability to
set a password on an account that already has an owner; it could not remove the
*initial* password, because somebody has to set the first one. So there is a
window, by construction, in which two people know a credential. This closes it
at first sign-in instead of leaving it open for the life of the account.

It blocks harder than the 2FA middleware — redirect on GET, 403 on writes, and
no exemption for the two-factor routes — because unlike 2FA there is no
population of established users to strand: the flag is only ever set at creation.

For the seeded demo accounts the finding was never "this seeder uses a weak
password" (a demo seeder should) but that **nothing distinguished the demo path
from a production one**. That distinction is now one expression:
`! app()->environment(['local', 'testing'])`. Local demos stay directly usable;
anywhere else, an account seeded with a password written down in a public
repository is held at the password screen.

**GV-10 — break-glass, scoped to accounts.** `wellcare:admin:recover`.

Carries every property a break-glass procedure is expected to have: a mandatory
reason that is *stored* and rejected if trivially short, a named operator with
the OS account captured beside it as corroboration they did not type, a refusal
to run at all while an active administrator exists (`--force` overrides and the
override is itself recorded), a write to `activity_log` under the log name
`emergency`, and mail to every owner and DPO. The DPO dashboard renders these in
their own panel with the reason quoted — a break-glass event buried among a
thousand routine update entries is one nobody reviews.

**It does not grant clinical access, and must not be extended to.** Whether an
administrator may ever read a chart is GD-3, an open decision belonging to the
DPO and medical director. A console command that quietly settled it would be a
developer overruling a policy question.

**Added:** `app/Http/Middleware/{EnforceIdleTimeout,EnsurePasswordIsChanged}.php` ·
`app/Notifications/AccountChangedNotification.php` ·
`app/Console/Commands/RecoverAdminAccess.php` · `config/security.php` ·
`database/migrations/2026_09_10_233159_add_must_change_password_to_users_table.php` ·
`tests/Feature/Governance/AccountLifecycleTest.php`

**Changed:** `app/Models/User.php` · `app/Services/StaffAccountService.php` ·
`app/Http/Controllers/Admin/AdminUserController.php` ·
`app/Http/Controllers/Settings/SecurityController.php` ·
`app/Http/Controllers/Dpo/DpoOversightController.php` ·
`app/Actions/Fortify/ResetUserPassword.php` · `bootstrap/app.php` ·
`database/seeders/{AdminSeeder,GovernanceSeeder}.php` ·
`resources/js/pages/dpo/{dpo-data.ts,dashboard.tsx}` ·
`tests/Feature/Booking/AppointmentReminderTest.php`

**Verified:**
- `php artisan test --compact tests/Feature/Governance/AccountLifecycleTest.php` — **20 passed (69 assertions)**
- `php artisan test --compact tests/Feature/Booking/AppointmentReminderTest.php` — **15 passed (38 assertions)**, run at 23:30 local, which is what previously broke it
- `php artisan migrate` — `add_must_change_password_to_users_table … DONE`
- `npm run types:check` clean · `vendor/bin/pint --dirty` fixed and passing · `npm run lint` no new errors

**A pre-existing flaky test was fixed, not worked around.**
`AppointmentReminderTest`'s two same-day tests built an appointment at `today()`
+ `now()->addHours(3)` formatted `g:i A`. After 21:00 the addition rolls past
midnight, so "2:20 AM" recombined with TODAY'S date lands ~21 hours in the past —
the appointment is this morning, no reminder is due, and the test fails. It
passed for anyone running the suite in the morning and failed for anyone running
it in the evening. Both now pin the clock with `travelTo(today()->setHour(9))`.

**Blocked / left out:** GV-13 only — tamper-evidence on `activity_log` and
`record_access_log` themselves. Deferred with the reasoning in §6.2; it is the
ceiling on every other control in §4, and it is a hash-chain-and-external-sink
piece of work rather than a loose end. §7 now carries **seven** decisions that
are the clinic's to make, two of them (GD-6, GD-7) created by this pass.

### 2026-09-10 — Pass 2 addendum: three regressions the full suite caught

Recorded rather than quietly fixed, because two of the three are the kind of
interaction that a targeted test run will never surface — they only appeared when
the whole suite ran.

**1. A security guard test, tripped by a column name.**
`ActivityLogTest > it never records a password hash` asserts that no serialised
`activity_log` property anywhere contains the substring `password`. Adding
`must_change_password` to `User::activityLogAttributes()` tripped it — on the
field *name*, not on any credential.

The choice was to loosen a security guard so it would tolerate one known-safe
name, or to drop a low-value audit entry. **Dropped the audit entry.** Account
creation is already logged and the password change that clears the flag already
moves `updated_at`, so the marginal accountability was near zero; the guard is
blunt on purpose and catches keys nobody has thought of yet. Reasoned in the
docblock so the next person does not re-add it.

**2. A first-login test that knew about one gate and not two.**
`AdminUserManagementTest > it lets a newly created account land on its role
dashboard once enrolled` cleared `two_factor_confirmed_at` and asserted the
account reached its dashboard. GV-9 added a second gate, so it was correctly
held at `security.edit` by the other one. The test now clears both — its intent
("the gates are steps on the way rather than a wall") is unchanged.

**3. A real defect, not a test problem — GV-8 made the 2FA setup expiry
decorative.**

`TwoFactorEnrolmentTest > a setup abandoned for longer than the window is
discarded` failed with *"You were signed out after 30 minutes of inactivity"*.
The surface cause is arithmetic: the test travels
`PENDING_SETUP_TTL_MINUTES + 1` = 31 minutes, and the clinical idle window is 30.

The actual defect is worse than the test. `PENDING_SINCE_KEY` lives in the
**session**, and `expireStalePendingSetup()` deliberately grants a secret first
seen in a fresh session a FULL new window rather than expiring it on sight —
correct in isolation, and the reason is commented there. But with a setup TTL
*longer* than the idle window, the session always ends first, the marker dies
with it, and the next sign-in restarts the clock. **A stale unconfirmed secret
would have lived indefinitely, renewed by every login, and this expiry would
never have fired for any staff account.**

Not a hole — an unconfirmed secret grants nothing, and `EnsureTwoFactorEnrolled`
gates on `two_factor_confirmed_at` — but a mechanism that silently never fires is
worse than one that is absent, because it reads as covered.

**Fixed by reducing `PENDING_SETUP_TTL_MINUTES` from 30 to 10**, which fits
inside every window in `config/security.php` and is still ample to scan a QR code
and type six digits. `AccountLifecycleTest > it keeps the two-factor setup window
inside the shortest idle window` now asserts the relationship, so the two
constants cannot drift apart again silently.

**Verified after the fixes:** `php artisan test --compact tests/Feature/Governance/
tests/Feature/Admin/ tests/Feature/Auth/TwoFactorEnrolmentTest.php` — **170
passed (700 assertions)**.

**Final full-suite verification, 2026-09-11:** `php artisan test --compact` —
**1231 passed, 0 failed (4344 assertions)**, exit code 0. Three latent
time-dependent flakes were fixed along the way (two evening-only in
`AppointmentReminderTest`, one Friday-only in `PatientStatusDerivationTest`);
none was caused by the governance work.
