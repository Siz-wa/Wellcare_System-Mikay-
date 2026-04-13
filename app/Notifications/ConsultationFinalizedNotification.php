<?php
namespace App\Notifications;
 
use App\Models\Appointment;
 
class ConsultationFinalizedNotification extends WellcareNotification
{
    public function __construct(private readonly Appointment $appointment) {}
 
    public function toWellcare(object $notifiable): array
    {
        return [
            'title'      => 'Consultation Complete',
            'body'       => "Your consultation on {$this->appointment->appointment_date->format('M j, Y')} has been completed. Thank you for visiting Wellcare.",
            'type'       => 'consultation_finalized',
            'icon'       => 'clipboard-check',
            'action_url' => '/user/dashboard',
            'role_hint'  => 'user',
        ];
    }
}