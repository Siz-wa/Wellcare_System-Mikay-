<?php

use App\Http\Controllers\GenController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::controller(GenController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/about', 'about')->name('about');
    Route::get('/services', 'services')->name('services');
    Route::get('/doctors', 'doctors')->name('doctors');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/faqs', 'faqs')->name('faqs');
});

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {

    // ── Doctor Dashboard ───────────────────────────────────────────────────
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/dashboard/my-schedule', function () {
        return inertia('doctor/my-schedule/my-schedule');
    })->name('my-schedule');

    Route::get('/dashboard/my-patients', function () {
        return inertia('doctor/my-patients/my-patients');
    })->name('my-patients');

    Route::get('/dashboard/consultations', function () {
        return inertia('doctor/consultations/consultations');
    })->name('consultations');

    Route::get('/dashboard/patient-records', function () {
        return inertia('doctor/patient-records/patient-records');
    })->name('patient-records');

    Route::get('/dashboard/lab-reviews', function () {
        return inertia('doctor/lab-reviews/lab-reviews');
    })->name('lab-reviews');

    // ── Patient / User Routes ──────────────────────────────────────────────
    Route::get('/user/dashboard', function () {
        return inertia('user/dashboard/index');
    })->name('user.dashboard');

    Route::get('/user/appointments', function () {
        return inertia('user/appointment/index');
    })->name('user.appointments');

    Route::get('/user/vitals', function () {
        return inertia('user/vitals/index');
    })->name('user.vitals');

    Route::get('/user/records', function () {
        return inertia('user/records/index');
    })->name('user.records');

    Route::get('/user/doctors', function () {
        return inertia('user/doctors/index');
    })->name('user.doctors');

    // ── Patient Settings ───────────────────────────────────────────────────
    // All under /user/settings — each maps to its own page in user/settings/

    // /user/settings → profile tab (default)
    Route::get('/user/settings', function () {
        return inertia('user/settings/index');
    })->name('user.settings');

    // /user/settings/profile → same as index (alias)
    Route::get('/user/settings/profile', function () {
        return inertia('user/settings/index');  
    })->name('user.settings.profile');

    // /user/settings/security
    Route::get('/user/settings/security', function () {
        return inertia('user/settings/security');
    })->name('user.settings.security');

    // /user/settings/health-information
    Route::get('/user/settings/health-information', function () {
        return inertia('user/settings/health-information');
    })->name('user.settings.health');

    // /user/settings/notifications
    Route::get('/user/settings/notifications', function () {
        return inertia('user/settings/notifications');
    })->name('user.settings.notifications');

    // ── Appointment Booking (existing controller) ──────────────────────────
    Route::controller(\App\Http\Controllers\AppointmentController::class)->group(function () {
        Route::get('/appointments', 'index')->name('book.index');
        Route::get('/appointments/create', 'create')->name('book');
        Route::post('/appointments', 'store')->name('book.store');
    });

    // ── Settings (doctor) + Fortify ────────────────────────────────────────
    require __DIR__.'/settings.php';

    Route::prefix('hr')
    ->middleware(['auth', 'verified', 'hr'])     // ← Changed to 'hr'
    ->name('hr.')
    ->group(function () {

        Route::get('/dashboard', fn() => inertia('hr/dashboard/index'))
            ->name('dashboard');

        Route::get('/hmo-applications', fn() => inertia('hr/hmo-applications/index'))
            ->name('hmo-applications');
    });
 

});