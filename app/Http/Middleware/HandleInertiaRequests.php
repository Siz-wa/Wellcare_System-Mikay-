<?php

namespace App\Http\Middleware;

use App\Models\AppointmentNotification;
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

        $user          = Auth::user();
        $notifications = [];
        $unreadCount   = 0;

        if ($user) {
            $rows = AppointmentNotification::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(15)
                ->get();

            $notifications = $rows->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->subject,
                'body'       => $n->body,
                'icon'       => $this->iconForType($n->type),
                'action_url' => $this->urlForNotification($n->type, $user),
                'role_hint'  => null,
                'read'       => (bool) $n->read,
                'time'       => $n->created_at->diffForHumans(),
                'created_at' => $n->created_at->toISOString(),
            ])->toArray();

            $unreadCount = AppointmentNotification::where('user_id', $user->id)
                ->where('read', false)
                ->count();
        }

        return array_merge($shared, [
            'auth' => [
                'user' => $user ? [
                    'id'         => $user->id,
                    'email'      => $user->email,
                    'name'       => $user->name,
                    // Doctor name comes from DoctorProfile::display_name
                    // Patient/HR name comes from PatientProfile
                    // Fall through all relationships until we find a name
                    'first_name' => $this->resolveFirstName($user),
                    'last_name'  => $this->resolveLastName($user),
                    'roles'      => $user->getRoleNames()->toArray(),
                ] : null,
            ],
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
            'flash'         => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }

    private function resolveFirstName(\App\Models\User $user): string
    {
        // Doctors: DoctorProfile.display_name = "Dr. Bettina Limson"
        // Skip the "Dr." prefix — return given name only (e.g. "Bettina")
        $dp = $user->doctorProfile ?? null;
        if ($dp && $dp->display_name) {
            // Strip "Dr." / "Dra." prefix, take the remaining name parts
            $name   = preg_replace('/^Dr[a]?\.\s*/i', '', $dp->display_name);
            $parts  = explode(' ', trim($name));
            return $parts[0] ?? $dp->display_name;
        }
        if ($user->profile?->first_name)        return $user->profile->first_name;
        if ($user->patientProfile?->first_name) return $user->patientProfile->first_name;
        $parts = explode(' ', $user->name ?? '', 2);
        return $parts[0] ?? '';
    }

    private function resolveLastName(\App\Models\User $user): string
    {
        $dp = $user->doctorProfile ?? null;
        if ($dp && $dp->display_name) {
            $name  = preg_replace('/^Dr[a]?\.\s*/i', '', $dp->display_name);
            $parts = explode(' ', trim($name));
            // Everything after the first name = last name
            array_shift($parts);
            return implode(' ', $parts);
        }
        if ($user->profile?->last_name)        return $user->profile->last_name;
        if ($user->patientProfile?->last_name) return $user->patientProfile->last_name;
        $parts = explode(' ', $user->name ?? '', 2);
        return $parts[1] ?? '';
    }

    private function iconForType(string $type): string
    {
        return match ($type) {
            'confirmed'                      => 'check-circle',
            'cancelled'                      => 'x-circle',
            'checked_in'                     => 'user-check',
            'consultation_done'              => 'clipboard-check',
            'hmo_submitted'                  => 'calendar',
            'hmo_approved'                   => 'check-circle',
            'hmo_rejected'                   => 'x-circle',
            default                          => 'calendar',
        };
    }

    private function urlForNotification(string $type, \App\Models\User $user): string
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('doctor', $roles)) {
            // Doctors always land on their appointment list
            return '/doctor/appointments';
        }

        if (in_array('hr', $roles) || in_array('admin', $roles)) {
            return match ($type) {
                'hmo_submitted', 'hmo_approved', 'hmo_rejected' => '/hr/hmo-approvals',
                default                                          => '/hr/dashboard',
            };
        }

        // Patient
        return '/user/dashboard';
    }
}