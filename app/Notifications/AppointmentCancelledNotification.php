<?php

namespace App\Notifications;

use App\Models\Appointment;

class AppointmentCancelledNotification extends WellcareNotification
{
    public function __construct(
        private readonly Appointment $appointment,
        private readonly string $reason = ''
    ) {}

    public function toWellcare(object $notifiable): array
    {
        return [
            'title' => 'Appointment Cancelled',
            'body' => "Your appointment on {$this->appointment->appointment_date->format('M j, Y')} has been cancelled.".($this->reason ? " Reason: {$this->reason}" : ''),
            'type' => 'appointment_cancelled',
            'icon' => 'x-circle',
            'action_url' => '/book',
            'role_hint' => 'user',
        ];
    }
}
