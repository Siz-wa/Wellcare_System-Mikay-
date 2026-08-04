<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * One WebRTC signalling message relayed between the two peers in a consultation
 * room.
 *
 * The server is a dumb pipe here: it never parses SDP and never inspects an ICE
 * candidate. What it does own is *who is allowed on the channel*, and that
 * lives in routes/channels.php.
 *
 * **ShouldBroadcastNow, not ShouldBroadcast.** `QUEUE_CONNECTION=database` in
 * this app, so a queued broadcast would sit in the jobs table until
 * `queue:listen` next polls — hundreds of milliseconds to seconds, per ICE
 * candidate, against a handshake whose consent-freshness deadline is measured
 * in single-digit seconds (§12 risk 7). The trap is that it would look fine in
 * the test suite, where QUEUE_CONNECTION is `sync`, and fail only under
 * `composer dev`.
 *
 * `broadcastAs()` renames the event, which means the client must listen on
 * **`.webrtc.signal`** with a leading dot. Without it Echo prepends the
 * application namespace, the listener never fires, and nothing is logged
 * anywhere on either side.
 *
 * `->toOthers()` is deliberately not used. It depends on an `X-Socket-Id`
 * header injected by an Echo axios interceptor that registers only when
 * `window.axios` is set; this app imports axios as an ES module in app.tsx and
 * never assigns the global, so `toOthers()` would silently be a no-op that
 * looks like it works. Every peer receives every message and the hook drops
 * anything where `fromUserId` is its own id.
 */
final class WebRtcSignal implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    /**
     * @param  'hello'|'offer'|'answer'|'ice-candidate'|'bye'  $type
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly string $roomId,
        public readonly string $type,
        public readonly array $payload,
        public readonly int $fromUserId,
    ) {}

    /**
     * **Presence, and this must move in lockstep with two other files.**
     *
     * `routes/channels.php` and `useWebRtc`'s subscribe call have to agree with
     * this one. Laravel registers `consultation.{roomId}` once and resolves both
     * `private-consultation.X` and `presence-consultation.X` to the same
     * authorization callback, so a half-converted state authorizes correctly and
     * then delivers nothing — the client is listening on one channel name while
     * the server publishes to another. Nothing is logged on either side, which
     * is the same silent-failure shape that cost this feature three debugging
     * cycles already.
     */
    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("consultation.{$this->roomId}");
    }

    public function broadcastAs(): string
    {
        return 'webrtc.signal';
    }

    /**
     * roomId is deliberately absent: a subscriber already knows which room it
     * joined, and echoing it back would invite clients to trust the payload
     * over their own subscription.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'payload' => $this->payload,
            'fromUserId' => $this->fromUserId,
        ];
    }
}
