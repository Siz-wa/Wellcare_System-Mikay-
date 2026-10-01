<?php

namespace App\Services;

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Exceptions\AccountActionNotAllowedException;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Credentialing and privileging — the authority this system was missing.
 *
 * Before Phase 9 nothing in the application decided who was allowed to
 * practise. A doctor account was created and was immediately, permanently
 * bookable; a specialty was whatever string a seeder happened to write. That is
 * not how a Philippine clinic works, and it is not how this one works now.
 *
 * The model follows real practice. A PhilHealth-accredited facility keeps a
 * record of every professional it has credentialed, including the practice
 * privileges conferred on them. The administrator acts as the clinic's medical
 * director: they see the PRC registration, the PTR and the specialty board
 * certificate, and only then confer the specialty and publish the doctor to
 * patients.
 *
 * ── The one invariant ────────────────────────────────────────────────────────
 * `doctor_profiles.is_active` is DERIVED, never set by hand. It mirrors "this
 * person holds a verified, unlapsed credential", and this service is its only
 * writer. Anything else setting it directly reintroduces the exact bug this
 * class exists to remove.
 *
 * All mutation lives here rather than in the controller — the same split
 * BookingService, LoaService and StaffAccountService use.
 */
class CredentialingService
{
    public function __construct(private BookingService $booking) {}

    /**
     * Record or update the documents on file. Always lands in `pending`:
     * changing a licence number invalidates whatever was previously verified,
     * so re-verification is required rather than optional.
     *
     * @param  array<string, mixed>  $input
     */
    public function submit(User $staff, array $input): StaffCredential
    {
        return DB::transaction(function () use ($staff, $input): StaffCredential {
            $credential = StaffCredential::firstOrNew(['user_id' => $staff->id]);

            $credential->fill([
                'prc_license_no' => $input['prc_license_no'] ?? null,
                'prc_expires_on' => $input['prc_expires_on'] ?? null,
                'ptr_no' => $input['ptr_no'] ?? null,
                'ptr_issued_at_lgu' => $input['ptr_issued_at_lgu'] ?? null,
                'ptr_expires_on' => $input['ptr_expires_on'] ?? null,
                'philhealth_accreditation_no' => $input['philhealth_accreditation_no'] ?? null,
                's2_license_no' => $input['s2_license_no'] ?? null,
                'specialty_board' => $input['specialty_board'] ?? null,
                'board_status' => $input['board_status'] ?? BoardStatus::None->value,
                'medical_certificate_on' => $input['medical_certificate_on'] ?? null,
                'status' => CredentialStatus::Pending,
                'verified_by' => null,
                'verified_at' => null,
                'remarks' => $input['remarks'] ?? null,
            ]);

            $credential->save();

            // The documents changed, so any previous clearance no longer
            // stands. Unpublish until somebody looks at them again.
            $this->syncPublishedState($staff, false);

            return $credential->fresh();
        });
    }

    /**
     * Clear a staff member to practise.
     *
     * @throws AccountActionNotAllowedException
     */
    public function verify(User $staff, User $actor): StaffCredential
    {
        $credential = $this->fileFor($staff);

        // A PRC registration is the legal precondition for practising at all.
        // Verifying without one on file would make the whole record decorative.
        if (blank($credential->prc_license_no) || blank($credential->prc_expires_on)) {
            throw new AccountActionNotAllowedException(
                'Record a PRC licence number and its expiry date before verifying '
                .$staff->name.'. A PRC registration is the legal requirement for practising.'
            );
        }

        if ($credential->prc_expires_on->isPast()) {
            throw new AccountActionNotAllowedException(
                "{$staff->name}'s PRC licence expired on "
                .$credential->prc_expires_on->format('d M Y')
                .'. It must be renewed before they can be cleared to see patients.'
            );
        }

        if ($credential->ptr_expires_on?->isPast()) {
            throw new AccountActionNotAllowedException(
                "{$staff->name}'s Professional Tax Receipt expired on "
                .$credential->ptr_expires_on->format('d M Y')
                .'. A PTR is renewed annually and must be current.'
            );
        }

        return DB::transaction(function () use ($staff, $credential, $actor): StaffCredential {
            $credential->update([
                'status' => CredentialStatus::Verified,
                'verified_by' => $actor->id,
                'verified_at' => now(),
            ]);

            $this->syncPublishedState($staff, true);

            return $credential->fresh();
        });
    }

    /** Refuse the documents. The account stays usable; the holder stays unpublished. */
    public function reject(User $staff, User $actor, string $remarks): StaffCredential
    {
        return $this->close($staff, $actor, CredentialStatus::Rejected, $remarks);
    }

    /**
     * Withdraw clearance for cause, independent of any expiry date.
     *
     * @throws AccountActionNotAllowedException
     */
    public function suspend(User $staff, User $actor, string $remarks): StaffCredential
    {
        if ($staff->is($actor)) {
            throw new AccountActionNotAllowedException(
                'You cannot suspend your own credentials.'
            );
        }

        return $this->close($staff, $actor, CredentialStatus::Suspended, $remarks);
    }

