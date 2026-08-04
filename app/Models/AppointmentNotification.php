<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentNotification extends Model
{
    protected $fillable = [
        'appointment_id',
        'user_id',
        'type',
        'subject',
        'body',
        'read',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Where clicking this notification should take this user.
     *
     * **The one implementation, deliberately on the model.** It lived in
     * HandleInertiaRequests, and PatientDashboardController — which builds its
     * own notification payload and so overrides the shared prop entirely — set
     * `'action_url' => null` instead. Every notification on the patient
     * dashboard was therefore a dead click, and fixing the middleware's routing
     * changed nothing there, because the middleware's value never reached that
     * page.
     *
     * Anything that hands notifications to the bell must call this. A second
     * copy of the routing is a second thing to forget, and the failure is
     * silent: a null URL simply does nothing when clicked.
     */
    public function actionUrlFor(User $user): string
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('doctor', $roles, true)) {
            return match ($this->type) {
                // A recorded or critical result is only actionable on the review
                // page — the appointment list would bury the thing the
                // notification is about.
                'lab_recorded', 'lab_critical' => '/doctor/lab-reviews',
                default => '/doctor/appointments',
            };
        }

        if (in_array('hr', $roles, true) || in_array('admin', $roles, true)) {
            return match ($this->type) {
                'hmo_submitted', 'hmo_approved', 'hmo_rejected' => '/hr/hmo-approvals',
                default => '/hr/dashboard',
            };
        }

        // Nurses only have the one workspace.
        if (in_array('nurse', $roles, true)) {
            return '/nurse/lab-queue';
        }

        return match ($this->type) {
            // The most time-critical notification in the app: a doctor is
            // sitting in a video room waiting. It had no case at all, so it fell
            // through to the dashboard — which has no join button — and the
            // patient's only route in was to find the consultations page
            // themselves while the doctor waited.
            'consultation_started' => '/user/consultations',
            default => '/user/dashboard',
        };
    }
}
