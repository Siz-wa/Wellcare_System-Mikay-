<?php

use App\Http\Controllers\Admin\AdminActivityLogController;
use App\Http\Controllers\Admin\AdminArchiveController;
use App\Http\Controllers\Admin\AdminContactMessageController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPatientController;
use App\Http\Controllers\Admin\AdminServiceController;
use App\Http\Controllers\Admin\AdminStaffController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ConsultationRoomController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Doctor\AvailabilityController;
use App\Http\Controllers\Doctor\DoctorAppointmentController;
use App\Http\Controllers\Doctor\DoctorConsultationController;
use App\Http\Controllers\Doctor\LabReviewController;
use App\Http\Controllers\Doctor\PatientRecordController;
use App\Http\Controllers\Dpo\DpoOversightController;
use App\Http\Controllers\GenController;
use App\Http\Controllers\HR\AnalyticsController;
use App\Http\Controllers\HR\HmoApprovalController;
use App\Http\Controllers\HR\HRDashboardController;
use App\Http\Controllers\HR\PaymentVerificationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Nurse\AppointmentMonitorController;
use App\Http\Controllers\Nurse\LabQueueController;
use App\Http\Controllers\Nurse\LoaMonitoringController;
// Doctor\PatientRecordController holds the plain name above; the nurse's is
// aliased for the same reason the patient portal's is.
use App\Http\Controllers\Nurse\NurseDashboardController;
use App\Http\Controllers\Nurse\PatientRecordController as NursePatientRecordController;
use App\Http\Controllers\Owner\OwnerDashboardController;
use App\Http\Controllers\Patient\GuarantorPatientController;
use App\Http\Controllers\Patient\PatientConsultationController;
use App\Http\Controllers\Patient\PatientDashboardController;
use App\Http\Controllers\Patient\PatientLabResultController;
use App\Http\Controllers\Patient\PatientLoaController;
use App\Http\Controllers\Patient\PatientPaymentController;
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
    // The literal `/doctors` above stays ahead of these wildcards, per this
    // file's ordering rule. `{doctor}` binds on `doctor_profiles.user_id` (see
    // DoctorProfile::getRouteKeyName) — the same id the booking system means by
    // `doctor_id` — so a profile URL and an appointment refer to one number.
    Route::get('/doctors/{doctor}', 'doctor')->name('doctors.show');
    // Streamed by the application rather than served from a public directory,
    // because publication of a likeness is revocable; see DoctorPhotoStorage.
    Route::get('/doctors/{doctor}/photo', 'doctorPhoto')->name('doctors.photo');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/faqs', 'faqs')->name('faqs');
    Route::get('/terms', 'terms')->name('terms');
    Route::get('/privacy', 'privacy')->name('privacy');
    Route::get('/cookies', 'cookies')->name('cookies');
});

