<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;

/**
 * Bookings whose date has gone must not sit in queues forever.
 */
function staleAppointment(string $status, int $daysAgo = 3): Appointment
{
    return Appointment::factory()->create([
        'status' => $status,
        'appointment_date' => now()->subDays($daysAgo)->toDateString(),
    ]);
}

it('closes each kind of stale appointment the right way', function () {
    $requested = staleAppointment('requested');
    $hmo = staleAppointment('pending_hmo_approval');
    $confirmed = staleAppointment('confirmed');
    $checkedIn = staleAppointment('checked_in');
    $inProgress = staleAppointment('in_progress');
    $today = Appointment::factory()->create(['status' => 'requested', 'appointment_date' => today()->toDateString()]);

    $this->artisan('wellcare:appointments:expire-stale')->assertSuccessful();

    expect($requested->fresh()->status)->toBe('cancelled')
        ->and($hmo->fresh()->status)->toBe('cancelled')
        ->and($confirmed->fresh()->status)->toBe('no_show')
        ->and($checkedIn->fresh()->status)->toBe('cancelled')
        ->and($checkedIn->fresh()->cancellation_reason)->toContain('never started')
        // An open clinical note is never closed by a sweep.
        ->and($inProgress->fresh()->status)->toBe('in_progress')
        ->and($today->fresh()->status)->toBe('requested');
});

it('tells the patient when an unconfirmed booking is closed', function () {
    $requested = staleAppointment('requested');

    $this->artisan('wellcare:appointments:expire-stale');

    expect(AppointmentNotification::where('user_id', $requested->user_id)->where('type', 'cancelled')->exists())
        ->toBeTrue();
});

it('changes nothing on a dry run', function () {
    $requested = staleAppointment('requested');

    $this->artisan('wellcare:appointments:expire-stale', ['--dry-run' => true])->assertSuccessful();

    expect($requested->fresh()->status)->toBe('requested');
});

it('is scheduled', function () {
    $this->artisan('schedule:list')->expectsOutputToContain('wellcare:appointments:expire-stale');
});
