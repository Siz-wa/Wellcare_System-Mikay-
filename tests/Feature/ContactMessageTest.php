<?php

use App\Models\AppointmentNotification;
use App\Models\ContactMessage;

/**
 * The public Contact form used to fake a delay and discard every message.
 */
function contactPayload(array $overrides = []): array
{
    return [
        'name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'phone' => '09171234567',
        'subject' => 'General Inquiry',
        'message' => 'Do you accept Maxicare for laboratory tests?',
        ...$overrides,
    ];
}

it('stores a message and puts it in every administrator\'s bell', function () {
    $admin = userWithRole('admin');

    $this->post('/contact', contactPayload())->assertSessionHasNoErrors()->assertRedirect();

    $message = ContactMessage::sole();
    expect($message->message)->toBe('Do you accept Maxicare for laboratory tests?')
        ->and(AppointmentNotification::where('user_id', $admin->id)->where('type', 'contact_message')->exists())
        ->toBeTrue();
});

it('encrypts the message body at rest', function () {
    $this->post('/contact', contactPayload());

    $raw = DB::table('contact_messages')->value('message');
    expect($raw)->not->toContain('Maxicare');
});

it('validates what a visitor sends', function () {
    $this->post('/contact', contactPayload(['email' => 'nope', 'subject' => 'Spam', 'message' => 'hi', 'phone' => '123']))
        ->assertSessionHasErrors(['email', 'subject', 'message', 'phone']);

    expect(ContactMessage::count())->toBe(0);
});

it('refuses a submission that fills the hidden honeypot', function () {
    $this->post('/contact', contactPayload(['website' => 'http://spam.example']))
        ->assertSessionHasErrors('website');

    expect(ContactMessage::count())->toBe(0);
});

it('rate-limits the public endpoint', function () {
    foreach (range(1, 5) as $i) {
        $this->post('/contact', contactPayload());
    }

    $this->post('/contact', contactPayload())->assertStatus(429);
});

it('lets an administrator read and close messages but not the owner', function () {
    $this->post('/contact', contactPayload());
    $message = ContactMessage::sole();

    $this->actingAs(userWithRole('admin'))
        ->get('/admin/messages')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/messages/index')->where('openCount', 1));

    $this->actingAs(userWithRole('admin'))
        ->post("/admin/messages/{$message->id}/handle")
        ->assertRedirect();

    expect($message->fresh()->handled_at)->not->toBeNull();

    $this->actingAs(userWithRole('owner'))->get('/admin/messages')->assertForbidden();
});

it('lists handled messages with who handled them', function () {
    $this->post('/contact', contactPayload());
    $admin = userWithRole('admin');
    $this->actingAs($admin)->post('/admin/messages/'.ContactMessage::sole()->id.'/handle');

    $this->actingAs($admin)
        ->get('/admin/messages?handled=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('messages.data.0.handledBy', $admin->name));
});
