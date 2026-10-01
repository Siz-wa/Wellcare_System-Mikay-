<?php

namespace App\Http\Middleware;

use App\Models\AppointmentNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

/**
 * HandleInertiaRequests
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads notifications from appointment_notifications table — the ONLY active
 * notification table in this project. The Laravel Notifiable (notifications)
 * table is NOT used; all writes go through AppointmentNotification::create().
 */
class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $shared = parent::share($request);

        $user = Auth::user();
        $notifications = [];
        $unreadCount = 0;
        $unacknowledgedCritical = 0;

        if ($user) {
            $rows = AppointmentNotification::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(15)
                ->get();

            $notifications = $rows->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->subject,
                'body' => $n->body,
                'icon' => $this->iconForType($n->type),
                'action_url' => $n->actionUrlFor($user),
                'role_hint' => null,
                'read' => (bool) $n->read,
                // Task 1.3 — a critical result is not finished when it is read.
                // The bell needs both facts to show an Acknowledge action on the
                // rows that still require one.
                'requires_acknowledgement' => $n->requiresAcknowledgement(),
                'acknowledged' => $n->isAcknowledged(),
                'time' => $n->created_at->diffForHumans(),
                'created_at' => $n->created_at->toISOString(),
            ])->toArray();

            $unreadCount = AppointmentNotification::where('user_id', $user->id)
                ->where('read', false)
                ->count();

            // Counted separately from `unreadCount` on purpose: an
            // unacknowledged critical result is outstanding clinical work, not
            // an unread message, and a doctor who has cleared their bell should
            // still see it. Kept as its own prop so the UI can show it
            // differently rather than adding to a number that means "new".
            $unacknowledgedCritical = AppointmentNotification::where('user_id', $user->id)
                ->whereIn('type', AppointmentNotification::REQUIRES_ACKNOWLEDGEMENT)
                ->whereNull('acknowledged_at')
                ->count();
        }

        return array_merge($shared, [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    // Doctor name comes from DoctorProfile::display_name
                    // Patient/HR name comes from PatientProfile
                    // Fall through all relationships until we find a name
                    'first_name' => $this->resolveFirstName($user),
                    'last_name' => $this->resolveLastName($user),
                    'roles' => $user->getRoleNames()->toArray(),
                    // GV-2. Shared so a sidebar can hide what the account
                    // cannot open. The routes are gated `permission:` per
                    // capability, so an owner browsing the admin module was
                    // being offered Manage Patients, Archive and Staff &
                    // Credentials — all four of which 403 for that tier by
                    // design. Found in the 2026-09-11 walkthrough (OB-02).
                    //
                    // Display only. Every one of these is enforced server-side
                    // by the route middleware; hiding a link is a courtesy, not
                    // a control.
                    'permissions' => $user->getAllPermissions()
                        ->pluck('name')
                        ->values()
                        ->toArray(),
                    // The signed-in doctor's own headshot, for the topbar chip.
                    // Null for every other role — nothing but a doctor profile
                    // stores a photograph.
                    'photo_url' => $this->resolvePhotoUrl($user),
                    // types/auth.ts has always declared this as non-optional on
                    // the shared User, and it was never actually shared — so
                    // `auth.user.email_verified_at === null` (the guard on the
                    // profile page's "your email is unverified" banner) compared
                    // undefined to null and was false for everyone. The banner
                    // could not appear for any account.
                    'email_verified_at' => $user->email_verified_at?->toISOString(),
                ] : null,
            ],
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            // Where the bell listens for "you have a new notification". The
            // browser-facing Reverb address, never the server's internal one.
            // Null for guests, and when broadcasting is off.
            'realtime' => $user && config('broadcasting.default') === 'reverb' ? [
                'key' => config('reverb.apps.apps.0.key'),
                'host' => config('reverb.apps.apps.0.options.host'),
                'port' => (int) config('reverb.apps.apps.0.options.port'),
                'scheme' => config('reverb.apps.apps.0.options.scheme'),
            ] : null,
            'unacknowledgedCritical' => $unacknowledgedCritical,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                // Task 1.1 — the drug-allergy conflicts a refused prescription
                // matched. Shared here rather than as a page prop because the
                // refusal comes back through `back()`, which re-renders whatever
                // page the doctor was on rather than a controller that could
                // pass it explicitly.
                'allergyConflicts' => $request->session()->get('allergyConflicts'),
            ],
        ]);
    }

    /**
     * The signed-in doctor's photograph, published or not.
     *
     * Deliberately the private `settings.professional.photo` route rather than
     * the public `doctors.photo` one. Those answer different questions: the
     * public route asks "may a patient see this?" and 404s until the doctor has
     * consented AND is published, while the header is the doctor looking at
     * their own account. A doctor whose consent is off, or who an administrator
     * has unpublished, still uploaded that file and should still recognise
     * themselves in the corner of their own dashboard.
     *
     * The `?v=` token is what lets DoctorPhotoStorage cache the response for a
     * day: a replacement photo is a different URL, so nothing has to expire for
     * the new one to appear.
     *
     * The role is checked rather than assumed from the relation: that route is
     * gated `role:doctor`, so handing the URL to an account that has kept a
     * roster row after losing the role would render a broken image instead of
     * the initials it should fall back to.
     */
    private function resolvePhotoUrl(User $user): ?string
    {
        $profile = $user->doctorProfile;

        if ($profile === null || blank($profile->photo_path) || ! $user->hasRole('doctor')) {
            return null;
        }

        return route('settings.professional.photo', ['v' => $profile->photoVersion()]);
    }

    private function resolveFirstName(User $user): string
    {
        // Doctors: DoctorProfile.display_name = "Dr. Bettina Limson"
        // Skip the "Dr." prefix — return given name only (e.g. "Bettina")
        $dp = $user->doctorProfile ?? null;
        if ($dp && $dp->display_name) {
            // Strip "Dr." / "Dra." prefix, take the remaining name parts
            $name = preg_replace('/^Dr[a]?\.\s*/i', '', $dp->display_name);
            $parts = explode(' ', trim($name));

            return $parts[0] ?? $dp->display_name;
        }
        if ($user->profile?->first_name) {
            return $user->profile->first_name;
        }
        if ($user->patientProfile?->first_name) {
            return $user->patientProfile->first_name;
        }
        $parts = explode(' ', $user->name ?? '', 2);

        return $parts[0] ?? '';
    }

    private function resolveLastName(User $user): string
    {
        $dp = $user->doctorProfile ?? null;
        if ($dp && $dp->display_name) {
            $name = preg_replace('/^Dr[a]?\.\s*/i', '', $dp->display_name);
            $parts = explode(' ', trim($name));
            // Everything after the first name = last name
            array_shift($parts);

            return implode(' ', $parts);
        }
        if ($user->profile?->last_name) {
            return $user->profile->last_name;
        }
        if ($user->patientProfile?->last_name) {
            return $user->patientProfile->last_name;
        }
        $parts = explode(' ', $user->name ?? '', 2);

        return $parts[1] ?? '';
    }

    private function iconForType(string $type): string
    {
        return match ($type) {
            'confirmed' => 'check-circle',
            'cancelled' => 'x-circle',
            'checked_in' => 'user-check',
            'consultation_started' => 'video',
            'consultation_done' => 'clipboard-check',
            'hmo_submitted' => 'calendar',
            'hmo_approved' => 'check-circle',
            'hmo_rejected' => 'x-circle',
            'lab_requested' => 'flask',
            'lab_recorded' => 'flask',
            'lab_critical' => 'alert-triangle',
            'lab_reviewed' => 'clipboard-check',
            'payment_due' => 'credit-card',
            'payment_submitted' => 'credit-card',
            'payment_verified' => 'check-circle',
            'payment_rejected' => 'x-circle',
            'refund_due' => 'credit-card',
            'rescheduled' => 'calendar',
            'contact_message' => 'mail',
            default => 'calendar',
        };
    }

    // Notification routing lives on AppointmentNotification::actionUrlFor().
    // It used to live here, and PatientDashboardController — which builds its
    // own notification payload and overrides this shared prop entirely — set
    // action_url to null, so every notification on the dashboard was a dead
    // click that no change here could fix.
}
