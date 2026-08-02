<?php

use App\Http\Controllers\Admin\AdminActivityLogController;
use App\Http\Controllers\Admin\AdminArchiveController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPatientController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Doctor\AvailabilityController;
use App\Http\Controllers\Doctor\DoctorAppointmentController;
use App\Http\Controllers\Doctor\DoctorConsultationController;
use App\Http\Controllers\Doctor\DoctorSettingsController;
use App\Http\Controllers\Doctor\LabReviewController;
use App\Http\Controllers\Doctor\PatientRecordController;
use App\Http\Controllers\GenController;
use App\Http\Controllers\HR\HmoApprovalController;
use App\Http\Controllers\HR\HRDashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Nurse\AppointmentMonitorController;
use App\Http\Controllers\Nurse\LabQueueController;
use App\Http\Controllers\Nurse\LoaMonitoringController;
use App\Http\Controllers\Nurse\NurseDashboardController;
// Doctor\PatientRecordController holds the plain name above; the nurse's is
// aliased for the same reason the patient portal's is.
use App\Http\Controllers\Nurse\PatientRecordController as NursePatientRecordController;
use App\Http\Controllers\Patient\PatientDashboardController;
use App\Http\Controllers\Patient\PatientLabResultController;
use App\Http\Controllers\Patient\PatientLoaController;
// Doctor\PatientRecordController is already imported above under its plain
// name; the patient-facing one is aliased rather than renamed so both files
// keep the name that matches their namespace.
use App\Http\Controllers\Patient\PatientRecordController as PatientPortalRecordController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────────────────

Route::controller(GenController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/about', 'about')->name('about');
    Route::get('/services', 'services')->name('services');
    Route::get('/doctors', 'doctors')->name('doctors');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/faqs', 'faqs')->name('faqs');
    Route::get('/terms', 'terms')->name('terms');
    Route::get('/privacy', 'privacy')->name('privacy');
    Route::get('/cookies', 'cookies')->name('cookies');
});

// ── Centralized notifications — ALL authenticated roles ───────────────────────
// CRITICAL: read-all MUST come BEFORE {id}/read or Laravel captures
// the literal string "read-all" as the {id} wildcard.
Route::middleware(['auth'])->group(function () {
    // Canonical landing route — redirects to the dashboard for the user's role.
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications', [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');
});

// ── Doctor ────────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:doctor'])->group(function () {

    // Patient records
    Route::controller(PatientRecordController::class)->group(function () {
        Route::get('/doctor/patient-records', 'index')->name('doctor.patient-records');
        Route::get('/doctor/patient-records/{patient}', 'show')->name('doctor.patient-records.show');
        Route::post('/doctor/patient-records/{patient}/allergies', 'storeAllergy')->name('doctor.patient-records.allergies.store');
        Route::delete('/doctor/patient-records/allergies/{allergy}', 'destroyAllergy')->name('doctor.patient-records.allergies.destroy');
        Route::post('/doctor/patient-records/{patient}/diagnoses', 'storeDiagnosis')->name('doctor.patient-records.diagnoses.store');
        Route::patch('/doctor/patient-records/diagnoses/{diagnosis}', 'updateDiagnosis')->name('doctor.patient-records.diagnoses.update');
        Route::delete('/doctor/patient-records/diagnoses/{diagnosis}', 'destroyDiagnosis')->name('doctor.patient-records.diagnoses.destroy');
        Route::post('/doctor/patient-records/{patient}/documents', 'uploadDocument')->name('doctor.patient-records.documents.store');
        Route::get('/doctor/patient-records/documents/{document}/download', 'downloadDocument')->name('doctor.patient-records.documents.download');
        Route::delete('/doctor/patient-records/documents/{document}', 'destroyDocument')->name('doctor.patient-records.documents.destroy');
    });

    // Appointments
    Route::controller(DoctorAppointmentController::class)->group(function () {
        Route::get('/doctor/appointments', 'index')->name('doctor.appointments');
        Route::post('/doctor/appointments/{appointment}/confirm', 'confirm')->name('doctor.appointments.confirm');
        Route::post('/doctor/appointments/{appointment}/cancel', 'cancel')->name('doctor.appointments.cancel');
    });

    // Consultations — patient-history MUST be before {appointment} wildcard
    Route::controller(DoctorConsultationController::class)->group(function () {
        Route::get('/doctor/consultations', 'index')->name('doctor.consultations');
        Route::get('/doctor/consultations/patient-history', 'patientHistory')->name('doctor.consultations.history');
        Route::post('/doctor/consultations/{appointment}/save', 'saveSession')->name('doctor.consultations.save');
        Route::post('/doctor/consultations/{appointment}/start', 'start')->name('doctor.consultations.start');
        Route::post('/doctor/consultations/{appointment}/complete', 'complete')->name('doctor.consultations.complete');
        Route::post('/doctor/consultations/{appointment}/lab-request', 'requestLab')->name('doctor.consultations.lab-request');
    });

    // Availability — literals first, then the {availabilityBlock} wildcard
    Route::controller(AvailabilityController::class)->group(function () {
        Route::get('/doctor/availability', 'index')->name('doctor.availability');
        Route::put('/doctor/availability/weekly', 'updateWeekly')->name('doctor.availability.weekly');
        Route::post('/doctor/availability/time-off', 'storeTimeOff')->name('doctor.availability.time-off');
        Route::delete('/doctor/availability/{availabilityBlock}', 'destroy')->name('doctor.availability.destroy');
    });

    // Lab reviews — literal segment first, then the {labTestResult} wildcard
    Route::controller(LabReviewController::class)->group(function () {
        Route::get('/doctor/lab-reviews', 'index')->name('doctor.lab-reviews');
        Route::post('/doctor/lab-reviews/{labTestResult}/validate', 'validateResult')->name('doctor.lab-reviews.validate');
    });

    Route::get('/doctor/dashboard', fn () => inertia('doctor/dashboard'))->name('doctor.dashboard');

    Route::get('/doctor/settings', [DoctorSettingsController::class, 'index'])->name('doctor.settings');
});

