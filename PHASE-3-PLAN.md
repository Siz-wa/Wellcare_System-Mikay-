# Phase 3 — Virtual consultation (in-app WebRTC video)

## Context

`WELLCARE-BUILD-PLAN.md` §9 Phase 3 is the last unbuilt software module apart from
analytics. Virtual consultation is asserted in **eleven** places in the paper —
Figs. 3, 4, 7, 8, 11 and Tables 3, 4, 7, 8 — and **Table 3 already claims
"Start consultation session — video session starts successfully — Pass"** for
code that does not exist. Grepping the repo for `meeting_link`, `room_id`,
`consultation_type`, `telehealth` returns **zero real hits**; the marketing pages
(`generals/services`, `generals/faq`) already promise "secure video
consultations" to the public.

The feasibility question that gated this phase is now answered. The 2026-08-02
two-device spike run connected Windows ↔ macOS across two networks with
`srflx ⇄ srflx (udp)` on both sides, media direct peer-to-peer, and the joining
peer preferred the direct path *while a TURN relay was configured*. §12 risk 2 is
retired.

**§12 risk 7 is not.** That call held **17 seconds** before both peers dropped
simultaneously — the ICE consent-freshness window. A 17-second call demos as
working and is useless to a clinic. The plan's own bar is *"a run holding ≥2
minutes is the bar before any Phase 3 UI work starts."* This plan treats that as
a hard gate, not a footnote.

**Outcome:** a patient books a virtual appointment, the doctor opens a room from
a dedicated full-page video console, the patient joins from their portal, and
two-way audio/video runs over native `RTCPeerConnection` with Reverb carrying
signalling on a channel authorized to exactly two named accounts.

---

## Decisions locked (from the user, do not re-open)

| # | Decision |
|---|---|
| 1 | **Signalling = Laravel Reverb.** Install `laravel/reverb` + `laravel-echo` + `pusher-js`; add `reverb:start` as a 4th `composer dev` process. |
| 2 | **ICE servers env-configurable** via a new `config/webrtc.php`. Do NOT stand up coturn. Re-run the spike for a ≥2 min hold *before* UI work. |
| 3 | **Fix `patientHistory`'s missing doctor scope** + regression test. |
| 4 | **Doctor UI = dedicated full-page room**, not a tab in the existing 1510-line modal. |

---

## Corrections to the §9 checklist — apply these

1. **The checklist is missing a session state machine.** It says "extend
   `consultation_sessions`", but `start()` creates **no session row** (only
   `saveSession()`'s `updateOrCreate` does) and `appointment_id` is **UNIQUE**.
   A `room_id` on a row that does not exist cannot be minted. Prerequisite.
2. **The checklist is missing `patientHistory`.** Live cross-doctor PHI read, in
   the file this phase edits. Goes first, alone.
3. **"used by the doctor session editor" is wrong** (already overridden).
   `session-editor.tsx` unmounts on Escape — that would tear down the
   `RTCPeerConnection` every time the doctor hits Escape.
4. **"Doctor creates the offer, patient answers" is incomplete.** With
   fire-and-forget broadcast there is no offer store: if the doctor offers
   before the patient subscribes, the offer is lost and the call silently never
   connects. Needs a symmetric `hello` handshake. The spike never hit this
   because it polled a cache-backed relay.
5. **`meeting_link` / `platform` ship as schema only.** Columns yes, no reader.
   They are the documented fallback if the gate fails.

---

## Step 1 — `patientHistory` scope fix (independent, ships alone)

`app/Http/Controllers/Doctor/DoctorConsultationController.php:63-113` matches
completed appointments **by email string only**, with no `doctor_id` scope. Any
doctor can read any patient's last 20 SOAP notes, vitals and prescriptions.

```php
$q = Appointment::where('email', $email)
    ->where('doctor_id', Auth::id())     // ← add
    ->where('status', 'completed');
```

