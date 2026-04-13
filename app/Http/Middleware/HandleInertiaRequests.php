<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

/**
 * HandleInertiaRequests
 * ──────────────────────────────────────────────────────────────────────────────
 * Shares data with every Inertia page — the notification bell count and
 * recent notifications are included here so every layout (doctor dashboard,
 * patient dashboard, admin, nurse) gets the bell without a separate API call.
 *
 * REPLACE your existing HandleInertiaRequests.php with this file.
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

        // Only load notifications for authenticated users
        $notifications  = [];
        $unreadCount    = 0;

        if ($user) {
            // Last 15 notifications for the bell dropdown
            $notifications = $user->notifications()
                ->latest()
                ->limit(15)
                ->get()
                ->map(fn ($n) => [
                    'id'         => $n->id,
                    'type'       => $n->data['type']       ?? 'general',
                    'title'      => $n->data['title']      ?? '',
                    'body'       => $n->data['body']       ?? '',
                    'icon'       => $n->data['icon']       ?? 'bell',
                    'action_url' => $n->data['action_url'] ?? null,
                    'role_hint'  => $n->data['role_hint']  ?? null,
                    'read'       => ! is_null($n->read_at),
                    'time'       => $n->created_at->diffForHumans(),
                    'created_at' => $n->created_at->toISOString(),
                ])
                ->toArray();

            $unreadCount = $user->unreadNotifications()->count();
        }

        return array_merge($shared, [
            'auth' => [
                'user' => $user ? [
                    'id'         => $user->id,
                    'email'      => $user->email,
                    'name'       => $user->name,
                    'first_name' => $user->profile?->first_name ?? '',
                    'last_name'  => $user->profile?->last_name  ?? '',
                    'roles'      => $user->getRoleNames()->toArray(),
                ] : null,
            ],
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}