<?php

namespace App\Http\Controllers;

use App\Models\AppointmentNotification;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The public Contact form's endpoint.
 *
 * Stores the enquiry and puts it in every active administrator's bell, which
 * also emails them through the normal notification delivery. Rate-limited in
 * routes/web.php because it is reachable without an account.
 */
class ContactMessageController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'subject' => ['required', Rule::in(ContactMessage::SUBJECTS)],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            // A field real visitors never see. Bots fill every input.
            'website' => ['prohibited'],
        ], [
            'phone.regex' => 'Enter a PH mobile number such as 09171234567.',
            'message.min' => 'Please tell us a little more so we can help.',
        ]);

        $message = ContactMessage::create([
            ...collect($validated)->except('website')->all(),
            'ip_address' => $request->ip(),
        ]);

        $preview = Str::limit($message->message, 160);

        foreach (User::role('admin')->where('is_active', true)->get() as $admin) {
            AppointmentNotification::create([
                'appointment_id' => null,
                'user_id' => $admin->id,
                'type' => 'contact_message',
                'subject' => "New message: {$message->subject}",
                'body' => "{$message->name} ({$message->email}) wrote: {$preview}",
                'read' => false,
            ]);
        }

        return back()->with('success', 'Thank you. Your message reached our team and we will reply within 24 hours.');
    }
}
