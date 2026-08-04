<?php

use App\Models\User;
use App\Services\ConsultationSessionService;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * The consultation room — the security boundary for the whole virtual
 * consultation feature (WELLCARE-BUILD-PLAN.md §9 Phase 3).
 *
 * An unauthorized subscribe is a live audio and video leak of a medical
 * consultation, so the rule is stated exactly once, in
 * ConsultationSessionService::mayJoinRoom(), and used by BOTH this WebSocket
 * subscribe and the HTTP signal relay in ConsultationRoomController. Two copies
 * would eventually become one copy someone forgot to patch.
 *
 * `/broadcasting/auth` runs on the `web` middleware group only — there is no
 * `role:` middleware in front of this callback, and there deliberately is not
 * one inside it either. `role:doctor` answers "is this user a doctor?", never
 * "is this user *this consultation's* doctor?", and would admit every doctor in
 * the clinic to every room. Every check that matters is identity-based and
 * lives in mayJoinRoom().
 *
 * Anyone adding a second private channel to this file inherits the missing
 * `role:` middleware and will not be warned by anything else — do the
 * authorization inside the callback.
 */
/**
 * A **presence** channel, and the return type is the whole difference.
 *
 * A private channel answers only "may you subscribe". Presence additionally
 * tells every member who else is on the channel and — the reason for the change
 * — fires `leaving` the instant a member's socket drops.
 *
 * That is the only mechanism that catches a force-quit browser. A closed tab
 * runs no JavaScript, so it can send no goodbye, and the other peer was left
 * waiting out ICE's ~30-second consent timeout in front of a frozen frame.
 * Reverb notices the dropped socket in under a second.
 *
 * **An array is authorization; `false` is refusal.** Returning `true` here would
 * be a subtle failure: Laravel treats any truthy value as authorized, so the
 * subscribe succeeds, but the member payload is useless and `here`/`joining`
 * carry nothing the client can identify a peer by.
 *
 * The gate itself is unchanged and still lives in exactly one place —
 * mayJoinRoom(), shared with the HTTP relay.
 *
 * @return array{id: int, name: string}|false
 */
Broadcast::channel(
    'consultation.{roomId}',
    function (User $user, string $roomId): array|false {
        if (! app(ConsultationSessionService::class)->mayJoinRoom($user, $roomId)) {
            return false;
        }

        // Deliberately minimal. Whatever is returned here is broadcast to every
        // other member of the channel, so this is a disclosure boundary, not a
        // convenience payload — a room member is entitled to know who else is in
        // the consultation with them and nothing further.
        return ['id' => (int) $user->id, 'name' => (string) $user->name];
    },
);
