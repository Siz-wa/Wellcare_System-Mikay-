<?php

use App\Http\Controllers\GenController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AppointmentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::controller(GenController::class)->group(function () {
    Route::get('/',        'home')->name('home');
    Route::get('/about',   'about')->name('about');
    Route::get('/services','services')->name('services');
    Route::get('/doctors', 'doctors')->name('doctors');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/faqs',    'faqs')->name('faqs');
    Route::get('/terms',   'terms')->name('terms');
    Route::get('/privacy', 'privacy')->name('privacy');
    Route::get('/cookies', 'cookies')->name('cookies');
});

/*
|--------------------------------------------------------------------------
| Doctor Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'role:doctor'])->group(function () {
    Route::get('/doctor/dashboard',           [DashboardController::class, 'index'])->name('doctor.dashboard');
    Route::get('/dashboard/my-schedule',      fn () => inertia('doctor/dashboard/my-schedule/my-schedule'))->name('doctor.my-schedule');
    Route::get('/dashboard/my-patients',      fn () => inertia('doctor/dashboard/my-patients/my-patients'))->name('doctor.my-patients');
    Route::get('/dashboard/consultations',    fn () => inertia('doctor/dashboard/consultations/consultations'))->name('doctor.consultations');
    Route::get('/dashboard/patient-records',  fn () => inertia('doctor/dashboard/patient-records/patient-records'))->name('doctor.patient-records');
    Route::get('/dashboard/lab-reviews',      fn () => inertia('doctor/dashboard/lab-reviews/lab-reviews'))->name('doctor.lab-reviews');
});

/*
|--------------------------------------------------------------------------
| Patient (user role) Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:user'])->group(function () {

    Route::get('/user/dashboard', fn () => inertia('user/dashboard'))->name('user.dashboard');

    Route::controller(AppointmentController::class)->group(function () {

        // ── Booking form ───────────────────────────────────────────────────────
        Route::get('/book', 'bookingPage')->name('book');

        // ── Available slots — MUST come before /{appointment} ─────────────────
        Route::get('/appointments/slots', 'availableSlots')->name('appointments.slots');

        // ── List & create ──────────────────────────────────────────────────────
        Route::get('/appointments',  'index')->name('appointments.index');
        Route::post('/appointments', 'store')->name('appointments.store');

        // ── Sub-resource routes — MUST come before plain /{appointment} ────────
        Route::post('/appointments/{appointment}/cancel',       'cancel')->name('appointments.cancel');
        Route::get('/appointments/{appointment}/confirmation',  'confirmation')->name('appointments.confirmation');

        // ── Single view — LAST because {appointment} captures everything ───────
        Route::get('/appointments/{appointment}', 'show')->name('appointments.show');

    });

    require __DIR__.'/settings.php';
});

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::post('/admin/doctors/{doctorId}/out-of-office', [AppointmentController::class, 'markOutOfOffice'])
         ->name('admin.doctors.out-of-office');
});