<?php

namespace Database\Seeders;

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Models\StaffCredential;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Credentialing files for the seeded clinical staff — Phase 9.
 *
 * Runs AFTER DoctorSeeder and NurseSeeder, and it is not optional: Phase 9
 * derives `doctor_profiles.is_active` from credentialing, so a freshly seeded
 * database with no credentials would have thirty-five doctors that no patient
 * could book. This seeder is what keeps `migrate:fresh --seed` producing a
 * working clinic.
 *
 * The dates are deliberately staggered rather than uniform, so the admin
 * screens and `credentials:sweep` have something real to show at a defence:
 *
 *   • most staff — comfortably current
 *   • one doctor — lapsing inside the 60-day warning window
 *   • one doctor — already lapsed, and therefore unpublished
 *
 * PRC numbers are fictional seven-digit values in the PRC format. They are not
 * real registrations and are not intended to resemble any.
 */
class StaffCredentialSeeder extends Seeder
{
    public function run(): void
    {
        $staff = User::role(['doctor', 'nurse'])
            ->with('doctorProfile')
            ->orderBy('id')
            ->get();

        if ($staff->isEmpty()) {
            $this->command->warn('! No clinical staff found — run DoctorSeeder first.');

            return;
        }

        // The two demonstration cases are picked from DOCTORS specifically, not
        // from the staff list as a whole. Ordered by id the last rows are
        // nurses (NurseSeeder runs after DoctorSeeder), and a lapsed nurse
        // proves nothing on screen — nurses have no doctor_profiles row, so
        // nothing visibly unpublishes.
        $doctorIds = $staff->filter(fn (User $u) => $u->doctorProfile !== null)
            ->pluck('id')
            ->values();

        $lapsedId = $doctorIds->last();
        $expiringId = $doctorIds->count() > 1 ? $doctorIds[$doctorIds->count() - 2] : null;

        $verified = 0;
        $lapsed = 0;

        foreach ($staff as $index => $user) {
            [$prcExpiry, $status] = $this->expiryFor($user->id, $lapsedId, $expiringId, $index);

            $specialty = $user->doctorProfile?->specialty
                ? Specialty::tryFrom($user->doctorProfile->specialty)
                : null;

            // A specialist profile needs the board certificate that backs it,
            // or CredentialingService::conferSpecialty() would refuse to
            // re-confer what the seeder has already written.
            $hasBoard = $specialty?->requiresBoardCertificate() ?? false;

            StaffCredential::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'prc_license_no' => str_pad((string) (1000000 + $user->id), 7, '0', STR_PAD_LEFT),
                    'prc_expires_on' => $prcExpiry,
                    'ptr_no' => 'PTR-'.now()->year.'-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                    'ptr_issued_at_lgu' => 'Dasmariñas City',
                    'ptr_expires_on' => now()->endOfYear(),
                    'philhealth_accreditation_no' => $user->hasRole('doctor')
                        ? 'PH-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT)
                        : null,
                    'specialty_board' => $hasBoard ? $specialty->board() : null,
                    'board_status' => $hasBoard
                        ? BoardStatus::Diplomate->value
                        : BoardStatus::None->value,
                    'medical_certificate_on' => now()->subMonths(2),
                    'status' => $status,
                    // Verified by the seeded administrator, so the audit trail
                    // reads correctly rather than showing an empty approver.
                    'verified_by' => $status === CredentialStatus::Verified
                        ? User::role('admin')->value('id')
                        : null,
                    'verified_at' => $status === CredentialStatus::Verified ? now() : null,
                    'remarks' => $status === CredentialStatus::Expired
                        ? 'Automatically withdrawn: PRC licence expired '
                            .$prcExpiry->format('d M Y').'.'
                        : null,
                ],
            );

            // The invariant: published iff verified. Written here rather than
            // left to the doctor seeder's `is_active` default, so the two can
            // never disagree on a fresh database.
            $user->doctorProfile?->update([
                'is_active' => $status === CredentialStatus::Verified,
            ]);

            match ($status) {
                CredentialStatus::Expired => $lapsed++,
                default => $verified++,
            };
        }

        // Counted through the scope rather than in the loop. Carbon 3's
        // diffInDays() is signed, so a naive `<= 60` on a future date matches
        // everything — and the number reported here should be the same one the
        // admin watchlist renders, from the same query.
        $expiring = StaffCredential::expiringWithin()->count();

        $this->command->info(
            "✓ Credentialing files: {$verified} verified, {$lapsed} lapsed, "
            ."{$expiring} lapsing within 60 days"
        );
    }

    /**
     * PRC expiry and the resulting status for one staff member.
     *
     * Two doctors are singled out as demonstration cases; everybody else gets a
     * date one to three years out, mirroring the real three-year PRC cycle.
     *
     * @return array{0: Carbon, 1: CredentialStatus}
     */
    private function expiryFor(int $userId, ?int $lapsedId, ?int $expiringId, int $index): array
    {
        // Already lapsed — demonstrates the sweep and the unpublished state.
        if ($userId === $lapsedId) {
            return [now()->subDays(12), CredentialStatus::Expired];
        }

        // Inside the 60-day warning window — demonstrates the watchlist.
        if ($userId === $expiringId) {
            return [now()->addDays(24), CredentialStatus::Verified];
        }

        return [now()->addMonths(12 + ($index % 24)), CredentialStatus::Verified];
    }
}
