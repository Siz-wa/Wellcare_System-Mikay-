<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\LogsRecordAccess;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Figure 3's "Archive" use case.
 *
 * No schema work: `appointments` and `patients` have carried softDeletes()
 * since they were created, so archiving already happens — there has simply
 * been no way to see or undo it. This is a read/restore surface over
 * onlyTrashed().
 *
 * Restoring a patient does NOT cascade to their appointments. Laravel's soft
 * deletes carry no parent/child relationship, and guessing at one would
 * resurrect visits that were cancelled for their own reasons. The two lists
 * are restored independently and the UI says so.
 *
 * ## Why this screen is audited more carefully than it looks (GV-4)
 *
 * Every row here is a record somebody deliberately removed. That makes the
 * archive a more sensitive read than the live patient list, not a less
 * sensitive one — it is where a deleted person's details remain legible, and
 * "who looked through the deleted records" is a question a breach
 * investigation will ask. The read is logged for the same reason the live
 * roster is.
 */
class AdminArchiveController extends Controller
{
    use LogsRecordAccess;

    public function index(Request $request): Response
    {
        // GV-4. Unscoped `searched`, like the other index surfaces: the read
        // spans two archives rather than one person's record.
        $this->logRecordAccess('searched');

        $search = $request->string('search')->toString();

        $appointments = Appointment::onlyTrashed()
            ->with('doctor.doctorProfile')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('service', 'like', "%{$search}%");
            }))
            ->orderByDesc('deleted_at')
            ->limit(100)
            ->get();

        $patients = Patient::onlyTrashed()
            ->with('guarantor.profile')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('clinic_id', 'like', "%{$search}%");
            }))
            ->orderByDesc('deleted_at')
            ->limit(100)
            ->get();

        return Inertia::render('admin/archive/archive', [
            'appointments' => $appointments->map(fn (Appointment $a) => [
                'id' => $a->id,
                'patient' => trim($a->first_name.' '.$a->last_name),
                'email' => $a->email,
                'service' => ucwords(str_replace('-', ' ', $a->service)),
                'doctor' => $a->doctor?->doctorProfile?->display_name,
                'date' => $a->appointment_date?->format('d M Y'),
                'time' => $a->appointment_time,
                'status' => $a->status,
                'reason' => $a->cancellation_reason,
                'archivedAt' => $a->deleted_at?->format('d M Y, g:i A'),
            ])->values(),
            'patients' => $patients->map(fn (Patient $p) => [
                'id' => $p->id,
                'name' => trim($p->first_name.' '.$p->last_name),
                'email' => $p->email,
                'clinicId' => $p->clinic_id,
                'contactNumber' => $p->contact_number,
                'guarantor' => $p->guarantor?->name ?: $p->guarantor?->email,
                'archivedAt' => $p->deleted_at?->format('d M Y, g:i A'),
            ])->values(),
            'search' => $search,
            'stats' => [
                'appointments' => Appointment::onlyTrashed()->count(),
                'patients' => Patient::onlyTrashed()->count(),
            ],
        ]);
    }

    public function restoreAppointment(int $id): RedirectResponse
    {
        // findOrFail on the trashed scope: a live appointment must 404 here
        // rather than silently "restoring" a row that was never archived.
        $appointment = Appointment::onlyTrashed()->findOrFail($id);
        $appointment->restore();

        return back()->with(
            'success',
            trim($appointment->first_name.' '.$appointment->last_name)
            .'\'s appointment was restored.'
        );
    }

    public function restorePatient(int $id): RedirectResponse
    {
        $patient = Patient::onlyTrashed()->findOrFail($id);
        $patient->restore();

        return back()->with(
            'success',
            trim($patient->first_name.' '.$patient->last_name)
            .' was restored. Their archived appointments stay archived — restore those separately.'
        );
    }
}