**New:** `tests/Feature/Consultation/PatientHistoryScopeTest.php` — a second
doctor gets an empty history for the first doctor's patient; the owning doctor
still gets their own.

*Verify:* new file green; `php artisan test --compact` still 277+.

---

## Step 2 — Migrations + models

Two migrations, neither touching `appointments.status`, so the STORED generated
`active_slot_key` column and its unique index are untouched.

**`..._add_virtual_consultation_to_consultation_sessions.php`** — on
`consultation_sessions`: `mode` enum(`in_person`,`virtual`) default `in_person`;
`room_id` char(36) nullable **unique**; `consultation_status`
enum(`waiting`,`active`,`ended`) nullable; `started_at`, `ended_at` nullable
timestamps; `meeting_link` string nullable; `platform` string nullable.

**`..._add_consultation_type_to_appointments.php`** — `consultation_type`
enum(`in_person`,`virtual`) default `in_person`, after `service`.

**No backfill needed.** Both enums carry column defaults, so the ALTER fills
every existing row; `room_id`/`consultation_status`/timestamps stay NULL, which
is correct for a visit that never had a call. (Contrast
`2026_07_31_045858_backfill_loa_requests_from_appointments.php`, which derived
rows into a *new* table.)

**Models:** `ConsultationSession` gains `HasFactory`, the new `$fillable`
entries, its **first `casts()` method** (`started_at`/`ended_at` → `datetime`),
and `isVirtual()`/`isLive()`. `Appointment::$fillable` gains
`consultation_type`. **Do not add `RecordsActivity` to `ConsultationSession`** —
`activityLogAttributes()` would copy SOAP narrative into a table the admin UI
renders, the exact mistake Phase 4's docblock warns about.

**New factories:** `ConsultationSessionFactory` (none exists) with `virtual()`,
`waiting()`, `active()`, `ended()`, `finalized()` states.
`AppointmentFactory` gains `checkedIn()`, `completed()`, `virtual()`.

*Verify:* `migrate` → `migrate:rollback` → `migrate` clean both ways; suite green.

---

## Step 3 — Booking `consultation_type` end to end

**Four files, and missing any one silently drops the field:**

| File | Change |
|---|---|
| `app/Http/Requests/BookAppointmentRequest.php` | rule `Rule::in(['in_person','virtual'])`; add `consultation_type` to `prepareForValidation()` (React sends `consultationType`); an `after()` closure blocking `virtual` for `laboratory`/`imaging`/`physical-therapy`, mirroring the existing OB-Gyne/Pediatrics rules |
| `app/Http/Controllers/AppointmentController.php` ~L124-142 | **`store()` ignores `$request->validated()`** and hand-builds `$payload`. Add the key here or the rule does nothing. |
| `app/Services/BookingService.php` ~L229-254 | add to the `Appointment::create([...])` array as `$validated['consultation_type'] ?? 'in_person'` |
| wizard (below) | the control itself |

**Frontend:** `sections/bookingdata.ts` gains `consultationTypeOptions`
(`SelectOption[]`, same shape as `patientStatusOptions`), a `REVIEW_LABELS`
entry, a `BookingFormData` field, and a `BOOKING_FORM_DEFAULTS` default of
`'in_person'`. `sections/step-appointment.tsx` gets a `<Field>` + `<ToggleCard>`
row **between Service and Patient Status**, mirroring the Patient Status block.
New `iconKey`s need entries in `components/booking-icons.tsx`.
`hooks/use-step-validators.ts` gains the `Step2Errors` key + check.

The `?? 'in_person'` null-coalesce means **`DoubleBookingTest` and
`DailyPatientCapTest` do not break.** If it is dropped, both `beforeEach`
closures need the key.

*Verify:* `BookingConsultationTypeTest`; book a virtual appointment through the
real UI; both booking test files green.

---

## Step 4 — ⛔ GATE: re-run the spike for a ≥2-minute hold

Two devices, two networks, `public/webrtc-spike.html` unchanged — it already
prints the held-duration clock. **No UI work starts until this passes.**

