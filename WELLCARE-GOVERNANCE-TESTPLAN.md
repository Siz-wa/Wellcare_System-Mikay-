# WellCare — Governance Manual Test Plan

> **Purpose.** Verify by hand, in a real browser, the thirteen governance
> controls built on 2026-09-10/11 and recorded in `WELLCARE-GOVERNANCE-PLAN.md`.
>
> The automated suite already covers all of this — **1231 passed, 0 failed** — so
> this document is not looking for regressions the tests would catch. It exists
> for two things a test suite cannot do: confirm the **UI actually says what the
> boundary is** (a refusal that only appears as a 403 is a bug report, not a
> control), and give a defense panel something walkable.
>
> Written to be driven by **Claude in Chrome**, but every step is a plain browser
> action anyone can do manually.

---

## 0. Before you start

### 0.1 Bring the app up

```bash
cd C:/Users/admin/Desktop/CENTRAL/PROJECTS/mikayla

php artisan migrate                                   # must_change_password column
php artisan db:seed --class=RoleAndPermissionSeeder   # 18 permissions / 7 roles
php artisan db:seed --class=GovernanceSeeder          # owner + dpo accounts

composer dev                                          # serve + queue + vite
```

Base URL throughout: **`http://127.0.0.1:8000`**

### 0.2 The 2FA shortcut — read this or you will get stuck immediately

Two-factor is **mandatory** for `owner`, `dpo`, `admin`, `hr`, `doctor` and
`nurse` (`EnsureTwoFactorEnrolled`). A staff account without it is held at
Settings → Security and cannot reach anything else. That is correct behaviour and
it is itself test **T-12** below — but you only want to prove it once, not fight
it on every login.

Run this **once**, after you have completed T-12:

```bash
php artisan tinker --execute '\App\Models\User::role(["owner","dpo","admin","hr","doctor","nurse"])->get()->each(fn($u) => $u->forceFill(["two_factor_confirmed_at" => now()])->save()); echo "staff marked 2FA-confirmed for testing\n";'
```

> **This is a test-only shortcut and must never be run on a real deployment.** It
> sets `two_factor_confirmed_at` without a real secret, which satisfies the
> middleware and skips the login challenge. It does not weaken the control — it
> bypasses it, which is exactly why it stays out of production.

To undo it afterwards:

```bash
php artisan tinker --execute '\App\Models\User::role(["owner","dpo","admin","hr","doctor","nurse"])->get()->each(fn($u) => $u->forceFill(["two_factor_confirmed_at" => null])->save());'
```

### 0.3 Accounts

All seeded passwords are `password123`.

| Role | Email | Lands on |
|---|---|---|
| System Owner | `owner@wellcare.com` | `/owner/dashboard` |
| Data Protection Officer | `dpo@wellcare.com` | `/dpo/dashboard` |
| Administrator | `admin@wellcare.com` | `/admin/dashboard` |
| HR / HMO Officer | `hr.garcia@wellcare.com` | `/hr/dashboard` |
| Doctor | `dr.reyes@wellcare.com` | `/doctor/appointments` |
| Nurse | `nurse.delacruz@wellcare.com` | `/nurse/dashboard` |
| Patient | `juan.dela.cruz@gmail.com` | `/user/dashboard` |

### 0.4 Create a second administrator

Several tests need **two** admin accounts to prove the peer boundary, and the
database ships with one. Creating the second is itself test **T-06**, so do that
test first and the rest of the plan has what it needs.

### 0.5 Where the emails go

`MAIL_MAILER=log`. Every notification in T-07 lands in
**`storage/logs/laravel.log`**, not a mailbox. Read it with:

```bash
tail -n 120 storage/logs/laravel.log
```

---

## 1. Test cases

Each test names the control it proves, the steps, and what a **pass** looks like.
Tick the box only when the *expected* result is what you actually saw.

---

### T-01 · GV-1 — An administrator cannot take over another account

**This is the priority finding.** Before the fix, `PUT /admin/users/{user}`
accepted a password for any target, so an admin could reset a doctor's password,
sign in as them, and read every chart — leaving no trace, with the reads
attributed to the doctor.

**Steps**

