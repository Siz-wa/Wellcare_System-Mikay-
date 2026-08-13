# Two-device video consultation testing (local + cloudflared)

How to run a real doctor↔patient video call between this machine and a phone,
and what every failure looks like.

**Why a tunnel at all:** `getUserMedia` — the browser API that opens the camera
and microphone — is only available in a *secure context*. `http://192.168.x.x`
is not one, so a phone on your LAN gets no camera and no useful error, just a
black rectangle. HTTPS is not optional here; the tunnel is how you get it.

---

## 1. Start everything, in this order

### a. The Laravel stack

```bash
composer dev
```

Starts four processes: `artisan serve` (8000), `queue:listen`, **`vite`**, and
**`reverb`** (8080). Plain `php artisan serve` does **not** start Reverb, and
without Reverb the call silently never connects (see §5.1).

### b. Kill Vite — it cannot be used through a tunnel

```bash
# stop the vite process, then:
rm public/hot
npm run build
```

`npm run dev` writes `public/hot`, and while that file exists Laravel points
every asset at `http://[::1]:5173` — an address the phone cannot route to and the
tunnel origin cannot load cross-origin. **Deleting `public/hot` is what switches
the app back to built assets.**

The cost: no hot reload. Every frontend change now needs `npm run build` before
either device sees it.

### c. Two tunnels

```bash
cloudflared tunnel --url http://127.0.0.1:8000    # the site
cloudflared tunnel --url http://127.0.0.1:8080    # Reverb (the WebSocket)
```

Two, not one. The site and the WebSocket server are separate listeners on
separate ports, and the browser connects to both directly.

Each prints a fresh `https://<random-words>.trycloudflare.com`. **They change
every restart** — that is the single biggest source of lost time here.

### d. Point `.env` at the Reverb tunnel

```dotenv
REVERB_HOST=<the 8080 tunnel host, no https://, no trailing slash>
REVERB_PORT=443
REVERB_SCHEME=https
```

Then:

```bash
php artisan config:clear
```

No rebuild needed — `REVERB_HOST` is read server-side per request and handed to
the page as an Inertia prop, not baked into the bundle.

`REVERB_SERVER_HOST=0.0.0.0` / `REVERB_SERVER_PORT=8080` stay as they are: those
are what Reverb *binds*, the ones above are what the *browser dials*.

### e. Open a room

```bash
php artisan tinker --execute '
$a = App\Models\Appointment::find(106);
$a->update(["status" => "checked_in"]);
app(App\Services\ConsultationSessionService::class)->openVirtualRoom($a->fresh(), $a->doctor);
'
```

Or just press **Start Video** on the doctor's consultations page. The
appointment must be `virtual` and `checked_in`/`in_progress`.

---

## 2. Verify before you touch a device

Two commands catch almost every misconfiguration in under ten seconds.

**Is the site serving built assets?**

```bash
curl -s https://<site-tunnel>/login | grep -o 'src="[^"]*"' | head
```

Want `/build/assets/…`. If you see `[::1]:5173`, `public/hot` still exists —
back to §1b.

**Does the WebSocket actually complete a handshake?**

```bash
curl -s -i -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://<reverb-tunnel>/app/<REVERB_APP_KEY>?protocol=7&client=js&version=8.4.0"
```

Want `HTTP/1.1 101 Switching Protocols` and a `pusher:connection_established`
frame. Anything else means the call cannot connect, whatever the UI says.

---

## 3. Both devices

Log in as the doctor on the PC, the patient on the phone.

**Hard-reload both after every `npm run build`.** A stale cached bundle on the
phone is indistinguishable from a broken feature, and it has cost more than one
round of testing here.

| | doctor | patient |
|---|---|---|
| URL | `/doctor/consultations/<id>/room` | `/user/consultations/<id>` |

Allow camera and microphone on both. On iOS this must be Safari.

---

## 4. Reading the phone's console without touching the phone

Laravel Boost ships browser console output to the server. Ask Claude for
`browser-logs`, or read `storage/logs/`. This is how the SDP-trimming defect was
found; nothing needs to be copied off the device.

The diagnostic line to look for is `consultation audio` — it reports the actual
capture device and which audio constraints the browser really applied, rather
than the ones that were requested.

---

## 5. Failure symptoms, by what you see

### 5.1 Both sides sit on "Waiting for the other person"

Everything looks healthy, no console errors, nothing in `laravel.log`.

**Reverb is not reachable.** With no WebSocket the private channel never
subscribes, the announcing `hello` is never sent, and neither peer learns the
other exists. Every layer honestly reports success.

Check in this order:

