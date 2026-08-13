<?php

namespace App\Notifications;

use App\Models\Appointment;

class AppointmentConfirmedNotification extends WellcareNotification
{
    public function __construct(private readonly Appointment $appointment) {}

    public function toWellcare(object $notifiable): array
    {
        return [
            'title' => 'Appointment Confirmed',
            'body' => "Your appointment on {$this->appointment->appointment_date->format('M j, Y')} at {$this->appointment->appointment_time} has been confirmed. You may check in on the day.",
            'type' => 'appointment_confirmed',
            'icon' => 'check-circle',
            'action_url' => '/user/dashboard',
            'role_hint' => 'user',
        ];
    }
}
