<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Every HMO appointment that predates the `loa_requests` table has no LOA to
     * track, so the patient, nurse and HR surfaces would show nothing for the
     * rows already in the database. This backfills one LOA per existing HMO
     * appointment, deriving its status from the appointment's own state.
     *
     * Same precedent as 2026_04_11_164935_backfill_patient_id_on_record_tables.
     *
     * Written against the query builder rather than Eloquent on purpose: a
     * migration has to keep working after the model changes shape.
     */
    private const SENTINEL = 'Backfilled from appointment #';

    public function up(): void
    {
        $appointments = DB::table('appointments')
            ->where('coverage', 'hmo')
            ->whereNull('deleted_at')
            ->whereNotNull('patient_id')   // loa_requests.patient_id is NOT NULL
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('loa_requests')
                    ->whereColumn('loa_requests.appointment_id', 'appointments.id');
            })
            ->orderBy('id')
            ->get();

        $rows = [];
        $used = [];

        foreach ($appointments as $appointment) {
            [$status, $approvedAt, $rejectedAt] = $this->deriveStatus($appointment);

            $requestedAt = $appointment->created_at ?? now();

            $rows[] = [
                'patient_id' => $appointment->patient_id,
                'user_id' => $appointment->user_id,
                'appointment_id' => $appointment->id,
                // Nothing records who approved these historically — leaving it
                // null is honest, guessing an HR user would not be.
                'approved_by' => null,
                'loa_number' => $this->generateNumber($requestedAt, $used),
                'hmo_provider' => $appointment->hmo,
                'hmo_id' => $appointment->hmo_id,
                'status' => $status,
                'remarks' => self::SENTINEL.$appointment->id,
                'valid_until' => null,
                'requested_at' => $requestedAt,
                'approved_at' => $approvedAt,
                'rejected_at' => $rejectedAt,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted_at' => null,
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('loa_requests')->insert($chunk);
        }
    }

    /**
     * Only the rows this migration created are removed, so a rollback cannot
     * eat LOAs that were submitted through the app afterwards.
     */
    public function down(): void
    {
        DB::table('loa_requests')
            ->where('remarks', 'like', self::SENTINEL.'%')
            ->delete();
    }

    /**
     * The appointment's own status is the only surviving evidence of what the
     * HMO decided, so it drives the LOA status.
     *
     * @return array{0: string, 1: ?string, 2: ?string}
     */
    private function deriveStatus(object $appointment): array
    {
        $fallback = $appointment->updated_at ?? $appointment->created_at ?? now();

        return match ($appointment->status) {
            'pending_hmo_approval' => ['submitted', null, null],
            'cancelled', 'no_show' => ['rejected', null, $appointment->cancelled_at ?? $fallback],
            // requested / confirmed / checked_in / in_progress / completed all
            // mean HR let the appointment through, which is an approval.
            default => ['approved', $fallback, null],
        };
    }

    /**
     * WC-LOA-YYYYMM-NNNN, matching the format the LoaRequest model generates.
     *
     * @param  array<string, true>  $used  numbers claimed earlier in this run,
     *                                     which are not yet visible to a SELECT
     */
    private function generateNumber(mixed $requestedAt, array &$used): string
    {
        $period = Carbon::parse($requestedAt)->format('Ym');
        $sequence = 1;

        do {
            $number = sprintf('WC-LOA-%s-%04d', $period, $sequence);
            $sequence++;
            $taken = isset($used[$number])
                || DB::table('loa_requests')->where('loa_number', $number)->exists();
        } while ($taken);

        $used[$number] = true;

        return $number;
    }
};
