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
            ->whereNull('read_at')
            ->update(['read' => true, 'read_at' => now()]);

        return back();
    }

    public function markAllRead(): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('read', false)
            ->update(['read' => true, 'read_at' => now()]);

        return back();
    }

    /**
     * Task 1.3 — explicitly accept responsibility for a critical lab result.
     *
     * Deliberately a separate action from marking read. Opening the bell is not
     * the same act as accepting a critical value, and the audit trail must not
     * claim otherwise: `read_at` says the notification was displayed,
     * `acknowledged_at` says a named clinician took it on. Only the second stops
     * `wellcare:results:escalate` re-raising it.
     */
    public function acknowledge(int $id): RedirectResponse
    {
        $notification = AppointmentNotification::where('user_id', Auth::id())
            ->findOrFail($id);

        abort_unless($notification->requiresAcknowledgement(), 422);

        $notification->acknowledge(Auth::user());

        return back()->with('success', 'Critical result acknowledged.');
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
