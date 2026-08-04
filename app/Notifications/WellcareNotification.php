<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

abstract class WellcareNotification extends Notification
{
    use Queueable;

    /**
     * Return the structured payload for this notification.
     *
     * @return array{
     *   title: string,
     *   body: string,
     *   type: string,
     *   icon: string,
     *   action_url: string|null,
     *   role_hint: string|null,
     * }
     */
    abstract public function toWellcare(object $notifiable): array;

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return $this->toWellcare($notifiable);
    }
}
