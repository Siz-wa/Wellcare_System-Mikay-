<?php
namespace App\Notifications;
 
use App\Models\Appointment;
 
class AppointmentRequestedNotification extends WellcareNotification
{
    public function __construct(private readonly Appointment $appointment) {}
 
    public function toWellcare(object $notifiable): array
    {
        $name = trim($this->appointment->first_name . ' ' . $this->appointment->last_name);
        return [
            'title'      => 'New Appointment Request',
            'body'       => "{$name} requested an appointment on {$this->appointment->appointment_date->format('M j, Y')} at {$this->appointment->appointment_time}.",
            'type'       => 'appointment_requested',
            'icon'       => 'calendar',
            'action_url' => '/doctor/appointments',
            'role_hint'  => 'admin',
        ];
    }
}
 