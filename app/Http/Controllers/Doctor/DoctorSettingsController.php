<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Resources\DoctorResource;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The settings page previously rendered a single hardcoded mock, so every
 * doctor who opened it saw the same fictional identity. It now reflects the
 * signed-in doctor's own doctor_profiles row.
 */
class DoctorSettingsController extends Controller
{
    public function index(): Response
    {
        /** @var User $user */
        $user = Auth::user();
        $profile = $user->doctorProfile;

        // Reuse DoctorResource so initials/color/specialization fall back
        // exactly the same way they do in the booking picker.
        $doctor = $profile
            ? (new DoctorResource($profile))->resolve()
            : [
                'id' => $user->id,
                'name' => $user->name,
                'specialty' => '',
                'specialization' => '',
                'initials' => strtoupper(mb_substr($user->name, 0, 2)),
                'color' => '#0056b3',
                'is_active' => false,
            ];

        return Inertia::render('doctor/settings/index', [
            'doctor' => array_merge($doctor, [
                'email' => $user->email,
                'phone' => $user->profile?->contact_number,
            ]),
        ]);
    }
}
