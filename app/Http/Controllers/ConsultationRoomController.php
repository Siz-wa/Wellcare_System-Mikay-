<?php

namespace App\Http\Controllers;

use App\Events\WebRtcSignal;
use App\Models\ConsultationSession;
use App\Services\ConsultationSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * The signalling relay and call-state endpoints shared by both peers.
 *
 * Deliberately NOT under `Doctor\` or `Patient\`: the doctor and the patient
 * are symmetric participants once a call is up, and duplicating these three
 * actions per role would duplicate the authorization with them. There is no
 * `role:` middleware on this controller for the same reason a role check is
 * absent from routes/channels.php — `role:doctor` would admit every doctor in
 * the clinic. Authorization is `ConsultationSessionService::mayJoinRoom()`,
 * the same call the WebSocket subscribe makes.
 *
 * The server never parses SDP or inspects a candidate. It checks who is asking
 * and forwards an opaque payload.
 */
class ConsultationRoomController extends Controller
{
    /**
     * Payloads above this go by reference instead of over the socket.
     *
     * Hosted Pusher refuses any event whose data exceeds 10KB, and an SDP offer
     * with a full codec list and trickled candidates is routinely 7–9KB before
     * the event envelope and JSON re-escaping are added. 4KB leaves every ICE
     * candidate, `state` and `hello` on the socket and sends offers and answers
     * by reference — on Reverb too, so local testing exercises the same path
     * production takes.
     */
    private const STASH_THRESHOLD_BYTES = 4096;

    /**
     * Long enough for a slow phone to fetch, short enough that an abandoned
     * offer does not sit in the cache table.
     */
    private const STASH_TTL_SECONDS = 120;

    public function __construct(private ConsultationSessionService $sessions) {}

    /**
     * Relay one signalling message to the other peer.
     *
     * Every message type comes through here and the payload is passed through
     * untouched. Two of them are not WebRTC at all:
     *
     *  - `state` carries the sender's mic and camera on/off, so the other side
     *    shows a muted badge instead of wondering whether the call is broken.
     *  - `peer-left` is the client's own `pagehide` beacon. It says "the
     *    connection you are holding is dead", NOT "the room is closed" — React
     *    does not run effect cleanups on unload, so before this a refresh left
     *    the other party on a frozen frame for the ~30 seconds it takes ICE
     *    consent to expire. Deliberately distinct from `bye`, which does close
     *    the room and which no client may forge: it is only ever emitted by
     *    ConsultationSessionService::endCall().
     */
    public function signal(Request $request, string $roomId): JsonResponse
    {
        $session = $this->authorizeRoom($roomId);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:hello,offer,answer,ice-candidate,bye,state,peer-left'],
            // A full SDP with a trickled candidate set runs to a few KB. The
            // ceiling is a sanity bound, not a protocol constraint.
            'payload' => ['present', 'array'],
        ]);

        $payload = $validated['payload'];
        $ref = null;

        if (strlen((string) json_encode($payload)) > self::STASH_THRESHOLD_BYTES) {
            $ref = (string) Str::uuid();
            Cache::put(self::stashKey($session->room_id, $ref), $payload, self::STASH_TTL_SECONDS);
            $payload = [];
        }

        broadcast(new WebRtcSignal(
            roomId: $session->room_id,
            type: $validated['type'],
            payload: $payload,
            fromUserId: (int) Auth::id(),
            ref: $ref,
        ));

        return response()->json(['sent' => true]);
    }

    /**
     * Hand a peer the payload of a signal that was too large to broadcast.
     *
     * Same gate as the relay, and the stash key is scoped to the room, so a ref
     * from one consultation cannot be redeemed through another. Not pulled on
     * read: a peer whose fetch drops on a network blip may ask again, and the
     * TTL clears it either way.
     */
    public function fetchSignal(string $roomId, string $ref): JsonResponse
    {
        $session = $this->authorizeRoom($roomId);

        $payload = Cache::get(self::stashKey($session->room_id, $ref));

        abort_if($payload === null, 404, 'This signal has expired.');

        return response()->json(['payload' => $payload]);
    }

    private static function stashKey(string $roomId, string $ref): string
    {
        return "webrtc-signal:{$roomId}:{$ref}";
    }

    /**
     * Both peers are connected — flip `waiting` to `active`.
     *
     * Idempotent, because an ICE restart (§12 risk 7) re-runs it on every
     * successful reconnect.
     */
    public function join(string $roomId): JsonResponse
    {
        $session = $this->authorizeRoom($roomId);

        $this->sessions->markActive($session);

        return response()->json(['status' => 'active']);
    }

    /**
     * Leave the call.
     *
     * What that means depends on who is asking, and the service owns that rule:
     * the doctor ending closes the consultation, a patient leaving only returns
     * the room to `waiting` so they can rejoin. Either way the broadcast is the
     * service's job now — keeping it here meant `finalize()`, which ends a call
     * through a different door, notified nobody.
     *
     * Never finalizes the note and never completes the appointment. A hang-up, a
     * refresh and a dropped connection are indistinguishable at this layer, and
     * none of them is evidence the consultation was documented.
     */
    public function leave(string $roomId): JsonResponse
    {
        $session = $this->authorizeRoom($roomId);

        $session = $this->sessions->leaveRoom($session, Auth::user());

        return response()->json(['status' => $session->consultation_status]);
    }

    /**
     * The single gate for every action above.
     *
     * 403 rather than 404 on an unknown room is deliberate and costs nothing:
     * mayJoinRoom() already refuses rooms that do not exist, and returning a
     * different status for "no such room" would turn this endpoint into an
     * oracle for probing which room ids are real.
     */
    private function authorizeRoom(string $roomId): ConsultationSession
    {
        abort_unless(
            $this->sessions->mayJoinRoom(Auth::user(), $roomId),
            403,
            'You are not a participant in this consultation.',
        );

        return ConsultationSession::where('room_id', $roomId)->firstOrFail();
    }
}
