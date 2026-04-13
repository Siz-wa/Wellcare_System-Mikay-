<?php

namespace App\Http\Resources;

use App\Models\DoctorProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * DoctorResource
 * ──────────────────────────────────────────────────────────────────────────────
 * Serialises a DoctorProfile (with its user relation eager-loaded) into the
 * shape the React front-end expects.
 *
 * The `id` field is the USER id (= doctor_id in the booking system).
 * The front-end sends this back as `doctor_id` when submitting the form.
 *
 * Usage:
 *   DoctorResource::collection(
 *       DoctorProfile::active()->with('user')->get()
 *   )
 *
 * @mixin DoctorProfile
 */
class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // user_id IS the doctor_id used in appointments.doctor_id FK
            'id'             => $this->user_id,
            'name'           => $this->display_name,
            'specialty'      => $this->specialty,
            'specialization' => $this->specialization ?? $this->specialty,
            'initials'       => $this->initials ?? $this->deriveInitials(),
            'color'          => $this->color ?? '#0056b3',
            'is_active'      => $this->is_active,
            // schedules come from availability_blocks, not stored on the profile
            // the front-end DoctorPicker only needs name+specialty for display
        ];
    }

    private function deriveInitials(): string
    {
        $parts = explode(' ', str_replace('Dr. ', '', $this->display_name));
        $first = $parts[0][0]          ?? '';
        $last  = end($parts)[0] ?? '';
        return strtoupper($first . $last);
    }
}