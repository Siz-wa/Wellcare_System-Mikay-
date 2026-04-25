<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Inertia\Inertia;
use Inertia\Response;

class HRDashboardController extends Controller
{
    public function index(): Response
    {
        $pending = Appointment::where('status', 'pending_hmo_approval')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => [
                'id'         => $a->id,
                'patient'    => trim($a->first_name . ' ' . $a->last_name),
                'initials'   => strtoupper(substr($a->first_name, 0, 1) . substr($a->last_name, 0, 1)),
                'service'    => ucwords(str_replace('-', ' ', $a->service)),
                'date'       => $a->appointment_date->format('d M Y'),
                'time'       => $a->appointment_time,
                'hmo'        => $a->hmo,
                'hmoId'      => $a->hmo_id,
                'isToday'    => $a->appointment_date->isToday(),
                'isTomorrow' => $a->appointment_date->isTomorrow(),
            ]);

        $stats = [
            'pendingHmo'        => $pending->count(),
            'approvedToday'     => Appointment::where('coverage', 'hmo')
                ->where('status', 'requested')
                ->whereDate('updated_at', today())
                ->count(),
            'rejectedToday'     => Appointment::where('coverage', 'hmo')
                ->where('status', 'cancelled')
                ->whereDate('cancelled_at', today())
                ->count(),
            'totalAppointments' => Appointment::whereNotIn('status', ['cancelled', 'no_show'])
                ->whereDate('appointment_date', today())
                ->count(),
        ];

        return Inertia::render('hr/dashboard', [
            'pending' => $pending,
            'stats'   => $stats,
        ]);
    }
}