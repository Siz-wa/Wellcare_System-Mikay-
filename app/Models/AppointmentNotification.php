<?php

namespace App\Models;

use App\Events\NotificationCreated;
use App\Jobs\DeliverNotification;
use Illuminate\Database\Eloquent\Builder;
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
        'read_at',
        'acknowledged_at',
        'acknowledged_by',
    ];

    protected $casts = [
        'read' => 'boolean',
        'read_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'escalated_at' => 'datetime',
        'escalation_count' => 'integer',
    ];

    /**
     * Types a clinician must explicitly accept, not merely open.
     *
     * Only the critical lab value. Requiring acknowledgement of routine
     * notifications would make the gesture meaningless — a click people perform
     * without reading, which is precisely the alert fatigue that makes the one
     * alert that mattered invisible.
     *
     * @var array<int, string>
     */
    public const REQUIRES_ACKNOWLEDGEMENT = ['lab_critical'];

    /**
     * How long an unacknowledged critical result waits before being re-raised.
     *
     * Fifteen minutes is a judgement, not a standard: long enough that a doctor
     * mid-consultation is not interrupted twice over the same result, short
     * enough that a result nobody picked up does not sit until the end of
     * clinic. The clinic should be asked to confirm it.
     */
    public const ESCALATE_AFTER_MINUTES = 15;

    /**
     * Stop re-raising after this many escalations.
     *
     * Unbounded escalation trains people to mute the one channel that must not
     * be muted. After this the alert stays visible on the dashboard as
     * outstanding, which is a different and quieter kind of pressure.
     */
    public const MAX_ESCALATIONS = 3;

    public function acknowledger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function requiresAcknowledgement(): bool
    {
        return in_array($this->type, self::REQUIRES_ACKNOWLEDGEMENT, true);
    }

    public function isAcknowledged(): bool
    {
        return $this->acknowledged_at !== null;
    }

    /**
     * Mark this notification as explicitly accepted by a clinician.
     *
     * Idempotent: the FIRST acknowledgement is the one that counts, because it
     * is the one that answers "how long was this result unattended". A later
     * click must not overwrite it and make the response look faster than it was.
     */
    public function acknowledge(User $user): void
    {
        if ($this->isAcknowledged()) {
            return;
        }

        $this->forceFill([
            'acknowledged_at' => now(),
            'acknowledged_by' => $user->id,
            'read' => true,
            'read_at' => $this->read_at ?? now(),
        ])->save();
    }

    /**
     * Unacknowledged critical results that are due to be re-raised.
     *
     * @param  Builder<self>  $query
     */
    public function scopeAwaitingAcknowledgement($query): void
    {
        $query->whereIn('type', self::REQUIRES_ACKNOWLEDGEMENT)
            ->whereNull('acknowledged_at')
            ->where('escalation_count', '<', self::MAX_ESCALATIONS)
            ->where('created_at', '<=', now()->subMinutes(self::ESCALATE_AFTER_MINUTES));
    }

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
                // A submitted remittance is only actionable on the
                // verification queue; the dashboard has no decide buttons.
                'payment_submitted', 'refund_due' => '/hr/payment-verifications',
                'contact_message' => '/admin/messages',
                default => in_array('admin', $roles, true) ? '/admin/dashboard' : '/hr/dashboard',
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
            // The settlement page is where the patient can actually pay or
            // correct a rejected reference. The dashboard shows the
            // appointment but has no way to act on the fee.
            'payment_due', 'payment_verified', 'payment_rejected' => '/user/payments',
            default => '/user/dashboard',
        };
    }

    /**
     * The one gate for the "in-app notifications" switches on
     * settings/notifications.
     *
     * It lives here rather than in the callers because there are eleven
     * ::create() call sites across four services and three controllers, and a
     * preference honoured in ten of them is worse than no preference at all —
     * the user turns a category off, still gets some of it, and reasonably
     * concludes the setting is broken.
     *
     * Returning false from `creating` aborts the insert. Nothing in this
     * codebase uses the return value of AppointmentNotification::create(), so
     * the unsaved model handed back is never read; the notification simply is
     * not delivered, which is what the switch means.
     */
    protected static function booted(): void
    {
        static::creating(function (AppointmentNotification $notification): ?bool {
            // Task 1.2 — outbound delivery is dispatched HERE rather than from
            // `created`, and the ordering matters.
            //
            // This hook returns false to abort the insert when the in-app
            // channel is off. If email and SMS hung off `created` they would be
            // cancelled by that abort — so unticking "in-app appointments"
            // would silently stop the cancellation email too, even though the
            // settings screen presents the channels as independent. Dispatching
            // first keeps each channel answerable only to its own switch.
            //
            // The job carries values rather than a model id, because the row it
            // was built from may be about to not exist.
            $notification->dispatchOutboundDelivery();

            return NotificationPreference::allows($notification->user_id, 'inapp', $notification->type)
                ? null
                : false;
        });

        // Tell the recipient's open tabs to refresh their bell. Only after the
        // row exists, so a muted in-app channel (aborted insert) stays silent.
        // Queued, and a failure only costs the live refresh: the bell still
        // updates on the next page load, so it must never fail the write.
        static::created(function (AppointmentNotification $notification): void {
            try {
                NotificationCreated::dispatch($notification->user_id, $notification->id, (string) $notification->type);
            } catch (\Throwable $e) {
                report($e);
            }
        });
    }

    /**
     * Queue email and SMS delivery for this notification.
     *
     * Reads the contact details off the appointment rather than the account:
     * the appointment carries the number the patient actually gave for this
     * visit, and a guest booking has no account at all. `user_id` is still
     * passed so the job can honour that account's preferences when there is one.
     */
    private function dispatchOutboundDelivery(): void
    {
        $appointment = $this->appointment_id
            ? Appointment::find($this->appointment_id)
            : null;

        DeliverNotification::dispatch(
            userId: $this->user_id,
            type: (string) $this->type,
            subject: (string) $this->subject,
            body: (string) $this->body,
            contactNumber: $appointment?->contact_number,
            email: $appointment?->email,
        );
    }
}