1. Is Reverb running? `netstat -an | grep 8080`
2. Is the 8080 tunnel running, and is `REVERB_HOST` *that* tunnel?
3. `php artisan config:clear` after editing `.env`
4. The §2 handshake command

The client now says **"Cannot reach the consultation server"** when the socket
cannot connect at all. If you see plain "Waiting" instead, the socket *is*
connecting and the fault is elsewhere.

### 5.2 CORS errors, `net::ERR_FAILED`, `ERR_NO_BUFFER_SPACE`

```
Access to script at 'http://[::1]:5173/@react-refresh' … blocked by CORS policy
```

Vite is running. §1b.

### 5.3 Black video, or no permission prompt

Not a secure context, or permission was denied. Check the URL is `https://` — the
room shows a warning banner if it is not. On Android, permission denied once is
remembered; clear it in site settings.

### 5.4 419 on `/consultations/rooms/…/signal`

A stale CSRF token. The room takes its token from an Inertia prop precisely to
avoid this, so if it recurs, the prop is missing — check the page props include
`csrfToken`.

### 5.5 "Connecting" forever, with local video working

Signalling is reaching the server but the peers are not agreeing. Check the
network log for `offer` → `answer` → several `ice-candidate` posts. If the offer
is there but no answer, the other side is not subscribed to the channel.

If both sides are on mobile data behind carrier-grade NAT, a STUN-only setup can
genuinely fail — that needs a TURN server (`webrtc.turn_urls`).

### 5.5a "Cross-network" is not the point — read the candidate pair

The room shows the selected ICE candidate pair next to the call timer, e.g.
`24:12 · srflx ⇄ srflx (udp)`. That readout, not which network you *think* you
are on, is what says whether NAT traversal was actually exercised:

| Readout | Meaning |
|---|---|
| `host ⇄ host` | Same LAN. No NAT was traversed — a hold test on this proves nothing |
| `srflx ⇄ srflx` | **Both peers behind NAT, connected directly via STUN.** The run you want |
| `relay` | STUN failed; traffic is going through TURN |

**The trap:** tethering the PC to the phone's hotspot puts both devices on the
same LAN and yields `host ⇄ host`. Two genuinely separate WiFi networks give two
public IPs and a real `srflx ⇄ srflx`.

Two WiFi networks does **not** cover mobile data. Carriers use carrier-grade
NAT, which is where STUN most often fails and TURN stops being optional — worth
its own run, since patients will be on it.

### 5.6 A screeching or howling noise

The two devices are within earshot of each other. Speaker A → microphone B →
back to A, gaining each lap.

This is **not** fixable in code: echo cancellation subtracts a device's *own*
output from its *own* microphone, and this sound arrives through the air from a
second device it has no reference for. Move them apart, use headphones, or press
**Mute speaker**.

### 5.7 A frontend change is not showing up

`npm run build`, then hard-reload. There is no hot reload in this setup.

---

## 6. Test checklist

**Server-side, no devices needed:**

```bash
php artisan test --compact --filter=Consultation

# the stale-room sweep — backdate whatever is open, then sweep
php artisan tinker --execute '
App\Models\ConsultationSession::whereIn("consultation_status", ["waiting", "active"])
    ->update(["started_at" => now()->subHours(9)]);
'
php artisan consultations:close-stale
```

The sweep reports how many it closed. It only ever targets **open, virtual**
rooms older than the cutoff — if it says `0`, nothing matched, most often
because the rooms are `waiting` rather than `active`. The command above
backdates both states, which is why it is written that way.

**Two devices — none of this is reachable by the test suite:**

1. Both join. Video and audio both ways.
2. Mute the phone → red **Muted** badge on the PC. Camera off → the frame is
   replaced by "Camera off", not frozen.
3. Refresh the phone → the PC drops to "Waiting" immediately, then reconnects.
   Not a frozen frame.
4. Tap a sidebar link mid-call → a confirmation appears; cancelling keeps the
   call up.
5. Patient presses End Call → confirmation → they exit, the doctor sees them
   leave, the room stays open, they rejoin from the list.
6. Doctor presses End Call → confirmation offering **Finalize & end** or **End,
   keep draft**. Both close the room for the patient.
7. Kill wifi on one device for ~5s → both show reconnecting, then recover
   without rejoining.
8. Camera and microphone indicators go **off** on every exit path.
9. Type SOAP notes, kill the browser, reopen → the notes survived (autosave).

---

## 7. When the tunnels restart

The URLs change. Every time:

1. New site URL → reopen on both devices.
2. New Reverb URL → `REVERB_HOST` in `.env`, then `php artisan config:clear`.

Skipping step 2 produces §5.1 exactly, and it looks like a code regression.