// ── HR / Admin ────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:hr|admin'])->group(function () {
    Route::get('/hr/dashboard', [HRDashboardController::class, 'index'])->name('hr.dashboard');

    // LOA decisions — the wildcard binds a {loaRequest}, not an {appointment}.
    // The queue reads loa_requests; LoaService keeps the appointment in step.
    Route::controller(HmoApprovalController::class)->group(function () {
        Route::get('/hr/hmo-approvals', 'index')->name('hr.hmo-approvals');
        Route::post('/hr/hmo-approvals/{loaRequest}/approve', 'approve')->name('hr.hmo-approvals.approve');
        Route::post('/hr/hmo-approvals/{loaRequest}/reject', 'reject')->name('hr.hmo-approvals.reject');
    });
});

// ── Nurse ─────────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:nurse'])->group(function () {

    Route::get('/nurse/dashboard', [NurseDashboardController::class, 'index'])->name('nurse.dashboard');

    // Lab queue — literal segment first, then the {labTestResult} wildcard
    Route::controller(LabQueueController::class)->group(function () {
        Route::get('/nurse/lab-queue', 'index')->name('nurse.lab-queue');
        Route::post('/nurse/lab-queue/{labTestResult}/record', 'record')->name('nurse.lab-queue.record');
    });

    // LOA monitoring — read-only per Fig. 10; HR owns the decision (Fig. 8).
    Route::get('/nurse/loa-monitoring', [LoaMonitoringController::class, 'index'])->name('nurse.loa-monitoring');

    // Daily appointment monitor — Fig. 4 "Monitor Appointment List". Read-only.
    Route::get('/nurse/appointments', [AppointmentMonitorController::class, 'index'])->name('nurse.appointments');

    // Patient records — Fig. 10 "Access / Update Patient Records".
    //
    // Route ordering is load-bearing: every literal segment (`documents`,
    // `allergies`) sits above the `{patient}` wildcard, or Laravel binds the
    // literal as a patient id. Same rule as the patient portal group below.
    //
    // There is deliberately NO diagnosis write route here — see the capability
    // split documented on Nurse\PatientRecordController.
    Route::controller(NursePatientRecordController::class)->group(function () {
        Route::get('/nurse/patient-records', 'index')->name('nurse.patient-records');
        Route::get('/nurse/patient-records/documents/{document}/download', 'downloadDocument')->name('nurse.patient-records.documents.download');
        Route::delete('/nurse/patient-records/allergies/{allergy}', 'destroyAllergy')->name('nurse.patient-records.allergies.destroy');
        Route::get('/nurse/patient-records/{patient}', 'show')->name('nurse.patient-records.show');
        Route::patch('/nurse/patient-records/{patient}', 'update')->name('nurse.patient-records.update');
        Route::post('/nurse/patient-records/{patient}/allergies', 'storeAllergy')->name('nurse.patient-records.allergies.store');
        Route::post('/nurse/patient-records/{patient}/documents', 'uploadDocument')->name('nurse.patient-records.documents.store');
    });
});

