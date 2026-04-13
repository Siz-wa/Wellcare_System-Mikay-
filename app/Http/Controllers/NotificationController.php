<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * NotificationController
 * ──────────────────────────────────────────────────────────────────────────────
 * Routes (add to web.php, auth middleware only):
 *
 *   POST /notifications/{id}/read      → markRead
 *   POST /notifications/read-all       → markAllRead
 *   DELETE /notifications/{id}         → destroy
 *   DELETE /notifications              → destroyAll
 */
class NotificationController extends Controller
{
    public function markRead(string $id): RedirectResponse
    {
        Auth::user()
            ->notifications()
            ->where('id', $id)
            ->first()
            ?->markAsRead();

        return back();
    }

    public function markAllRead(): RedirectResponse
    {
        Auth::user()->unreadNotifications->markAsRead();
        return back();
    }

    public function destroy(string $id): RedirectResponse
    {
        Auth::user()
            ->notifications()
            ->where('id', $id)
            ->delete();

        return back();
    }

    public function destroyAll(): RedirectResponse
    {
        Auth::user()->notifications()->delete();
        return back();
    }
}