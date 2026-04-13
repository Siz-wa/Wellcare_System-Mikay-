<?php

use App\Http\Controllers\GenController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AppointmentController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Doctor\DoctorConsultationController;
use App\Http\Controllers\Doctor\DoctorAppointmentController;
use App\Http\Controllers\Doctor\PatientRecordController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Patient\PatientDashboardController;

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

Route::middleware(['auth'])->group(function () {
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all',  [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}',    [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications',         [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');
});


/*
|--------------------------------------------------------------------------
| Doctor Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'role:doctor'])->group(function () {

    // Route parameter is now {patient} → Patient model (not {user} → User model)
    Route::controller(PatientRecordController::class)->group(function () {
        Route::get('/doctor/patient-records',                          'index')->name('doctor.patient-records');
        Route::get('/doctor/patient-records/{patient}',                'show')->name('doctor.patient-records.show');
        Route::post('/doctor/patient-records/{patient}/allergies',     'storeAllergy')->name('doctor.patient-records.allergies.store');
        Route::delete('/doctor/patient-records/allergies/{allergy}',   'destroyAllergy')->name('doctor.patient-records.allergies.destroy');
        Route::post('/doctor/patient-records/{patient}/diagnoses',     'storeDiagnosis')->name('doctor.patient-records.diagnoses.store');
        Route::patch('/doctor/patient-records/diagnoses/{diagnosis}',  'updateDiagnosis')->name('doctor.patient-records.diagnoses.update');
        Route::delete('/doctor/patient-records/diagnoses/{diagnosis}', 'destroyDiagnosis')->name('doctor.patient-records.diagnoses.destroy');
        Route::post('/doctor/patient-records/{patient}/documents',     'uploadDocument')->name('doctor.patient-records.documents.store');
        Route::delete('/doctor/patient-records/documents/{document}',  'destroyDocument')->name('doctor.patient-records.documents.destroy');
    });
    
    // Document download — streams file from local storage
    Route::get('/doctor/patient-records/documents/{document}/download',
        [PatientRecordController::class, 'downloadDocument']
    )->name('doctor.patient-records.documents.download');


    Route::controller(DoctorAppointmentController::class)->group(function () {
        Route::get('/doctor/appointments',                        'index')->name('doctor.appointments');
        Route::post('/doctor/appointments/{appointment}/confirm', 'confirm')->name('doctor.appointments.confirm');
        Route::post('/doctor/appointments/{appointment}/cancel',  'cancel')->name('doctor.appointments.cancel');
    });

    Route::controller(DoctorConsultationController::class)->group(function () {
    Route::get('/dashboard/consultations',                            'index')->name('doctor.consultations');
    // patient-history MUST come before {appointment} routes to avoid route capture
    Route::get('/dashboard/consultations/patient-history',            'patientHistory')->name('doctor.consultations.history');
    Route::post('/dashboard/consultations/{appointment}/save',        'saveSession')->name('doctor.consultations.save');
    Route::post('/dashboard/consultations/{appointment}/start',       'start')->name('doctor.consultations.start');
    Route::post('/dashboard/consultations/{appointment}/complete',    'complete')->name('doctor.consultations.complete');
    });
    Route::post('/dashboard/consultations/{appointment}/save', [DoctorConsultationController::class, 'saveSession'])->name('doctor.consultations.save');

    
    

    Route::get('/doctor/dashboard',           fn () => inertia('doctor/dashboard'))->name('doctor.dashboard');
    Route::get('/dashboard/my-schedule',      fn () => inertia('doctor/my-schedule/my-schedule'))->name('doctor.my-schedule');
    Route::get('/dashboard/my-patients',      fn () => inertia('doctor/my-patients/my-patients'))->name('doctor.my-patients');
    Route::get('/doctor/consultations', [DoctorConsultationController::class, 'index'])->name('doctor.consultations');
    Route::get('/dashboard/patient-records',  fn () => inertia('doctor/patient-records/patient-records'))->name('doctor.patient-records');
    Route::get('/dashboard/lab-reviews',      fn () => inertia('doctor/lab-reviews/lab-reviews'))->name('doctor.lab-reviews');
});


Route::middleware(['auth', 'role:user'])->group(function () {

    Route::controller(PatientDashboardController::class)->group(function () {
        Route::get('/user/dashboard',                         'dashboard')->name('user.dashboard');
        Route::post('/user/appointments/{appointment}/check-in', 'checkIn')->name('user.appointments.checkin');
        Route::post('/user/notifications/{notification}/read',   'markRead')->name('user.notifications.read');
        Route::post('/user/notifications/read-all',              'markAllRead')->name('user.notifications.read-all');
    });

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