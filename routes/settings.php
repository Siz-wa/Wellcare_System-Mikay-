<?php

use App\Http\Controllers\Settings\NotificationPreferenceController;
use App\Http\Controllers\Settings\PrivacyController;
use App\Http\Controllers\Settings\ProfessionalProfileController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\SessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Account settings — every authenticated role
|--------------------------------------------------------------------------
|
| This file is required from the top-level `auth` group in web.php, NOT from
| the `role:user` group. It used to be required from inside `role:user`, and
| nested route middleware accumulates rather than replaces — so every route
| here inherited `role:user` and a doctor, nurse, HR officer or administrator
| could not reach their own profile, change their own password, or enable
| two-factor authentication at all. Anyone moving this `require` back inside a
| role group re-breaks that for four of the five roles.
|
| `verified` is applied selectively, matching the starter kit: the profile page
| stays reachable while unverified precisely because it is where the "resend
| verification email" link lives, and locking it behind `verified` would be a
| loop with no exit.
|
*/

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile')->name('settings');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ── Security ──────────────────────────────────────────────────────────────
    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    // Revoking every other session is password-gated in the form request and
    // throttled here, for the same reason the password update is: both are
    // endpoints where an attacker can guess the current password.
    Route::delete('settings/sessions', [SessionController::class, 'destroy'])
        ->middleware('throttle:6,1')
        ->name('settings.sessions.destroy');

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('settings/notifications', [NotificationPreferenceController::class, 'edit'])
        ->name('settings.notifications.edit');
    Route::put('settings/notifications', [NotificationPreferenceController::class, 'update'])
        ->name('settings.notifications.update');

    // ── Privacy & data ────────────────────────────────────────────────────────
    // The literal `export` segment sits above nothing in this group today, but
    // the ordering convention from web.php applies here too: any future
    // settings/privacy/{something} wildcard goes BELOW it.
    Route::get('settings/privacy', [PrivacyController::class, 'show'])->name('settings.privacy');
    // SC-4. Literal `export` and `consents` both sit above any future
    // settings/privacy/{wildcard}, per the ordering convention in web.php.
    Route::delete('settings/privacy/consents/{type}', [PrivacyController::class, 'withdrawConsent'])
        ->name('settings.privacy.consents.withdraw');
    Route::post('settings/privacy/consents/{type}', [PrivacyController::class, 'grantConsent'])
        ->name('settings.privacy.consents.grant');

    Route::get('settings/privacy/export', [PrivacyController::class, 'export'])
        // Assembling an entire medical record into one response is the most
        // expensive read an account can trigger, and the most useful single
        // request for anyone who has stolen a session.
        ->middleware('throttle:3,1')
        ->name('settings.privacy.export');

    Route::inertia('settings/accessibility', 'settings/accessibility/index')->name('accessibility.edit');
});

/*
|--------------------------------------------------------------------------
| Professional profile — doctors only
|--------------------------------------------------------------------------
|
| Its OWN group with `role:doctor` stated explicitly, rather than an addition
| to the shared groups above. The header comment on this file explains why that
| matters: nested route middleware accumulates, so a `role:doctor` route added
| inside the general settings group would gate the whole group and lock four
| roles out of their own account pages again.
|
| The literal `photo` segment sits under a fixed path with no wildcard beside
| it, but it is declared with the rest of the group for the same reason the
| ordering rule in web.php exists — a future `settings/professional/{something}`
| goes BELOW it.
|
*/
Route::middleware(['auth', 'verified', 'role:doctor'])->group(function () {
    Route::get('settings/professional', [ProfessionalProfileController::class, 'edit'])
        ->name('settings.professional.edit');
    Route::patch('settings/professional', [ProfessionalProfileController::class, 'update'])
        ->name('settings.professional.update');

    Route::get('settings/professional/photo', [ProfessionalProfileController::class, 'photo'])
        ->name('settings.professional.photo');
    Route::post('settings/professional/photo', [ProfessionalProfileController::class, 'updatePhoto'])
        ->name('settings.professional.photo.store');
    Route::delete('settings/professional/photo', [ProfessionalProfileController::class, 'destroyPhoto'])
        ->name('settings.professional.photo.destroy');
});
