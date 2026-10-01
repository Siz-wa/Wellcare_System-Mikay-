<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A new row in someone's notification bell.
 *
 * Carries only ids and the type: the browser answers it by reloading the
 * `notifications` and `unreadCount` props, which go through the same scoping
 * as any page load. Nothing clinical travels over the socket.
 *
 * Before this, Reverb carried only video-call signalling and the bell (and
 * every dashboard count) changed only when the user navigated.
 */
class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public int $notificationId,
        public string $type,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('App.Models.User.'.$this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * @return array{id: int, type: string}
     */
    public function broadcastWith(): array
    {
        return ['id' => $this->notificationId, 'type' => $this->type];
    }
}
