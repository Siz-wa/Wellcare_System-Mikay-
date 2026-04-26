<?php

namespace App\Services;

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BookingService
{
    private const MIN_LEAD_HOURS  = 2;
    private const MAX_LEAD_MONTHS = 3;
    private const HOLD_MINUTES    = 10;
    private const BUFFER_MINUTES  = 5;

    public function getAvailableSlots(int $doctorId, string $date): array
    {
        $cacheKey = "slots:{$doctorId}:{$date}";

        return Cache::remember($cacheKey, 60, function () use ($doctorId, $date) {
            $carbon = Carbon::parse($date);
            $blocks = $this->getAvailabilityBlocksForDate($doctorId, $carbon);
            if ($blocks->isEmpty()) return [];
            $generated = $this->generateSlots($blocks);
            $taken     = $this->getTakenSlots($doctorId, $date);
            return array_values(array_diff($generated, $taken));
        });
    }

    /**
     * Returns true if the doctor has ANY availability blocks configured for
     * the given date (either a specific-date block or a weekly recurring block).
     *
     * Used by doctorAvailability to distinguish:
     *   - No schedule configured  → don't show "Fully Booked"
     *   - Has schedule, all taken → show "Fully Booked"
     */
    public function hasSchedule(int $doctorId, string $date): bool
    {
        $carbon    = Carbon::parse($date);
        // MySQL DAYOFWEEK convention: 1=Sun, 2=Mon, ..., 6=Fri, 7=Sat
        // Carbon dayOfWeek:           0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
        // Add +1 to convert Carbon to MySQL convention so DB lookups match.
        $dayOfWeek = $carbon->dayOfWeek + 1;
        $dateStr   = $carbon->toDateString();

        // Check specific-date blocks first
        $specific = AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)
            ->exists();

        if ($specific) return true;

        // Fall back to weekly recurring blocks
        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->exists();
    }

    public function bookSlot(array $validated): Appointment
    {
        $requestedAt = Carbon::parse(
            $validated['appointment_date'] . ' ' . $this->to24h($validated['appointment_time'])
        );

        $this->assertLeadTime($requestedAt);

        return DB::transaction(function () use ($validated, $requestedAt) {

            // 1. Resolve patient identity — find or create Patient record
            // The Patient represents the actual person being seen, independent
            // of which account (user_id) was used to book.
            $patient = Patient::findOrCreateFromBooking(
                $validated,
                $validated['user_id'] ?? null
            );

            // 2. Lock slot to prevent double-booking
            $existing = Appointment::where('doctor_id',        $validated['doctor_id'] ?? null)
                ->where('appointment_date', $validated['appointment_date'])
                ->where('appointment_time', $validated['appointment_time'])
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->where(function ($q) {
                    $q->whereNull('hold_expires_at')
                      ->orWhere('hold_expires_at', '>', now());
                })
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw new SlotUnavailableException(
                    'This slot is no longer available. Please choose another time.'
                );
            }

            // 3. Patient conflict — use patient_id not email
            // Same physical person cannot have two appointments on the same day
            // regardless of which account booked them.
            $patientConflict = Appointment::where('patient_id', $patient->id)
                ->where('appointment_date', $validated['appointment_date'])
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->where(function ($q) {
                    $q->whereNull('hold_expires_at')
                      ->orWhere('hold_expires_at', '>', now());
                })
                ->lockForUpdate()
                ->exists();

            if ($patientConflict) {
                throw new SlotUnavailableException(
                    'This patient already has an appointment on this date.'
                );
            }

            // 4. Create appointment linked to the resolved patient
            $appointment = Appointment::create([
                'user_id'          => $validated['user_id']       ?? null,
                'patient_id'       => $patient->id,
                'first_name'       => $validated['first_name'],
                'last_name'        => $validated['last_name'],
                'email'            => $validated['email'],
                'contact_number'   => $validated['contact_number'],
                'age'              => $validated['age'],
                'gender'           => $validated['gender'],
                'doctor_id'        => $validated['doctor_id']      ?? null,
                'service'          => $validated['service'],
                'branch'           => $validated['branch']         ?? 'Wellcare Dasmarinas',
                'appointment_date' => $validated['appointment_date'],
                'appointment_time' => $validated['appointment_time'],
                'patient_status'   => $validated['patient_status'],
                'coverage'         => $validated['coverage'],
                'hmo'              => $validated['hmo']            ?? null,
                'hmo_id'           => $validated['hmo_id']         ?? null,
                'additional_info'  => $validated['additional_info'] ?? null,
                // HMO appointments go to HR/HMO Officer first for coverage verification.
                // Cash/PhilHealth go directly to the doctor's queue.
                'status'           => ($validated['coverage'] === 'hmo')
                    ? 'pending_hmo_approval'
                    : 'requested',
                'hold_expires_at'  => now()->addMinutes(self::HOLD_MINUTES),
            ]);

            $this->bustSlotCache($validated['doctor_id'] ?? null, $validated['appointment_date']);

            return $appointment;

        }, attempts: 3);
    }

    public function cancelAppointment(Appointment $appointment, string $reason): Appointment
    {
        if (! in_array($appointment->status, ['pending_hmo_approval', 'requested', 'confirmed'], true)) {
            throw new \LogicException("Cannot cancel an appointment in '{$appointment->status}' state.");
        }

        $appointment->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $reason,
            'cancelled_at'        => now(),
        ]);

        $this->bustSlotCache($appointment->doctor_id, $appointment->appointment_date);
        return $appointment->fresh();
    }

    public function invalidateOutOfOffice(int $doctorId, string $date): void
    {
        DB::transaction(function () use ($doctorId, $date) {
            AvailabilityBlock::create([
                'doctor_id'     => $doctorId,
                'specific_date' => $date,
                'day_of_week'   => null,
                'start_time'    => '00:00:00',
                'end_time'      => '23:59:00',
                'is_available'  => false,
            ]);

            Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->where('status', 'requested')
                ->update([
                    'status'              => 'cancelled',
                    'cancellation_reason' => 'Doctor unavailable — Out of Office',
                    'cancelled_at'        => now(),
                ]);
        });

        $this->bustSlotCache($doctorId, $date);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function getAvailabilityBlocksForDate(int $doctorId, Carbon $date): Collection
    {
        // MySQL DAYOFWEEK convention: 1=Sun...6=Fri...7=Sat (Carbon is 0-6)
        $dayOfWeek = $date->dayOfWeek + 1;
        $dateStr   = $date->toDateString();

        $specificBlocks = AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)->get();

        if ($specificBlocks->where('is_available', false)->isNotEmpty()) return collect();
        if ($specificBlocks->isNotEmpty()) return $specificBlocks->where('is_available', true);

        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->get();
    }

    private function generateSlots(Collection $blocks): array
    {
        $slots = [];
        foreach ($blocks as $block) {
            $start  = Carbon::parse($block->start_time);
            $end    = Carbon::parse($block->end_time);
            $step   = $block->slot_duration_minutes + self::BUFFER_MINUTES;
            $cursor = $start->copy();
            while ($cursor->copy()->addMinutes($block->slot_duration_minutes)->lte($end)) {
                $slots[] = $cursor->format('g:i A');
                $cursor->addMinutes($step);
            }
        }
        return array_unique($slots);
    }

    private function getTakenSlots(?int $doctorId, string $date): array
    {
        if ($doctorId === null) return [];
        return Appointment::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($q) {
                $q->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
            })
            ->pluck('appointment_time')->toArray();
    }

    private function assertLeadTime(Carbon $requestedAt): void
    {
        $now = now();
        if ($requestedAt->lt($now->copy()->addHours(self::MIN_LEAD_HOURS))) {
            throw new SlotUnavailableException(
                'Appointments must be booked at least ' . self::MIN_LEAD_HOURS . ' hours in advance.'
            );
        }
        if ($requestedAt->gt($now->copy()->addMonths(self::MAX_LEAD_MONTHS))) {
            throw new SlotUnavailableException(
                'Appointments cannot be booked more than ' . self::MAX_LEAD_MONTHS . ' months in advance.'
            );
        }
    }

    private function bustSlotCache(?int $doctorId, string $date): void
    {
        if ($doctorId === null) return;
        Cache::forget("slots:{$doctorId}:{$date}");
    }

    private function to24h(string $time12): string
    {
        return Carbon::createFromFormat('g:i A', $time12)->format('H:i');
    }
}