- **Holds ≥2:00 on STUN only** → risk 7 retired, TURN stays budgeted insurance,
  continue.
- **Fails, then holds with the TURN toggle on** → TURN becomes a **deployment
  blocker**, not insurance. Continue unchanged (`config/webrtc.php` already
  covers it) but log it in §12 rather than discover it at defense.
- **Fails with TURN too** → **stop and re-scope.** `meeting_link`/`platform`
  from step 2 are already in place; the fallback is a controller plus one input,
  and the paper says "external link" instead of "in-app video". That call
  belongs here, before ~20 files are written. **This is the entire reason the
  gate exists.**

Append the numbers to the Change Log in the style of the 2026-08-02 entry.

---

## Step 5 — Reverb + broadcasting scaffolding

`composer require laravel/reverb`, `php artisan install:broadcasting --reverb`,
`npm i laravel-echo pusher-js`. Review and revert the installer's unwanted edits.

- `bootstrap/app.php` — add `channels: __DIR__.'/../routes/channels.php'` to
  `withRouting()`. Note the file has **two separate `->withMiddleware()` calls**.
- `config/webrtc.php` — new; env-driven `stun_urls`, `turn_url`,
  `turn_username`, `turn_credential`, shaped into `RTCIceServer[]`.
- Env keys in **both** `.env` and `.env.example`: `REVERB_*`, `VITE_REVERB_*`,
  `WEBRTC_*`, and `BROADCAST_CONNECTION=reverb`.
- **Fix `SESSION_SECURE_COOKIE=true`** — it is an ngrok leftover and, against
  `APP_URL=http://127.0.0.1:8000`, will make `/broadcasting/auth` 403 with a
  message that says nothing about cookies.
- `composer dev` — 4th process. `-c` uses escaped doubles, `--names` uses single
  quotes; **all three parts** need editing.
- Reverb config reaches the client as an **Inertia shared prop** from
  `HandleInertiaRequests::share()`, not `import.meta.env` (keeps SSR clean and
  keeps the values server-authoritative).

*Verify:* `channel:list` runs without error; `composer dev` starts 4 processes.

---

## Step 6 — `ConsultationSessionService` + the state machine

New `app/Services/ConsultationSessionService.php` mirroring `LoaService`, plus
`app/Exceptions/InvalidConsultationTransitionException.php`.

**Two independent machines, deliberately asymmetric:**

```
consultation_status (the CALL)   null → waiting → active → ended → (reopen: new room_id)
status              (the NOTE)   draft → finalized        (terminal, no path back)
```

Ending the call does **not** finalize the note (risk 7 says expect drops; a drop
must not close the clinical record). Finalizing the note **does** end the call
(a closed record must not leave a live authorized channel behind).

**Fixes two live defects**, both currently unguarded and untested:
`saveSession()` sets `appointments.status='completed'` from *any* state, and a
later draft save silently flips a finalized note back to `draft`.

`room_id` is minted in `openVirtualRoom()` via `firstOrCreate` — the operation
the UNIQUE constraint was designed for — catching
`UniqueConstraintViolationException` on the double-click race. **Idempotency is
load-bearing:** a room already `waiting`/`active` returns *unchanged*.
Re-minting while the patient is connected leaves them on a dead channel with no
error on either screen.

`saveSession()` becomes a thin wrapper delegating to the service — same route,
same request shape, so `session-editor.tsx` keeps working untouched.

*Verify:* `ConsultationSessionLifecycleTest` — specifically reopen-finalized and
finalize-from-cancelled, which are red before this step.

---

## Step 7 — Channel, event, relay

- **`routes/channels.php`** (new) — `consultation.{roomId}` delegating to
  `ConsultationSessionService::mayJoinRoom()`.