1. Sign in as `admin@wellcare.com`.
2. Go to **`/admin/users`**.
3. Find any **doctor or nurse** row. Click **Edit**.
4. Inspect every field in the modal.

**Expected — pass if all four hold**

- [ ] There is **no Password field** and **no Confirm password field** anywhere in the edit modal.
- [ ] There **is** a `Send reset link` button on the row.
- [ ] Creating a *new* user (**Add new user**) **does** show Password fields — the initial credential still has to come from somewhere.
- [ ] Open DevTools → Network, save the edit, and confirm the `PUT` request body contains **no** `password` key at all.

> The last one matters: the field is not merely hidden. `user-form.tsx` sends an
> explicit allow-list, because an unrendered field still travels and a password
> that reaches the server is a password that can reach a log.

---

### T-02 · GV-1 — Password recovery goes to the account holder

**Steps**

1. Still as `admin@wellcare.com` on `/admin/users`.
2. On a **nurse** row, click **Send reset link**. Confirm the dialog.
3. Read the flash message.
4. In a terminal: `tail -n 60 storage/logs/laravel.log`

**Expected**

- [ ] Flash reads `A password reset link was sent to <email>. Only the account holder can complete the reset.`
- [ ] The log contains a **Reset Password** email addressed to the **nurse's** address — not the admin's.
- [ ] Clicking again immediately gives the **throttle** message, not a false success.

---

### T-03 · GV-1 — Peer administrators are out of reach

*Requires the second admin from T-06.*

**Steps**

1. As `admin@wellcare.com`, go to **`/admin/users`**.
2. Find **the other administrator's** row.
3. Hover over its **Edit** and **Send reset link** buttons.
4. Find **your own** row and hover over **Edit**.

**Expected**

- [ ] Both buttons on the peer admin row are **disabled**.
- [ ] Their tooltip reads *"This account has the same level of access as yours or higher. Only the system owner can manage it."*
- [ ] **Edit is also disabled on your own row** — self-service belongs in Settings, where the audit trail records it as yours.
- [ ] The **Deactivate** button on the peer admin row is **still enabled**. This is deliberate: a compromised admin must be suspendable at 2am without waiting for the owner. Suspension is loud and reversible; a silent credential reset is neither.

---

### T-04 · GV-3 — Separation of duties on LOA decisions

**Steps**

1. As `admin@wellcare.com`, open the sidebar.
2. Click **LOA Queue (view only)** → `/hr/hmo-approvals`.
3. Look at the Actions column of any pending row.
4. Sign out. Sign in as `hr.garcia@wellcare.com` and open the same page.

**Expected**

- [ ] As **admin**: the page loads, the queue is visible, and each row shows the text **`HR decision`** where the buttons would be. No Approve. No Reject.
- [ ] As **HR**: the same rows show working **Approve** and **Reject** buttons.
- [ ] The admin sidebar label says *"LOA Queue (view only)"* — it does not promise authority the account lacks.

> Visibility without authority is the intended shape. The admin dashboard counts
> `pendingLoa`; an administrator who can see a backlog but not clear it has
> oversight without the conflict of interest. NIST SP 800-53 AC-5.

---

### T-05 · GV-6 — An administrator cannot mint another administrator

**Steps**

1. As `admin@wellcare.com`, go to **`/admin/users`** → **Add new user**.
2. Open the **Role** dropdown and read every option.
3. Pick any role you *can* select, fill the form, and save.

**Expected**

- [ ] The Role dropdown contains **Doctor, Staff Nurse, HR / HMO Officer, Patient**.
- [ ] It does **not** contain **Administrator** or **Data Protection Officer**.
- [ ] It does **not** contain **System Owner** under any circumstances.
- [ ] The **Role** button on an existing user's row offers the same reduced list.
- [ ] The account you did create is saved successfully.

---

### T-06 · GV-6 — The owner appoints administrators

**Steps**

1. Sign out. Sign in as `owner@wellcare.com`.
2. Confirm you land on **`/owner/dashboard`**.
3. Read the blue notice at the top.
4. Sidebar → **Appoint Administrators** (`/admin/users`).
5. **Add new user** → open the Role dropdown.
6. Create an administrator: `admin2@wellcare.com`, any strong password, role **Administrator**.