    /**
     * Confer a practice privilege — which specialty this person may practise
     * *at this clinic*.
     *
     * The guard is the point of the method. A specialty is not self-declared:
     * PhilHealth accredits a specialist on a Diplomate or Fellow certificate
     * from a Philippine Specialty Board, so the clinic refuses to confer one it
     * has not seen. General practice needs no board and is always available to
     * a PRC-registered physician.
     *
     * @throws AccountActionNotAllowedException
     */
    public function conferSpecialty(User $staff, Specialty $specialty, User $actor): DoctorProfile
    {
        if (! $staff->hasRole('doctor')) {
            throw new AccountActionNotAllowedException(
                $staff->name.' is not a doctor account, so a specialty cannot be conferred.'
            );
        }

        $credential = $staff->credential;

        if ($specialty->requiresBoardCertificate() && ! $credential?->hasBoardCertificate()) {
            throw new AccountActionNotAllowedException(
                'Record a Diplomate or Fellow certificate from the '
                .($specialty->board() ?? 'relevant specialty board')
                .' before conferring '.$specialty->label().'. Only '
                .Specialty::General->label()
                .' may be conferred without a specialty board certificate.'
            );
        }

        $profile = DoctorProfile::firstOrNew(['user_id' => $staff->id]);

        if (! $profile->exists) {
            $profile->fill([
                'display_name' => $staff->name ?: 'Doctor',
                'is_active' => false,
            ]);
        }

        $profile->specialty = $specialty->value;
        $profile->save();

        // Specialty is part of how patients search for a doctor; a slot list
        // cached before the change would still describe the old one.
        $this->booking->bustDoctorSlotCache($staff->id);

        activity('staffcredential')
            ->performedOn($profile)
            ->causedBy($actor)
            ->withProperties(['specialty' => $specialty->value])
            ->log($specialty->label().' was conferred on '.$staff->name);

        return $profile->fresh();
    }

    /**
     * Nightly sweep: expire every credential whose PRC or PTR has lapsed, and
     * unpublish the holder.
     *
     * This is the consequence that makes the expiry dates mean something.
     * Practising on a lapsed PRC is illegal, so the system stops offering that
     * doctor to patients rather than merely showing a warning somebody has to
     * notice. Driven by App\Console\Commands\SweepCredentials.
     *
     * @return array<int, string> names of the staff whose clearance was withdrawn
     */
    public function sweepExpired(): array
    {
        $lapsed = StaffCredential::lapsed()->with('user')->get();
        $withdrawn = [];

        foreach ($lapsed as $credential) {
            DB::transaction(function () use ($credential, &$withdrawn) {
                $credential->update([
                    'status' => CredentialStatus::Expired,
                    'remarks' => $this->lapseReason($credential),
                ]);

                if ($credential->user) {
                    $this->syncPublishedState($credential->user, false);
                    $withdrawn[] = $credential->user->name;
                }
            });
        }

        return $withdrawn;
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private function close(
        User $staff,
        User $actor,
        CredentialStatus $status,
        string $remarks,
    ): StaffCredential {
        $credential = $this->fileFor($staff);

        return DB::transaction(function () use ($staff, $credential, $actor, $status, $remarks): StaffCredential {
            $credential->update([
                'status' => $status,
                'verified_by' => $actor->id,
                'verified_at' => now(),
                'remarks' => $remarks,
            ]);

            $this->syncPublishedState($staff, false);

            return $credential->fresh();
        });
    }

    /**
     * The single writer of `doctor_profiles.is_active`.
     *
     * Publishing is what makes a doctor visible to patients and bookable, so
     * the slot cache is busted on every change — an unpublished doctor whose
     * slots are still cached stays bookable for up to 60 seconds, which is
     * exactly long enough to take an appointment nobody may legally attend.
     *
     * Silently does nothing for a nurse: nurses hold credentials but have no
     * doctor_profiles row and are not bookable.
     */
    private function syncPublishedState(User $staff, bool $published): void
    {
        $updated = DoctorProfile::where('user_id', $staff->id)
            ->update(['is_active' => $published]);

        if ($updated > 0) {
            $this->booking->bustDoctorSlotCache($staff->id);
        }
    }

    /**
     * The credentialing file, created empty if this is the first time anyone
     * has looked at this account.
     */
    private function fileFor(User $staff): StaffCredential
    {
        return $staff->credential ?? StaffCredential::create([
            'user_id' => $staff->id,
            'status' => CredentialStatus::Pending,
        ]);
    }

    private function lapseReason(StaffCredential $credential): string
    {
        $lapsed = [];

        if ($credential->prc_expires_on?->isPast()) {
            $lapsed[] = 'PRC licence expired '.$credential->prc_expires_on->format('d M Y');
        }

        if ($credential->ptr_expires_on?->isPast()) {
            $lapsed[] = 'PTR expired '.$credential->ptr_expires_on->format('d M Y');
        }

        return 'Automatically withdrawn: '.implode('; ', $lapsed).'.';
    }
}
