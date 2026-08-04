<?php

namespace App\Services;

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BookingService
{
    private const MIN_LEAD_HOURS = 2;

    private const MAX_LEAD_MONTHS = 3;

    private const HOLD_MINUTES = 10;

    /**
     * Which doctor_profiles.specialty values can serve a given service.
     * null = any doctor. Mirrors SERVICE_TO_SPECIALTIES in bookingdata.ts.
     */
    private const SERVICE_SPECIALTIES = [
        'general' => null,
        'cardiology' => ['cardiology'],
        'dermatology' => ['dermatology'],
        'pediatrics' => ['pediatrics'],
        'ob-gyne' => ['obstetrics'],
        'orthopedics' => ['orthopedics'],
        'laboratory' => null,
        'imaging' => null,
        'physical-therapy' => null,
    ];

    public function __construct(private LoaService $loaRequests) {}

    public function getAvailableSlots(int $doctorId, string $date): array
    {
        $cacheKey = "slots:{$doctorId}:{$date}";

        // The cap check lives INSIDE the cached closure on purpose. Outside it
        // would be an extra query on every request, defeating the cache — and
        // it is only a display concern here anyway. bookSlot() re-checks under
        // a lock, which is the authoritative enforcement.
        return Cache::remember($cacheKey, 60, function () use ($doctorId, $date) {
            $carbon = Carbon::parse($date);
            $blocks = $this->getAvailabilityBlocksForDate($doctorId, $carbon);
            if ($blocks->isEmpty()) {
                return [];
            }

            // The clinic caps how many patients a doctor sees per day. Once the
            // day is full it is full, however much of the block remains unbooked.
            if ($this->dailyBookedCount($doctorId, $date) >= $this->dailyCapFor($doctorId)) {
                return [];
            }

            $generated = $this->generateSlots($blocks);
            $taken = $this->getTakenSlots($doctorId, $date);

            return array_values(array_diff($generated, $taken));
        });
    }

    /**
     * How many patients this doctor still has room for on a date.
     * Never negative — an over-booked day reads as zero, not as a deficit.
     */
    public function remainingDailyCapacity(int $doctorId, string $date): int
    {
        return max(0, $this->dailyCapFor($doctorId) - $this->dailyBookedCount($doctorId, $date));
    }

    /** The doctor's configured daily patient cap, falling back to clinic policy. */
    public function dailyCapFor(int $doctorId): int
    {
        $cap = DoctorProfile::where('user_id', $doctorId)->value('max_patients_per_day');

        return (int) ($cap ?: DoctorProfile::DEFAULT_DAILY_PATIENT_CAP);
    }

    /**
     * Appointments counting against the daily cap.
     *
     * Deliberately the same predicate as getTakenSlots(): cancelled and no-show
     * rows free their slot, so they must free cap room too, or a day could stay
     * "full" with nobody actually coming in.
     */
    private function dailyBookedCount(int $doctorId, string $date): int
    {
        return Appointment::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($q) {
                $q->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
            })
            ->count();
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
        $carbon = Carbon::parse($date);
        $dayOfWeek = AvailabilityBlock::storedDayFor($carbon);
        $dateStr = $carbon->toDateString();

        // Check specific-date blocks first
        $specific = AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)
            ->exists();

        if ($specific) {
            return true;
        }

        // Fall back to weekly recurring blocks
        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->exists();
    }

    public function bookSlot(array $validated): Appointment
    {
        $requestedAt = Carbon::parse(
            $validated['appointment_date'].' '.$this->to24h($validated['appointment_time'])
        );

        $this->assertLeadTime($requestedAt);

        return DB::transaction(function () use ($validated) {

            $date = $validated['appointment_date'];
            $time = $validated['appointment_time'];

            // 1. Resolve patient identity — find or create Patient record
            // The Patient represents the actual person being seen, independent
            // of which account (user_id) was used to book.
            $patient = Patient::findOrCreateFromBooking(
                $validated,
                $validated['user_id'] ?? null
            );

            // 2. Resolve a concrete doctor.
            // "Next available" must never persist as NULL: every NULL row shares
            // a single doctor_id IS NULL bucket, so two unrelated patients both
            // choosing "next available" would collide even with the whole roster
            // free. Assigning here also means the slot is actually validated —
            // getAvailableSlots() cannot run without a doctor.
            $doctorId = isset($validated['doctor_id']) && $validated['doctor_id'] !== null
                ? (int) $validated['doctor_id']
                : null;

            if ($doctorId === null) {
                $doctorId = $this->resolveDoctor($validated['service'] ?? '', $date, $time);
            } else {
                $this->assertSlotOffered($doctorId, $date, $time);
            }

            // 3. Lock slot to prevent double-booking
            $existing = Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->where('appointment_time', $time)
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

            // 4. Patient conflict — use patient_id not email
            // Same physical person cannot have two appointments on the same day
            // regardless of which account booked them.
            $patientConflict = Appointment::where('patient_id', $patient->id)
                ->where('appointment_date', $date)
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

            // 4b. Daily patient cap — the authoritative check.
            // getAvailableSlots() also enforces this, but it is cached for 60s,
            // so two people booking the last slot at once would both see it as
            // free. Locking the day's rows here is what actually holds the line.
            $bookedToday = Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->where(function ($q) {
                    $q->whereNull('hold_expires_at')
                        ->orWhere('hold_expires_at', '>', now());
                })
                ->lockForUpdate()
                ->count();

            if ($bookedToday >= $this->dailyCapFor($doctorId)) {
                throw new SlotUnavailableException(
                    'This doctor is fully booked on this date. Please choose another day or doctor.'
                );
            }

            // 5. Create appointment linked to the resolved patient
            $appointment = Appointment::create([
                'user_id' => $validated['user_id'] ?? null,
                'patient_id' => $patient->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'age' => $validated['age'],
                'gender' => $validated['gender'],
                'doctor_id' => $doctorId,
                'service' => $validated['service'],
                // Null-coalesced rather than required: the column defaults to
                // in_person, and every caller that predates Phase 3 — including
                // DoubleBookingTest and DailyPatientCapTest, which build their
                // own payload arrays — must keep working untouched.
                'consultation_type' => $validated['consultation_type'] ?? 'in_person',
                'branch' => $validated['branch'] ?? 'Wellcare Dasmarinas',
                'appointment_date' => $date,
                'appointment_time' => $time,
                'patient_status' => $validated['patient_status'],
                'coverage' => $validated['coverage'],
                'hmo' => $validated['hmo'] ?? null,
                'hmo_id' => $validated['hmo_id'] ?? null,
                'additional_info' => $validated['additional_info'] ?? null,
                // HMO appointments go to HR/HMO Officer first for coverage verification.
                // Cash/PhilHealth go directly to the doctor's queue.
                'status' => ($validated['coverage'] === 'hmo')
                    ? 'pending_hmo_approval'
                    : 'requested',
                'hold_expires_at' => now()->addMinutes(self::HOLD_MINUTES),
            ]);

            // 5b. HMO bookings get their Letter of Authorization in the same
            // transaction, so `pending_hmo_approval` can never exist without an
            // LOA row for HR to act on and the patient to track (Objective 1.6,
            // Fig. 6 process 3). LoaService leaves the appointment status
            // alone — only its approve/reject steps move it.
            if ($validated['coverage'] === 'hmo') {
                $this->loaRequests->submit($appointment);
            }

            $this->bustSlotCache($doctorId, $date);

            return $appointment;

        }, attempts: 3);
    }

    public function cancelAppointment(Appointment $appointment, string $reason): Appointment
    {
        if (! in_array($appointment->status, ['pending_hmo_approval', 'requested', 'confirmed'], true)) {
            throw new \LogicException("Cannot cancel an appointment in '{$appointment->status}' state.");
        }

        $appointment->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        $this->bustSlotCache($appointment->doctor_id, $appointment->appointment_date);

        return $appointment->fresh();
    }

    public function invalidateOutOfOffice(int $doctorId, string $date): void
    {
        DB::transaction(function () use ($doctorId, $date) {
            AvailabilityBlock::create([
                'doctor_id' => $doctorId,
                'specific_date' => $date,
                'day_of_week' => null,
                'start_time' => '00:00:00',
                'end_time' => '23:59:00',
                'is_available' => false,
            ]);

            Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->where('status', 'requested')
                ->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => 'Doctor unavailable — Out of Office',
                    'cancelled_at' => now(),
                ]);
        });

        $this->bustSlotCache($doctorId, $date);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Pick a concrete doctor for a "next available" booking: the first active
     * doctor who can serve this service AND actually has the requested slot open.
     */
    private function resolveDoctor(string $service, string $date, string $time): int
    {
        $specialties = self::SERVICE_SPECIALTIES[$service] ?? null;

        $candidates = DoctorProfile::active()
            ->when($specialties !== null, fn ($q) => $q->whereIn('specialty', $specialties))
            ->orderBy('user_id')
            ->pluck('user_id');

        foreach ($candidates as $doctorId) {
            if (in_array($time, $this->getAvailableSlots((int) $doctorId, $date), true)) {
                return (int) $doctorId;
            }
        }

        throw new SlotUnavailableException(
            'No doctor is available at that time. Please choose another slot.'
        );
    }

    /**
     * Reject times the doctor never offered. Without this any well-formed time
     * string is accepted, including ones outside every availability block.
     */
    private function assertSlotOffered(int $doctorId, string $date, string $time): void
    {
        if (! in_array($time, $this->getAvailableSlots($doctorId, $date), true)) {
            throw new SlotUnavailableException(
                'That time is not available for the selected doctor. Please choose another slot.'
            );
        }
    }

    private function getAvailabilityBlocksForDate(int $doctorId, Carbon $date): Collection
    {
        $dayOfWeek = AvailabilityBlock::storedDayFor($date);
        $dateStr = $date->toDateString();

        $specificBlocks = AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)->get();

        if ($specificBlocks->where('is_available', false)->isNotEmpty()) {
            return collect();
        }
        if ($specificBlocks->isNotEmpty()) {
            return $specificBlocks->where('is_available', true);
        }

        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->get();
    }

    private function generateSlots(Collection $blocks): array
    {
        $slots = [];
        foreach ($blocks as $block) {
            $start = Carbon::parse($block->start_time);
            $end = Carbon::parse($block->end_time);
            // The step IS the slot duration. Adding a separate buffer on top
            // produced drifting times (8:00, 8:35, 9:10 …); any changeover gap
            // belongs inside slot_duration_minutes instead.
            $step = $block->slot_duration_minutes;
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
        if ($doctorId === null) {
            return [];
        }

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
                'Appointments must be booked at least '.self::MIN_LEAD_HOURS.' hours in advance.'
            );
        }
        if ($requestedAt->gt($now->copy()->addMonths(self::MAX_LEAD_MONTHS))) {
            throw new SlotUnavailableException(
                'Appointments cannot be booked more than '.self::MAX_LEAD_MONTHS.' months in advance.'
            );
        }
    }

    private function bustSlotCache(?int $doctorId, string $date): void
    {
        if ($doctorId === null) {
            return;
        }
        Cache::forget("slots:{$doctorId}:{$date}");
    }

    /**
     * Drop every cached slot list for one doctor.
     *
     * Editing a weekly recurring block changes availability on every matching
     * date, not one — so the per-date bustSlotCache() above is not enough.
     * Nothing enumerates the cache keys for us, so walk the bookable window
     * (today through MAX_LEAD_MONTHS) and forget each day. Schedule edits are
     * rare, so ~90 deletes is a fair price for keeping the read path's cache
     * key format untouched.
     */
    public function bustDoctorSlotCache(int $doctorId): void
    {
        $cursor = Carbon::today();
        $end = Carbon::today()->addMonths(self::MAX_LEAD_MONTHS);

        while ($cursor->lte($end)) {
            $this->bustSlotCache($doctorId, $cursor->toDateString());
            $cursor->addDay();
        }
    }

    private function to24h(string $time12): string
    {
        return Carbon::createFromFormat('g:i A', $time12)->format('H:i');
    }
}