// The public Contact form. Reachable without an account, so rate-limited per IP.
Route::post('/contact', [ContactMessageController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('contact.store');

// ── Centralized notifications — ALL authenticated roles ───────────────────────
// CRITICAL: read-all MUST come BEFORE {id}/read or Laravel captures
// the literal string "read-all" as the {id} wildcard.
Route::middleware(['auth'])->group(function () {
    // Canonical landing route — redirects to the dashboard for the user's role.
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // ── Consultation room — shared by both peers ─────────────────────────────
    // Intentionally NOT role-gated. The doctor and the patient are symmetric
    // participants once a call is up, and `role:doctor` would admit every
    // doctor in the clinic to every room. Authorization is
    // ConsultationSessionService::mayJoinRoom() — the same call
    // routes/channels.php makes for the WebSocket subscribe.
    Route::controller(ConsultationRoomController::class)->group(function () {
        Route::post('/consultations/rooms/{roomId}/signal', 'signal')->name('consultations.rooms.signal');
        Route::post('/consultations/rooms/{roomId}/join', 'join')->name('consultations.rooms.join');
        Route::post('/consultations/rooms/{roomId}/leave', 'leave')->name('consultations.rooms.leave');
    });

    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    // Task 1.3 — accepting a critical result, which is a different act from
    // reading it. Declared after the literal `read-all` above and before the
    // `{id}` wildcards below, per the ordering rule in this file's header.
    Route::post('/notifications/{id}/acknowledge', [NotificationController::class, 'acknowledge'])->name('notifications.acknowledge');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications', [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');

    // ── Account settings — profile, security, notifications, privacy ─────────
    // Required HERE, in the shared `auth` group, and not inside `role:user`
    // below. Nested route middleware accumulates: while this lived in the
    // patient group, every settings route inherited `role:user`, so doctors,
    // nurses, HR officers and administrators could not open their own profile
    // or change their own password. See the header comment in settings.php.
    require __DIR__.'/settings.php';
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
        // POST, not GET on /room — this mints a room_id and writes clinical
        // state, so a refresh or a link prefetch must not trigger it.
        Route::post('/doctor/consultations/{appointment}/start-virtual', 'startVirtual')->name('doctor.consultations.start-virtual');
        Route::get('/doctor/consultations/{appointment}/room', 'room')->name('doctor.consultations.room');
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

    // Redirected for the same reason `doctor.settings` below is, and with more
    // cause: the page this rendered had no controller — `inertia('doctor/dashboard')`
    // and nothing else — so every figure on it came from `dashboard-data.ts`.
    // It greeted whoever opened it as "Dr. Douglas", reported "TOTAL PATIENTS 70"
    // against a real roster of 13, and carried hardcoded trend deltas. The
    // sidebar already points at `doctor.appointments`, so nothing linked here,
    // but the route was live and a bookmark landed a clinician on invented
    // numbers. Appointments is the real doctor landing page — the same one
    // LoginResponse sends them to.
    Route::redirect('/doctor/dashboard', '/doctor/appointments')->name('doctor.dashboard');

    // Kept as a redirect rather than deleted: the name `doctor.settings` is
    // referenced from the doctor sidebar and any bookmark a doctor already
    // holds. The page it used to render was a read-only mock whose Edit and
    // Save buttons did nothing and whose Notifications, Security and Billing
    // tabs all said "coming soon" — settings/profile is the real thing, and it
    // now admits doctors.
    Route::redirect('/doctor/settings', '/settings/profile')->name('doctor.settings');
});

// ── HR / Admin ────────────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'role:hr|admin'])->group(function () {
    Route::get('/hr/dashboard', [HRDashboardController::class, 'index'])->name('hr.dashboard');

    // The LOA QUEUE is visible to an administrator; the LOA DECISION is not.
    //
    // GV-3 in WELLCARE-GOVERNANCE-PLAN.md. Until 2026-09-10 the approve and
    // reject routes sat in this group too, which meant the one account that
    // provisions users, credentials doctors and restores archived records also
    // decided HMO benefit eligibility — provisioning, transaction approval and
    // record restoration in a single pair of hands, which is the combination
    // NIST SP 800-53 AC-5 exists to prevent.
    //
    // Visibility without authority is the deliberate shape: the admin
    // dashboard already counts `pendingLoa`, and an administrator who can see a
    // backlog but not clear it themselves has oversight without the conflict of
    // interest. The decision belongs to HR — Fig. 8.
    Route::get('/hr/hmo-approvals', [HmoApprovalController::class, 'index'])
        ->name('hr.hmo-approvals');

    // The settlement queue, same visibility-without-authority shape as the LOA
    // queue above: an administrator may read the backlog, the decision routes
    // are role:hr. Literal `proof` segment ahead of nothing here, but the
    // download binds a {paymentVerification} and stays with the decisions.
    Route::get('/hr/payment-verifications', [PaymentVerificationController::class, 'index'])
        ->name('hr.payment-verifications');

    // Objective 1.5 analytics + Fig. 4's "Generate Reports". Literal `export`
    // ahead of the {report} wildcard, per the ordering convention.
    Route::controller(AnalyticsController::class)->group(function () {
        Route::get('/hr/analytics', 'index')->name('hr.analytics');
        Route::get('/hr/analytics/export/{report}', 'export')->name('hr.analytics.export');
    });
});

// ── HR only — the decisions an administrator must not make ────────────────────

