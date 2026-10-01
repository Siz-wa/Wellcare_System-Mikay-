<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The inbox for messages sent through the public Contact page.
 */
class AdminContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $showHandled = $request->boolean('handled');

        $messages = ContactMessage::query()
            ->with('handler')
            ->when(! $showHandled, fn ($q) => $q->open())
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (ContactMessage $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'phone' => $m->phone,
                'subject' => $m->subject,
                'message' => $m->message,
                'receivedAt' => $m->created_at?->format('d M Y, g:i A'),
                'handledAt' => $m->handled_at?->format('d M Y, g:i A'),
                'handledBy' => $m->handler?->name,
            ]);

        return Inertia::render('admin/messages/index', [
            'messages' => $messages,
            'showHandled' => $showHandled,
            'openCount' => ContactMessage::open()->count(),
        ]);
    }

    public function handle(ContactMessage $message): RedirectResponse
    {
        $message->update([
            'handled_at' => now(),
            'handled_by' => Auth::id(),
        ]);

        return back()->with('success', 'Marked as handled.');
    }
}