**Expected**

- [ ] Owner dashboard shows **Privileged accounts** listing the owner, admin and DPO, plus stat tiles.
- [ ] The notice states this account **holds no patient access** — by design.
- [ ] The Role dropdown here **does** include **Administrator** and **Data Protection Officer**.
- [ ] `admin2@wellcare.com` is created successfully and appears on the owner dashboard roster.
- [ ] The success flash mentions they will be asked to set their own password on first sign-in.

---

### T-07 · GV-7 — The subject is told when their access changes

**Steps**

1. As `admin@wellcare.com` on `/admin/users`, pick a **nurse**.
2. Click **Role**, change it to **HR / HMO Officer**, save.
3. Click **Deactivate** on the same account. Confirm.
4. Click **Reactivate**.
5. `tail -n 200 storage/logs/laravel.log`

**Expected — four separate emails in the log**

- [ ] `your access level changed` — naming the new role.
- [ ] `your account was suspended`.
- [ ] `your account was reactivated`.
- [ ] Every message tells the reader to **phone the clinic** if unexpected, and contains **no password, no token and no link that performs the change**.

**Then the email-change case, which is the important one:**

6. Edit that account and change its **email address**. Save.
7. Check the log again.

- [ ] The `your sign-in address changed` notice was sent to the **OLD** address, not the new one.

> If the change was made by somebody who had already taken over the mailbox,
> sending to the new address would notify only them. This is the only version
> that can reach the actual account holder.

---

### T-08 · GV-9 — A password somebody else chose does not survive first contact

*Uses `admin2@wellcare.com` from T-06.*

**Steps**

1. Sign out completely.
2. Sign in as `admin2@wellcare.com` with the password the owner typed.
3. Observe where you land.
4. Try to navigate to `/admin/dashboard` directly.
5. Change the password via the form on that page.
6. Navigate to `/admin/dashboard` again.

**Expected**

- [ ] You are redirected to **`/settings/security`** (possibly via a password-confirmation step).
- [ ] The message says the account is still using the password it was created with.
- [ ] Typing `/admin/dashboard` in the address bar **bounces you back** — it is not a dismissible banner.
- [ ] After changing the password, `/admin/dashboard` loads normally.

---

### T-09 · GV-5 — The DPO can see what nobody else can

**Steps**

1. Sign in as `dpo@wellcare.com`. Confirm you land on **`/dpo/dashboard`**.
2. Read the blue notice.
3. Look at the sidebar.
4. Open **Record Access Log** (`/dpo/access-log`).
5. Tick **Break-glass only** and clear it again. Try the **action** dropdown and the actor filter.
6. Open **Change Log** (`/dpo/activity-log`).

**Expected**

- [ ] The notice explains the role **cannot manage accounts — and that this is the point**.
- [ ] The sidebar has **no User Management link at all**.
- [ ] The access log lists real rows: staff name, role-at-the-time, patient, action, relationship, time, IP.
- [ ] The **Relationship** column shows three distinct states — `In care`, `Break-glass`, and `—` (not applicable). They are not collapsed into a boolean.
- [ ] Filters change the result set and are reflected in the **URL**, so a filtered view can be pasted into an incident report.

---

### T-10 · GV-5 — The oversight boundary holds from both sides

**Steps**

1. Still signed in as `dpo@wellcare.com`, type each of these into the address bar:
   `/admin/users` · `/admin/patients` · `/admin/archive` · `/doctor/patient-records`
2. Sign out. Sign in as `admin@wellcare.com` and try `/dpo/access-log`.

**Expected**

- [ ] Every `/admin/*` and clinical URL returns **403** for the DPO.
- [ ] `/dpo/access-log` returns **403** for the administrator.

> Both directions matter. The DPO cannot manage the people they audit; the
> administrators cannot read the log that records them. NIST SP 800-53 AU-9(4).

---

### T-11 · GV-4 — Administrative reads are audited

**Steps**

1. Sign in as `admin@wellcare.com`.
2. Visit **`/admin/patients`** and search for a name.
3. Visit **`/admin/archive`**.
4. Sign out, sign in as `dpo@wellcare.com`, open **`/dpo/access-log`**.
5. Filter by action **Searched** and look for the admin's rows.

