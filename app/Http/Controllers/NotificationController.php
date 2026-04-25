<?php

namespace App\Http\Controllers;

use App\Models\AppointmentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

/**
 * NotificationController
 * ─────────────────────────────────────────────────────────────────────────────
 * Operates on appointment_notifications table — the single active notification
 * store. Routes (must all be inside auth middleware, read-all BEFORE {id}):
 *
 *   POST   /notifications/read-all  → markAllRead
 *   POST   /notifications/{id}/read → markRead
 *   DELETE /notifications/{id}      → destroy
 *   DELETE /notifications           → destroyAll
 */
class NotificationController extends Controller
{
    public function markRead(int $id): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('id', $id)
            ->update(['read' => true]);

        return back();
    }

    public function markAllRead(): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('read', false)
            ->update(['read' => true]);

        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('id', $id)
            ->delete();

        return back();
    }

    public function destroyAll(): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())->delete();
        return back();
    }
}