- **`app/Events/WebRtcSignal.php`** (new dir) — **`ShouldBroadcastNow`, not
  `ShouldBroadcast`**: `QUEUE_CONNECTION=database`, so a queued signal waits for
  `queue:listen` to poll, per ICE candidate, against a consent deadline in
  single-digit seconds. It would pass tests (sync queue) and fail in `composer dev`.
  `broadcastAs()` returns `webrtc.signal` → the client listens on
  **`.webrtc.signal`** (leading dot).
- **Do not use `->toOthers()`.** It needs an `X-Socket-Id` header from an Echo
  axios interceptor guarded on `window.axios`, which this app never assigns
  (`app.tsx` imports axios as an ES module). It would be a no-op that looks like
  it works. Filter on `fromUserId !== selfUserId` in the hook instead.
- **`ConsultationRoomController`** + `PatientConsultationController` +
  `startVirtual`/`room` on the doctor controller. Routes respect
  literal-before-wildcard.

### The authorization rule — `appointments.user_id`, NOT `patients.guarantor_id`

This deliberately departs from CLAUDE.md's guarantor rule, and the reason is
verified in code:

`Patient::findOrCreateFromBooking()` (`app/Models/Patient.php:134-157`) sets
`guarantor_id` **only on creation and never updates it**. So if account A books
for patient P, then account B later books for the same P (dedup matches on name
+ contact), appointment 2 has `user_id = B` but `P.guarantor_id` is still A.
Scoping the channel on `guarantor_id` would admit **A — a stranger to that
visit — into B's live consultation**, and lock **B**, who booked it and checked
in, *out*. Exactly backwards.

The rule: **patient-scoped list resources** (LOA, labs, records) scope on
`guarantor_id` — "which people's longitudinal records may this account read?"
**Appointment-scoped resources** (check-in, cancel, and now the room) scope on
`appointments.user_id` — "may this account act on *this one visit*?" That is
already what `checkIn()`, `cancel()`, `show()` and `confirmation()` all use.

`mayJoinRoom()` has **one implementation, two call sites** (WebSocket subscribe
+ HTTP relay) and five gates: room exists and is virtual · call still open ·
note not finalized · visit not cancelled/completed/no_show · caller is one of
exactly two named accounts. **No role check** — `role:doctor` would admit every
doctor in the clinic, which is the leak this prevents. The `room_id` UUID is a
lookup key, never a secret.

*Verify:* `ConsultationChannelAuthTest`, `ConsultationSignalRelayTest`,
`ConsultationRoomAccessTest`; `channel:list` shows the channel.

---

## Step 8 — Frontend

| File | Role |
|---|---|
| `resources/js/lib/echo.ts` | lazy singleton, SSR-guarded |
| `resources/js/hooks/use-web-rtc.ts` | the hook |
| `resources/js/components/consultation-room/` | shared video UI (both roles) |
| `resources/js/pages/doctor/consultations/room/` | full-page doctor console |
| `resources/js/pages/user/consultations/` | patient join page (copy `user/loa-status/` — newest, cleanest) |
| `patient-dashboard-data.ts` + `PatientAppSidebar.tsx` | nav entry (`IconKey` union is **closed**; `ICON_MAP` needs the new key) |

**`useWebRtc` — three constraints this codebase imposes:**

- **React Compiler is on.** Never read/write `rtc.current` during render. Capture
  options (`iceServers`/`reverb`/`endpoints` come from `usePage`) into a ref and
  depend on **`[roomId]` alone** — depending on those objects rebuilds a live
  call on any parent re-render.
- **StrictMode is on.** Three real failures: `getUserMedia` resolving after the
  first cleanup (orphaned stream, camera light stays on, second mount
  `NotReadableError`); stopping tracks *after* `pc.close()` instead of before;
  `stopListening` instead of `leave` (every signal processed twice → offer
  applied twice → `InvalidStateError`). Use one ref bag so teardown is provably
  total.
- **SSR entry exists.** A module-level `new Echo(...)`, `window.Pusher = Pusher`,
  or `new RTCPeerConnection()` outside an effect kills `npm run build:ssr`.