**Expected**

- [ ] Two new rows exist for the admin — one with route `admin.patients`, one with `admin.archive`.
- [ ] Both show action **Searched**, actor role **admin**, and a timestamp matching your visit.
- [ ] The **Patient** column says *Not patient-scoped* — a roster read is not a read of one person's record.
- [ ] The **Relationship** column shows `—`, not `Break-glass`.

---

### T-12 · GV-12 — MFA is mandatory, not offered

*Do this **before** the 0.2 shortcut, or undo the shortcut first.*

**Steps**

1. Undo the shortcut (§0.2) so accounts are un-enrolled.
2. Sign in as `owner@wellcare.com`.
3. Try to reach `/owner/dashboard`.

**Expected**

- [ ] You are held at **Settings → Security** and told two-factor is required for staff accounts.
- [ ] You cannot navigate away to any workspace page.
- [ ] Signing in as a **patient** (`juan.dela.cruz@gmail.com`) is **not** blocked — 2FA stays optional for them.

> The asymmetry is deliberate. A patient account reaches one family's chart, and
> a login wall on a clinic's patient portal is a real access-to-care problem for
> the people least able to work around it. The obligation follows the breadth of
> access.

---

### T-13 · GV-8 — Privileged sessions expire sooner

Real windows are 15–30 minutes, which is too long to sit through. Shorten one.

**Steps**

1. Add to `.env`: `IDLE_TIMEOUT_ADMIN=1`
2. `php artisan config:clear`
3. Sign in as `admin@wellcare.com`, load `/admin/dashboard`.
4. Leave the browser **completely idle for 70 seconds**. Do not click anything.
5. Refresh.
6. Now sign in as a **patient** and repeat steps 3–5 with the same 70-second wait.
7. Remove `IDLE_TIMEOUT_ADMIN` from `.env` and `php artisan config:clear`.

**Expected**

- [ ] The admin is returned to **`/login`** with *"You were signed out after 1 minutes of inactivity."*
- [ ] The **patient is still signed in** after the same gap — their window is 120 minutes.
- [ ] Clicking around continuously never logs you out. The clock is **idle-based**, not an absolute session cap.

---

### T-14 · GV-10 — Break-glass recovery

**Steps**

```bash
# 1. Refuses when it is not an emergency
php artisan wellcare:admin:recover --email=nurse.delacruz@wellcare.com --operator="Test Operator"
```

- [ ] Refused, because an active administrator exists. It tells you to use `/admin/users` instead, and mentions `--force`.

```bash
# 2. Simulate a locked-out clinic
php artisan tinker --execute '\App\Models\User::role("admin")->get()->each(fn($u) => $u->forceFill(["is_active" => false])->save());'

php artisan wellcare:admin:recover --email=nurse.delacruz@wellcare.com --operator="Test Operator"
```

- [ ] Prompts for a reason. Type `no` — i.e. something under 15 characters — and it is **rejected** as not a real reason.
- [ ] Give a proper reason, then answer **no** at *Proceed?* → nothing changes and **no audit entry is written**.
- [ ] Run again, give a reason, answer **yes** → the nurse now holds `admin` and is active.
- [ ] The banner states this grants **account access only** and cannot reach a patient record.

```bash
# 3. Confirm it was recorded and surfaced
tail -n 80 storage/logs/laravel.log     # owner + DPO were emailed
```

4. Sign in as `dpo@wellcare.com` → `/dpo/dashboard`.

- [ ] An **Emergency recoveries** stat tile shows `1`.
- [ ] A **Break-glass administrative recovery** panel shows the entry with a red left border, the **reason in quotes**, the operator name, and the shell/OS user beside it.

```bash
# 4. Restore
php artisan tinker --execute '$u = \App\Models\User::where("email","admin@wellcare.com")->first(); $u->forceFill(["is_active" => true])->save(); $n = \App\Models\User::where("email","nurse.delacruz@wellcare.com")->first(); $n->syncRoles(["nurse"]); echo "restored\n";'
```

---

### T-15 · GV-2 — The permission matrix is real

