<?php

namespace App\Http\Controllers\Nurse;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Monitor daily appointments" from the Scope's staff-nurse paragraph and
 * Figure 4's "Monitor Appointment List".
 *
 * Note for the paper: Figure 10 does **not** draw this process — it draws five,
 * and this is not among them. The requirement comes from Figure 4, the Scope
 * and Table 5, which is the three-sources-no-single-figure problem §4 of
 * WELLCARE-BUILD-PLAN.md records for this role.
 *
 * Read-only. The nurse observes the day; doctors confirm and patients check
 * themselves in.
 */
class AppointmentMonitorController extends Controller
{
    /** Statuses that mean the visit is no longer going to happen. */
    private const INACTIVE = ['cancelled', 'no_show'];

    public function index(Request $request): Response
    {
        $date = $this->resolveDate($request);

        $appointments = Appointment::whereDate('appointment_date', $date)
            ->with(['patientRecord', 'doctor.profile'])
            ->orderBy('appointment_time')
            ->get();

        return Inertia::render('nurse/appointments/appointments', [
            'date' => $date->toDateString(),
            'dateLabel' => $date->format('l, d M Y'),
            'isToday' => $date->isToday(),
            'stats' => [
                'total' => $appointments->whereNotIn('status', self::INACTIVE)->count(),
                'checkedIn' => $appointments->where('status', 'checked_in')->count(),
                'inProgress' => $appointments->where('status', 'in_progress')->count(),
                'completed' => $appointments->where('status', 'completed')->count(),
                'cancelled' => $appointments->whereIn('status', self::INACTIVE)->count(),
            ],
            'appointments' => $appointments
                ->map(fn (Appointment $a) => [
                    'id' => $a->id,
                    'patient' => $a->patientRecord?->full_name
                        ?? trim($a->first_name.' '.$a->last_name),
                    'initials' => $a->patientRecord?->initials
                        ?? strtoupper(substr($a->first_name, 0, 1).substr($a->last_name, 0, 1)),
                    'patientId' => $a->patientRecord?->clinic_id,
                    'recordUrl' => $a->patient_id
                        ? route('nurse.patient-records.show', $a->patient_id)
                        : null,
                    'service' => ucwords(str_replace('-', ' ', $a->service)),
                    'time' => $a->appointment_time,
                    'status' => $a->status,
                    'coverage' => $a->coverage,
                    'doctor' => $a->doctor?->name,
                    'contactNumber' => $a->contact_number,
                ])
                ->values(),
        ]);
    }

    /**
     * The day being monitored — defaults to today, and refuses a malformed
     * `date` rather than throwing on the parse.
     *
     * Typed `CarbonInterface`: this app's `today()` helper returns a
     * `CarbonImmutable`, not the mutable `Illuminate\Support\Carbon`.
     */
    private function resolveDate(Request $request): CarbonInterface
    {
        $raw = $request->string('date')->toString();

        if ($raw === '') {
            return today();
        }

        try {
            return CarbonImmutable::parse($raw)->startOfDay();
        } catch (\Throwable) {
            return today();
        }
    }
}