Route::middleware(['auth', 'verified', 'role:hr'])->group(function () {
    // GV-3. The wildcard binds a {loaRequest}, not an {appointment}; the queue
    // reads loa_requests and LoaService keeps the appointment in step.
    Route::controller(HmoApprovalController::class)->group(function () {
        Route::post('/hr/hmo-approvals/{loaRequest}/approve', 'approve')->name('hr.hmo-approvals.approve');
        Route::post('/hr/hmo-approvals/{loaRequest}/reject', 'reject')->name('hr.hmo-approvals.reject');
    });

    // Confirming that money arrived is the same class of decision as approving
    // an LOA, and belongs in the same pair of hands for the same reason.
    Route::controller(PaymentVerificationController::class)->group(function () {
        Route::get('/hr/payment-verifications/{paymentVerification}/proof', 'downloadProof')->name('hr.payment-verifications.proof');
        Route::post('/hr/payment-verifications/{paymentVerification}/verify', 'verify')->name('hr.payment-verifications.verify');
        Route::post('/hr/payment-verifications/{paymentVerification}/reject', 'reject')->name('hr.payment-verifications.reject');
        Route::post('/hr/payment-verifications/{paymentVerification}/waive', 'waive')->name('hr.payment-verifications.waive');
        // Cash taken at the branch counter — the path that lets a patient
        // without GCash or a bank account pay for a video consultation.
        Route::post('/hr/payment-verifications/{paymentVerification}/counter-payment', 'recordCounterPayment')->name('hr.payment-verifications.counter');
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
// `verified` like every other role group. Without it an account with an
// unconfirmed (possibly mistyped, possibly someone else's) email could book,
// pay and receive clinical notifications, while its own Security and Privacy
// pages were locked behind verification — the rule contradicted itself.

Route::middleware(['auth', 'verified', 'role:user'])->group(function () {

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

    // "My Patients" — the people this guarantor books for. Demographics only;
    // the clinical record stays read-only on PatientPortalRecordController above.
    Route::controller(GuarantorPatientController::class)->group(function () {
        Route::get('/user/patients', 'index')->name('user.patients.index');
        Route::post('/user/patients', 'store')->name('user.patients.store');
        Route::patch('/user/patients/{patient}', 'update')->name('user.patients.update');
        Route::delete('/user/patients/{patient}', 'destroy')->name('user.patients.destroy');
    });

    Route::get('/user/lab-results', [PatientLabResultController::class, 'index'])->name('user.lab-results');

    // "Check LOA status" — Objective 1.6, Fig. 11's LOA Status process.
    Route::get('/user/loa-status', [PatientLoaController::class, 'index'])->name('user.loa-status');

    // Settling a video consultation. The literal `proof` segment sits inside
    // the {payment} wildcard rather than beside it, so no ordering hazard —
    // but the index stays declared first, per the convention at the top.
    Route::controller(PatientPaymentController::class)->group(function () {
        Route::get('/user/payments', 'index')->name('user.payments');
        Route::get('/user/payments/{payment}/proof', 'downloadProof')->name('user.payments.proof');
        Route::post('/user/payments/{payment}', 'store')->name('user.payments.store');
    });

    // Virtual consultation — Fig. 11 "Consultation Interface / Session Access".
    // The literal `/user/consultations` stays ahead of the {appointment}
    // wildcard below it, per the convention at the top of this file.
    Route::controller(PatientConsultationController::class)->group(function () {
        Route::get('/user/consultations', 'index')->name('user.consultations');
        Route::get('/user/consultations/{appointment}', 'room')->name('user.consultations.room');
    });

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
        // Task 2.2 — moving an appointment, as one transaction rather than a
        // cancel followed by a hopeful rebook.
        Route::post('/appointments/{appointment}/reschedule', 'reschedule')->name('appointments.reschedule');
        Route::get('/appointments/{appointment}/confirmation', 'confirmation')->name('appointments.confirmation');
        Route::get('/appointments/{appointment}', 'show')->name('appointments.show');
    });
});

// ── Owner (Tier 0) ────────────────────────────────────────────────────────────
//
// GV-6. The account that appoints administrators and is the way back in when
// the last one is locked out. Created only by `php artisan wellcare:owner:create`
// — there is no route here or anywhere else that mints this role, because a
// route that could would be the thing every other control is trying to prevent.
//
// The appointing itself happens on /admin/users, which the owner reaches via
// `users.view`; this group is only their landing workspace.

Route::middleware(['auth', 'verified', 'role:owner'])->group(function () {
    Route::get('/owner/dashboard', [OwnerDashboardController::class, 'index'])
        ->name('owner.dashboard');
});

// ── Data Protection Officer ───────────────────────────────────────────────────
//
// GV-5. The oversight role the Health Privacy Code (Joint AO 2016-0002) names
// and RA 10173 requires a PIC to designate.
//
// Read-only by construction: three GET routes, no writes, and none should be
// added. The role holds `audit.read` and `access-log.read` and NO account
// permission at all — that inability is the control, not a gap in it (NIST
// AU-9(4)). It is also the only role that reads `record_access_log`, because
// that log records the administrators.

Route::middleware(['auth', 'verified', 'role:dpo'])->group(function () {
    Route::controller(DpoOversightController::class)->group(function () {
        Route::get('/dpo/dashboard', 'dashboard')->name('dpo.dashboard');
        Route::get('/dpo/access-log', 'accessLog')
            ->middleware('permission:access-log.read')
            ->name('dpo.access-log');
        Route::get('/dpo/activity-log', 'activityLog')
            ->middleware('permission:audit.read')
            ->name('dpo.activity-log');
    });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// Gated on `role:admin|owner` for reachability and on `permission:` per
// capability for authority — GV-2 in WELLCARE-GOVERNANCE-PLAN.md.
//
// Before 2026-09-10 this group said `role:admin` and nothing else, which meant
// every administrator held every capability the module has, with no way to
// express otherwise. The permission names come from
// RoleAndPermissionSeeder::MATRIX, which is the single place the matrix is
// written down.
//
// The owner is in the group but does NOT hold the patient, archive or
// credentialing permissions, so those routes 403 for them. That is deliberate
// and is the §5.1 property: the tier that appoints administrators has no reach
// into the record.
Route::middleware(['auth', 'verified', 'role:admin|owner'])->group(function () {
    Route::get('/admin/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');

    // Public Contact-page inbox. Administrators only: enquiries can mention
    // symptoms or results, and the owner holds no patient access.
    Route::middleware('role:admin')->controller(AdminContactMessageController::class)->group(function () {
        Route::get('/admin/messages', 'index')->name('admin.messages');
        Route::post('/admin/messages/{message}/handle', 'handle')->name('admin.messages.handle');
    });

    // User management — Fig. 4 "Add New User" / "Manage User Acc" /
    // "Manage User/Roles" / "Deactivate/Reactivate Acc".
    // The literal `users` collection routes stay ABOVE the {user} wildcards.
    Route::middleware('permission:users.view')->controller(AdminUserController::class)->group(function () {
        Route::get('/admin/users', 'index')->name('admin.users');
        Route::post('/admin/users', 'store')->name('admin.users.store');
        Route::put('/admin/users/{user}', 'update')->name('admin.users.update');
        // GV-1. The admin edit form no longer carries a password field at all;
        // recovering somebody else's account means mailing them a signed link,
        // never setting a credential an administrator then knows.
        Route::post('/admin/users/{user}/reset-password', 'resetPassword')
            ->name('admin.users.reset-password');
        Route::post('/admin/users/{user}/role', 'assignRole')->name('admin.users.role');
        Route::post('/admin/users/{user}/activate', 'activate')->name('admin.users.activate');
        Route::post('/admin/users/{user}/deactivate', 'deactivate')->name('admin.users.deactivate');
    });

    // Manage Patient — Fig. 3. Demographics only; clinical data stays with
    // Doctor\PatientRecordController.
    Route::middleware('permission:patients.demographics.view')
        ->controller(AdminPatientController::class)->group(function () {
            Route::get('/admin/patients', 'index')->name('admin.patients');
            Route::put('/admin/patients/{patient}', 'update')
                ->middleware('permission:patients.demographics.update')
                ->name('admin.patients.update');
        });

    // Archive — Fig. 3. `appointments`/`patients` are literal segments and
    // must stay ahead of any future /admin/archive/{id} wildcard.
    Route::middleware('permission:archive.view')
        ->controller(AdminArchiveController::class)->group(function () {
            Route::get('/admin/archive', 'index')->name('admin.archive');
            // Restoring is a separate capability from reading the bin: putting a
            // deleted record back is a mutation of the live data set, and the
            // two are worth granting apart.
            Route::middleware('permission:archive.restore')->group(function () {
                Route::post('/admin/archive/appointments/{id}/restore', 'restoreAppointment')
                    ->name('admin.archive.appointments.restore');
                Route::post('/admin/archive/patients/{id}/restore', 'restorePatient')
                    ->name('admin.archive.patients.restore');
            });
        });

    // The bookable catalogue — what the clinic offers, administered rather
    // than shipped. There is no DELETE route and none should be added: a
    // service is retired with `toggle`, because `appointments.service` holds
    // its slug on every historical row. See AdminServiceController.
    //
    // `services` is a LITERAL collection route and stays ABOVE the
    // {service} wildcards, the same rule as read-all/slots/roster elsewhere.
    Route::middleware('permission:services.manage')
        ->controller(AdminServiceController::class)->group(function () {
            Route::get('/admin/services', 'index')->name('admin.services');
            Route::post('/admin/services', 'store')->name('admin.services.store');

            Route::put('/admin/services/{service}', 'update')->name('admin.services.update');
            Route::post('/admin/services/{service}/toggle', 'toggle')
                ->name('admin.services.toggle');
        });

    // Activity Log — Fig. 3 oval + Fig. 4 "Monitor System". Read-only: there
    // is no update or delete route here, and none should be added.
    Route::get('/admin/activity-log', [AdminActivityLogController::class, 'index'])
        ->middleware('permission:audit.read')
        ->name('admin.activity-log');

    Route::post('/admin/doctors/{doctorId}/out-of-office', [AppointmentController::class, 'markOutOfOffice'])
        ->middleware('permission:staff.schedule.publish')
        ->name('admin.doctors.out-of-office');

    // Staff credentialing and roster governance — Phase 9. The administrator
    // acting as the clinic's medical director: who may practise, in which
    // specialty, during which hours.
    //
    // `roster` is a LITERAL segment and MUST stay above /admin/staff/{user},
    // or Laravel binds the string "roster" to the {user} wildcard and the
    // queue 404s. Same rule as read-all/slots/patient-history elsewhere.
    Route::middleware('permission:staff.credential')
        ->controller(AdminStaffController::class)->group(function () {
            Route::get('/admin/staff', 'index')->name('admin.staff');
            Route::get('/admin/staff/roster', 'roster')->name('admin.staff.roster');

            Route::get('/admin/staff/{user}', 'show')->name('admin.staff.show');
            Route::put('/admin/staff/{user}/credentials', 'storeCredentials')
                ->name('admin.staff.credentials');
            Route::post('/admin/staff/{user}/verify', 'verify')->name('admin.staff.verify');
            Route::post('/admin/staff/{user}/reject', 'reject')->name('admin.staff.reject');
            Route::post('/admin/staff/{user}/suspend', 'suspend')->name('admin.staff.suspend');
            Route::post('/admin/staff/{user}/specialty', 'conferSpecialty')
                ->name('admin.staff.specialty');
            Route::post('/admin/staff/{user}/schedule/publish', 'publishSchedule')
                ->middleware('permission:staff.schedule.publish')
                ->name('admin.staff.schedule.publish');
            Route::post('/admin/staff/{user}/schedule/reject', 'rejectSchedule')
                ->middleware('permission:staff.schedule.publish')
                ->name('admin.staff.schedule.reject');
        });
});

// The WebRTC spike lived here and was deleted 2026-08-04, once presence had been
// verified on two devices and the real room had no remaining unanswered
// question. It was three unauthenticated `local`-only routes backing a static
// page — deliberately outside `auth` because the page carried no session — and
// that is not a shape worth leaving in a repository a moment longer than it
// earns its keep. Everything it proved now lives in
// ConsultationRoomController and is covered by tests.