// ── Patient ───────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'role:user'])->group(function () {

    Route::controller(PatientDashboardController::class)->group(function () {
        Route::get('/user/dashboard', 'dashboard')->name('user.dashboard');
        Route::post('/user/appointments/{appointment}/check-in', 'checkIn')->name('user.appointments.checkin');
        Route::post('/user/appointments/{appointment}/cancel', 'cancel')->name('user.appointments.cancel');
    });

    // Medical records — the literal `documents` segment MUST stay above the
    // {patient} wildcard or Laravel captures "documents" as a patient id.
    Route::controller(PatientPortalRecordController::class)->group(function () {
        Route::get('/user/records', 'index')->name('user.records');
        Route::get('/user/records/documents/{document}/download', 'downloadDocument')->name('user.records.documents.download');
        Route::get('/user/records/{patient}', 'show')->name('user.records.show');
    });

    Route::get('/user/lab-results', [PatientLabResultController::class, 'index'])->name('user.lab-results');

    // "Check LOA status" — Objective 1.6, Fig. 11's LOA Status process.
    Route::get('/user/loa-status', [PatientLoaController::class, 'index'])->name('user.loa-status');

    Route::controller(AppointmentController::class)->group(function () {
        Route::get('/book', 'bookingPage')->name('book');
        // Slots — MUST come before /{appointment} wildcard
        Route::get('/appointments/slots', 'availableSlots')->name('appointments.slots');
        // Was public, which leaked per-doctor booking density for any date to
        // anyone. Its only caller is the booking form, which is already here.
        Route::get('/appointments/doctor-availability', 'doctorAvailability')->name('appointments.doctor-availability');
        Route::get('/appointments', 'index')->name('appointments.index');
        Route::post('/appointments', 'store')->name('appointments.store');
        Route::post('/appointments/{appointment}/cancel', 'cancel')->name('appointments.cancel');
        Route::get('/appointments/{appointment}/confirmation', 'confirmation')->name('appointments.confirmation');
        Route::get('/appointments/{appointment}', 'show')->name('appointments.show');
    });

    require __DIR__.'/settings.php';
});

// ── Admin ─────────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::get('/admin/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');

    // User management — Fig. 4 "Add New User" / "Manage User Acc" /
    // "Manage User/Roles" / "Deactivate/Reactivate Acc".
    // The literal `users` collection routes stay ABOVE the {user} wildcards.
    Route::controller(AdminUserController::class)->group(function () {
        Route::get('/admin/users', 'index')->name('admin.users');
        Route::post('/admin/users', 'store')->name('admin.users.store');
        Route::put('/admin/users/{user}', 'update')->name('admin.users.update');
        Route::post('/admin/users/{user}/role', 'assignRole')->name('admin.users.role');
        Route::post('/admin/users/{user}/activate', 'activate')->name('admin.users.activate');
        Route::post('/admin/users/{user}/deactivate', 'deactivate')->name('admin.users.deactivate');
    });

    // Manage Patient — Fig. 3. Demographics only; clinical data stays with
    // Doctor\PatientRecordController.
    Route::controller(AdminPatientController::class)->group(function () {
        Route::get('/admin/patients', 'index')->name('admin.patients');
        Route::put('/admin/patients/{patient}', 'update')->name('admin.patients.update');
    });

    // Archive — Fig. 3. `appointments`/`patients` are literal segments and
    // must stay ahead of any future /admin/archive/{id} wildcard.
    Route::controller(AdminArchiveController::class)->group(function () {
        Route::get('/admin/archive', 'index')->name('admin.archive');
        Route::post('/admin/archive/appointments/{id}/restore', 'restoreAppointment')
            ->name('admin.archive.appointments.restore');
        Route::post('/admin/archive/patients/{id}/restore', 'restorePatient')
            ->name('admin.archive.patients.restore');
    });

    // Activity Log — Fig. 3 oval + Fig. 4 "Monitor System". Read-only: there
    // is no update or delete route here, and none should be added.
    Route::get('/admin/activity-log', [AdminActivityLogController::class, 'index'])
        ->name('admin.activity-log');

    Route::post('/admin/doctors/{doctorId}/out-of-office', [AppointmentController::class, 'markOutOfOffice'])
        ->name('admin.doctors.out-of-office');
});
