<?php

namespace App\Notifications;

use App\Models\Appointment;

class PatientCheckedInNotification extends WellcareNotification
{
    public function __construct(private readonly Appointment $appointment) {}

    public function toWellcare(object $notifiable): array
    {
        $name = trim($this->appointment->first_name.' '.$this->appointment->last_name);

        return [
            'title' => 'Patient Checked In',
            'body' => "{$name} has checked in for their {$this->appointment->appointment_time} appointment.",
            'type' => 'patient_checked_in',
            'icon' => 'user-check',
            'action_url' => '/dashboard/consultations',
            'role_hint' => 'doctor',
        ];
    }
}