**Steps**

1. Sign in as `owner@wellcare.com`.
2. Type each into the address bar: `/admin/patients` · `/admin/archive` · `/admin/staff`
3. Then try `/admin/users` and `/admin/activity-log`.

**Expected**

- [ ] The first three return **403** — the owner holds no patient, archive or credentialing permission.
- [ ] The last two **load** — the owner holds `users.view` and `audit.read`.

> This is the §5.1 property: the tier that appoints administrators has no reach
> into the record. An owner compromise costs the control plane, not the charts.

Confirm the matrix directly:

```bash
php artisan tinker --execute 'foreach (["owner","admin","dpo","hr"] as $r) { echo str_pad($r,7)." (".\Spatie\Permission\Models\Role::where("name",$r)->first()->permissions->count()."): ".\Spatie\Permission\Models\Role::where("name",$r)->first()->permissions->pluck("name")->implode(", ")."\n\n"; }'
```

- [ ] `owner` 9 · `admin` 14 · `dpo` 2 (`audit.read`, `access-log.read`) · `hr` 2 (`loa.decide`, `analytics.view`).
- [ ] `dpo` holds **no** `users.*` permission of any kind.

---

## 2. The automated suite

Everything above is also asserted in code. Run it before or after:

```bash
php artisan test --compact                                        # 1231 passed
php artisan test --compact tests/Feature/Governance/              # 45 tests
php artisan test --compact tests/Feature/Admin/AdminPrivilegeBoundaryTest.php   # 19 tests
```

| File | Covers |
|---|---|
| `tests/Feature/Admin/AdminPrivilegeBoundaryTest.php` | GV-1, GV-3, GV-4, GV-6 |
| `tests/Feature/Governance/GovernanceRoleTest.php` | GV-2, GV-5, GV-6 |
| `tests/Feature/Governance/AccountLifecycleTest.php` | GV-7, GV-8, GV-9, GV-10 |

> ⚠️ The suite takes roughly **23 minutes**. Run it in the background.

---

## 3. Teardown

```bash
# Undo the 2FA test shortcut
php artisan tinker --execute '\App\Models\User::role(["owner","dpo","admin","hr","doctor","nurse"])->get()->each(fn($u) => $u->forceFill(["two_factor_confirmed_at" => null])->save());'

# Remove IDLE_TIMEOUT_ADMIN from .env if still present
php artisan config:clear
```

To return to a clean slate entirely:

```bash
php artisan migrate:fresh --seed
```

---

## 4. Result summary

| # | Control | Result | Notes |
|---|---|---|---|
| T-01 | GV-1 no password field | ☐ Pass ☐ Fail | |
| T-02 | GV-1 reset link to holder | ☐ Pass ☐ Fail | |
| T-03 | GV-1 peer admin out of reach | ☐ Pass ☐ Fail | |
| T-04 | GV-3 LOA separation of duties | ☐ Pass ☐ Fail | |
| T-05 | GV-6 admin cannot mint admin | ☐ Pass ☐ Fail | |
| T-06 | GV-6 owner appoints admin | ☐ Pass ☐ Fail | |
| T-07 | GV-7 subject notified | ☐ Pass ☐ Fail | |
| T-08 | GV-9 forced password change | ☐ Pass ☐ Fail | |
| T-09 | GV-5 DPO oversight surface | ☐ Pass ☐ Fail | |
| T-10 | GV-5 boundary holds both ways | ☐ Pass ☐ Fail | |
| T-11 | GV-4 admin reads audited | ☐ Pass ☐ Fail | |
| T-12 | GV-12 MFA mandatory | ☐ Pass ☐ Fail | |
| T-13 | GV-8 idle timeout per role | ☐ Pass ☐ Fail | |
| T-14 | GV-10 break-glass recovery | ☐ Pass ☐ Fail | |
| T-15 | GV-2 permission matrix | ☐ Pass ☐ Fail | |

**Not covered by this plan.** GV-13 (tamper-evidence on the audit tables) is not
built — see `WELLCARE-GOVERNANCE-PLAN.md` §6.2. GV-11 (unique user
identification) is a property of the schema rather than a walkable flow.
