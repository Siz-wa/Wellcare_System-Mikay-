<?php

/**
 * Who may book.
 *
 * Every appointment route is gated `role:user` in routes/web.php, so a doctor,
 * nurse, HR officer or administrator who reaches one is answered with a 403.
 *
 * This is the fact the front-end mirrors. `useCanBook()`
 * (resources/js/hooks/use-can-book.ts) hides the "Book Appointment" buttons on
 * the public pages from exactly the roles listed here — the doctors directory,
 * an individual doctor's page, the services page and the closing call-to-action
 * band all offered a signed-in doctor a button that could only fail. If the gate
 * below is ever widened, that hook is the other half to widen with it.
 */
dataset('staff roles', ['doctor', 'nurse', 'hr', 'admin']);

it('keeps the booking page to patients', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get('/book')
        ->assertForbidden();
})->with('staff roles');

it('keeps the appointment list to patients', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get('/appointments')
        ->assertForbidden();
})->with('staff roles');

it('lets a patient reach the booking page', function () {
    $this->actingAs(userWithRole('user'))
        ->get('/book')
        ->assertOk();
});

it('sends a guest to log in rather than refusing them', function () {
    // Why the buttons stay visible to guests: this is the funnel they exist for.
    $this->get('/book')->assertRedirect(route('login'));
});