**Symmetric `hello` handshake** (fixes correction 4): both peers POST `hello` on
subscribe; the doctor answers a `hello` with an offer. Arrival order stops
mattering, no server-side offer store. **Buffer ICE candidates** until
`setRemoteDescription` resolves — `addIceCandidate` before it throws
`InvalidStateError`, and with real-time signalling candidates routinely beat the
SDP. The spike never hit this because it was non-trickle.

Local `<video>` **must** carry `muted` — otherwise instant audio feedback, live
on stage.

*Verify:* `types:check`, **`build:ssr`** (run it *here*, not at the end —
`composer dev` never exercises it), `lint:check`, `format:check`, then a real
two-device call holding past 2:00.

---

## Step 9 — Delete the spike

`app/Http/Controllers/Spike/WebRtcSignalController.php`,
`public/webrtc-spike.html`, `routes/web.php` L34 import + L253-277.

**Only after step 8's real call succeeds** — not after step 4. If step 8 goes
sideways the spike is the only known-good reference implementation in the repo.

---

## Step 10 — Documentation (§0 protocol)

Tick §9 Phase 3 with "not in the original plan" additions the way Phases 2/4/5
do; resolve or escalate §12 risk 7 with step 4's real numbers; Change Log entry
naming the `patientHistory` fix **separately**, since it is a security fix and
not a Phase 3 feature.

Note for the parallel doc track: building this does **not** settle §5.2. Virtual
consultation is still in **none of the five graded objectives**. It should be
added to Objective 1, or the build earns no marks.

---

## Verification summary

| Gate | Command / action |
|---|---|
| Per step | `php artisan test --compact --filter=<Name>` |
| Migrations | `migrate` → `rollback` → `migrate`, clean both ways |
| Routes | `route:list --path=consultations`; `channel:list` |
| Frontend | `types:check` · **`build:ssr`** · `lint:check` · `format:check` |
| Whole phase | `composer ci:check` |
| **Manual, irreplaceable** | two devices, two networks, over **HTTPS** — doctor starts, patient joins, two-way video **held past 2:00**, hang up leaves the appointment `in_progress` and the note `draft` |

**New Pest files:** `PatientHistoryScopeTest`, `BookingConsultationTypeTest`,
`ConsultationSessionLifecycleTest`, `ConsultationChannelAuthTest`,
`ConsultationSignalRelayTest`, `ConsultationRoomAccessTest`.

`ConsultationChannelAuthTest` is the one that matters — an unauthorized
subscribe is a live audio/video leak of a medical consultation. It must assert:
the assigned doctor may join · the booking account may join · **a different
doctor may not** · a stranger account may not · a guest may not · an `ended`
call refuses both · a `finalized` note refuses both · a cancelled appointment
refuses both. Plus, per house style, one assertion against the **router/registry**
rather than HTTP.

---

## Things that will bite

1. **`getUserMedia` needs a secure context.** `localhost`/`127.0.0.1` count; a
   LAN IP like `192.168.18.3:8000` does **not** — the second device gets
   `navigator.mediaDevices is undefined`. Use the cloudflared tunnel from the
   spike work. **Single most likely thing to derail step 8's manual test.**
2. **`ShouldBroadcast` instead of `ShouldBroadcastNow`** — passes tests, fails in
   `composer dev`.
3. **Missing leading dot** on `.webrtc.signal` — listener never fires, nothing
   logs anywhere.
4. **Reverb not running** with `BROADCAST_CONNECTION=reverb` → `broadcast()`
   throws and 500s the signal endpoint. Correct loud failure; it is why the 4th
   `composer dev` process is mandatory.
5. **`/broadcasting/auth` has no `role:` middleware.** Every role decision lives
   inside `mayJoinRoom()`. Anyone adding a second channel later inherits this
   and will not be told — say so in the channel docblock.
6. **Re-minting `room_id`** while a patient is connected: silent
   never-connecting call, no error on either screen. Worse than the 1062.
