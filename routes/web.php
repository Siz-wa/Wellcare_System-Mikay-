<?php

use App\Http\Controllers\GenController;
use App\Http\Controllers\AppointmentController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Doctor\DoctorConsultationController;
use App\Http\Controllers\Doctor\DoctorAppointmentController;
use App\Http\Controllers\Doctor\PatientRecordController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Patient\PatientDashboardController;
use App\Http\Controllers\HR\HmoApprovalController;
use App\Http\Controllers\HR\HRDashboardController;

// ── Public ────────────────────────────────────────────────────────────────────

Route::get('/appointments/doctor-availability', [AppointmentController::class, 'doctorAvailability'])
    ->name('appointments.doctor-availability');

Route::controller(GenController::class)->group(function () {
    Route::get('/',         'home')->name('home');
    Route::get('/about',    'about')->name('about');
    Route::get('/services', 'services')->name('services');
    Route::get('/doctors',  'doctors')->name('doctors');
    Route::get('/contact',  'contact')->name('contact');
    Route::get('/faqs',     'faqs')->name('faqs');
    Route::get('/terms',    'terms')->name('terms');
    Route::get('/privacy',  'privacy')->name('privacy');
    Route::get('/cookies',  'cookies')->name('cookies');
});

// ── Centralized notifications — ALL authenticated roles ───────────────────────
// CRITICAL: read-all MUST come BEFORE {id}/read or Laravel captures
// the literal string "read-all" as the {id} wildcard.
Route::middleware(['auth'])->group(function () {
    Route::post('/notifications/read-all',   [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read',  [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::delete('/notifications/{id}',     [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications',          [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');
});

// ── Doctor ────────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:doctor'])->group(function () {

    // Patient records
    Route::controller(PatientRecordController::class)->group(function () {
        Route::get('/doctor/patient-records',                           'index')->name('doctor.patient-records');
        Route::get('/doctor/patient-records/{patient}',                 'show')->name('doctor.patient-records.show');
        Route::post('/doctor/patient-records/{patient}/allergies',      'storeAllergy')->name('doctor.patient-records.allergies.store');
        Route::delete('/doctor/patient-records/allergies/{allergy}',    'destroyAllergy')->name('doctor.patient-records.allergies.destroy');
        Route::post('/doctor/patient-records/{patient}/diagnoses',      'storeDiagnosis')->name('doctor.patient-records.diagnoses.store');
        Route::patch('/doctor/patient-records/diagnoses/{diagnosis}',   'updateDiagnosis')->name('doctor.patient-records.diagnoses.update');
        Route::delete('/doctor/patient-records/diagnoses/{diagnosis}',  'destroyDiagnosis')->name('doctor.patient-records.diagnoses.destroy');
        Route::post('/doctor/patient-records/{patient}/documents',      'uploadDocument')->name('doctor.patient-records.documents.store');
        Route::get('/doctor/patient-records/documents/{document}/download', 'downloadDocument')->name('doctor.patient-records.documents.download');
        Route::delete('/doctor/patient-records/documents/{document}',   'destroyDocument')->name('doctor.patient-records.documents.destroy');
    });

    // Appointments
    Route::controller(DoctorAppointmentController::class)->group(function () {
        Route::get('/doctor/appointments',                         'index')->name('doctor.appointments');
        Route::post('/doctor/appointments/{appointment}/confirm',  'confirm')->name('doctor.appointments.confirm');
        Route::post('/doctor/appointments/{appointment}/cancel',   'cancel')->name('doctor.appointments.cancel');
    });

    // Consultations — patient-history MUST be before {appointment} wildcard
    Route::controller(DoctorConsultationController::class)->group(function () {
        Route::get('/doctor/consultations',                          'index')->name('doctor.consultations');
        Route::get('/doctor/consultations/patient-history',          'patientHistory')->name('doctor.consultations.history');
        Route::post('/doctor/consultations/{appointment}/save',      'saveSession')->name('doctor.consultations.save');
        Route::post('/doctor/consultations/{appointment}/start',     'start')->name('doctor.consultations.start');
        Route::post('/doctor/consultations/{appointment}/complete',  'complete')->name('doctor.consultations.complete');
    });

    Route::get('/doctor/dashboard', fn () => inertia('doctor/dashboard'))->name('doctor.dashboard');
});

// ── HR / Admin ────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:hr|admin'])->group(function () {
    Route::get('/hr/dashboard', [HRDashboardController::class, 'index'])->name('hr.dashboard');

    Route::controller(HmoApprovalController::class)->group(function () {
        Route::get('/hr/hmo-approvals',                           'index')->name('hr.hmo-approvals');
        Route::post('/hr/hmo-approvals/{appointment}/approve',    'approve')->name('hr.hmo-approvals.approve');
        Route::post('/hr/hmo-approvals/{appointment}/reject',     'reject')->name('hr.hmo-approvals.reject');
    });
});

// ── Patient ───────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'role:user'])->group(function () {

    Route::controller(PatientDashboardController::class)->group(function () {
        Route::get('/user/dashboard',                              'dashboard')->name('user.dashboard');
        Route::post('/user/appointments/{appointment}/check-in',   'checkIn')->name('user.appointments.checkin');
        Route::post('/user/appointments/{appointment}/cancel',     'cancel')->name('user.appointments.cancel');
    });

    Route::controller(AppointmentController::class)->group(function () {
        Route::get('/book', 'bookingPage')->name('book');
        // Slots — MUST come before /{appointment} wildcard
        Route::get('/appointments/slots', 'availableSlots')->name('appointments.slots');
        Route::get('/appointments',        'index')->name('appointments.index');
        Route::post('/appointments',       'store')->name('appointments.store');
        Route::post('/appointments/{appointment}/cancel',       'cancel')->name('appointments.cancel');
        Route::get('/appointments/{appointment}/confirmation',  'confirmation')->name('appointments.confirmation');
        Route::get('/appointments/{appointment}',               'show')->name('appointments.show');
    });

    require __DIR__.'/settings.php';
});

// ── Admin ─────────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::post('/admin/doctors/{doctorId}/out-of-office', [AppointmentController::class, 'markOutOfOffice'])
         ->name('admin.doctors.out-of-office');
});