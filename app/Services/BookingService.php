<?php

namespace App\Services;

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\LoaRequest;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BookingService
{
    private const MIN_LEAD_HOURS = 2;

    /**
     * How far ahead the clinic accepts bookings.
     *
     * Public because it is the single source of truth for three layers that
     * previously disagreed: assertLeadTime() below, BookAppointmentRequest's
     * `before:` rule, and the date picker's `max` — which had drifted to a
     * hardcoded 365 days and let patients pick dates a year out that the server
     * then refused.
     */
    public const MAX_LEAD_MONTHS = 3;

    private const HOLD_MINUTES = 10;

    /**
     * How many appointments one patient may hold on a single date.
     *
     * The rule this replaces was "one, ever" — a flat per-patient, per-day
     * conflict check. It made a normal clinic day impossible to book: a
     * consultation at 9 and the lab work it orders at 11 is one visit to the
     * building, not two competing bookings, and the front desk was entering the
     * second by hand because the portal refused it.
     *
     * What is genuinely impossible is being in two rooms at once, so overlap is
     * now what bookSlot() rejects. This cap is the separate, blunter guard that
     * remains: several visits a day is care, a dozen is one account holding
     * slots that other patients cannot then have.
     */
    public const MAX_APPOINTMENTS_PER_PATIENT_PER_DAY = 3;

    /**
     * States an appointment can still be moved from.
     *
     * Mirrors cancelAppointment()'s guard: once someone has checked in, the
     * visit is happening and moving it is a cancellation followed by a new
     * booking, which is a different decision with different consequences.
     *
     * @var array<int, string>
     */
    public const RESCHEDULABLE_STATUSES = ['pending_hmo_approval', 'requested', 'confirmed'];

    /**
     * Slot length assumed when nothing better is known — a doctor whose blocks
     * for the date have since been deleted, or a legacy row predating
     * `appointments.duration_minutes`. Matches the availability_blocks default.
     */
    public const FALLBACK_SLOT_MINUTES = 30;

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

    public function __construct(
        private LoaService $loaRequests,
        private PaymentVerificationService $payments,
    ) {}

    public function getAvailableSlots(int $doctorId, string $date): array
    {
        $cacheKey = "slots:{$doctorId}:{$date}";

        // The cap check lives INSIDE the cached closure on purpose. Outside it
        // would be an extra query on every request, defeating the cache — and
        // it is only a display concern here anyway. bookSlot() re-checks under
        // a lock, which is the authoritative enforcement.
        return Cache::remember($cacheKey, 60, function () use ($doctorId, $date) {
            // A doctor who is not published offers no slots at all — whatever
            // their availability blocks say.
            //
            // Phase 9: `is_active` now means "holds a verified, unlapsed
            // credential", so this is the difference between a suspended doctor
            // silently advertising hours and disappearing as they should.
            // BookAppointmentRequest already refuses to book an inactive doctor,
            // so this is defence in depth rather than the only gate — but
            // without it the slot list contradicts the booking rule, and a
            // patient is shown times that cannot be booked.
            if (! $this->isPublished($doctorId)) {
                return [];
            }

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
     * The slots this doctor has open on a date, minus the ones this patient
     * cannot physically attend.
     *
     * Deliberately a separate method rather than a `$patientId` argument on
     * getAvailableSlots(): that result is cached under "slots:{doctor}:{date}"
     * and shared by every caller, so folding one patient's bookings into it
     * would serve their gaps to the next patient who asked. The doctor-level
     * list stays cached; the per-patient subtraction happens on top of it.
     *
     * This is what keeps the booking form honest. bookSlot() is still the
     * authority — it re-checks under a lock — but a patient should not be
     * offered a time the server is about to refuse.
     *
     * @return array<int, string>
     */
    public function getAvailableSlotsForPatient(int $doctorId, string $date, ?int $patientId): array
    {
        $slots = $this->getAvailableSlots($doctorId, $date);

        if ($patientId === null || $slots === []) {
            return $slots;
        }

        $booked = $this->patientAppointmentsOn($patientId, $date);

        // At their daily maximum: nothing on this date is bookable for them,
        // however much the doctor still has free.
        if ($booked->count() >= self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY) {
            return [];
        }

        if ($booked->isEmpty()) {
            return $slots;
        }

        $duration = $this->slotDurationFor($doctorId, $date);

        return array_values(array_filter($slots, function (string $slot) use ($booked, $date, $duration) {
            [$start, $end] = $this->windowFor($date, $slot, $duration);

            return $booked->every(fn (Appointment $booking) => ! $booking->overlaps($start, $end));
        }));
    }

    /**
     * How many more appointments this patient may hold on a date.
     * Never negative, for the same reason remainingDailyCapacity() is not.
     */
    public function remainingPatientCapacity(int $patientId, string $date): int
    {
        return max(0, self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY
            - $this->patientAppointmentsOn($patientId, $date)->count());
    }

    /**
     * How long one appointment with this doctor lasts on this date.
     *
     * Read off the availability block that generates the slot, so a doctor
     * running 20-minute clinics is measured in 20-minute visits. Where a date
     * is covered by blocks of differing lengths the shortest wins: it is the
     * only choice that cannot overstate how long the patient is occupied, and
     * overstating is what would wrongly reject a legitimate second booking.
     */
    public function slotDurationFor(?int $doctorId, string $date): int
    {
        if ($doctorId === null) {
            return self::FALLBACK_SLOT_MINUTES;
        }

        $blocks = $this->getAvailabilityBlocksForDate($doctorId, Carbon::parse($date));

        return (int) ($blocks->min('slot_duration_minutes') ?: self::FALLBACK_SLOT_MINUTES);
    }

    /**
     * How many patients this doctor still has room for on a date.
     * Never negative — an over-booked day reads as zero, not as a deficit.
     */
    public function remainingDailyCapacity(int $doctorId, string $date): int
    {
        return max(0, $this->dailyCapFor($doctorId) - $this->dailyBookedCount($doctorId, $date));
    }

    /**
     * Whether this doctor is currently published to patients.
     *
     * `doctor_profiles.is_active` is derived from credentialing and written
     * only by CredentialingService — see the invariant documented there.
     *
     * A doctor with no profile row at all reads as NOT published. That is the
     * safe direction: before Phase 9 an admin-created doctor had no row, and
     * treating "no record" as "cleared to practise" is exactly the assumption
     * this phase removed.
     */
    private function isPublished(int $doctorId): bool
    {
        return (bool) DoctorProfile::where('user_id', $doctorId)->value('is_active');
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
            ->whereNotIn('status', Appointment::RELEASED_STATUSES)
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
        $specific = AvailabilityBlock::published()
            ->where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)
            ->exists();

        if ($specific) {
            return true;
        }

        // Fall back to weekly recurring blocks. published() matters here too:
        // without it a doctor whose only schedule is awaiting approval reports
        // "has a schedule", and the UI renders "Fully Booked" instead of
        // "no schedule configured" — the wrong message for the wrong reason.
        return AvailabilityBlock::published()
            ->where('doctor_id', $doctorId)
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

            // 1. Resolve patient identity.
            // The Patient represents the actual person being seen, independent
            // of which account (user_id) was used to book.
            //
            // The web form now names the patient outright — the guarantor picks
            // "who is this appointment for" before the wizard starts — so the
            // identity fields are read off the record rather than the request.
            // That is the point: a name typed slightly differently can no longer
            // fork a second Patient row, and a forged payload cannot rewrite
            // someone's name on the way through.
            //
            // The name-matching fallback stays for callers that have no patient
            // id: staff walk-ins, seeders, and the booking tests.
            if (! empty($validated['patient_id'])) {
                $patient = Patient::findOrFail($validated['patient_id']);
                $validated = [...$validated, ...self::identityOf($patient)];
            } else {
                $patient = Patient::findOrCreateFromBooking(
                    $validated,
                    $validated['user_id'] ?? null
                );
            }

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
                ->whereNotIn('status', Appointment::RELEASED_STATUSES)
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

            // 4. Patient conflict — overlap, not "already booked today".
            //
            // Keyed on patient_id rather than email or name, so the same person
            // is caught whichever account booked them, and locked for the
            // duration of the transaction: two overlapping requests arriving
            // together would otherwise both read a clear day and both commit.
            //
            // The day is read once and both rules below run off that one read.
            $sameDay = $this->patientAppointmentsOn($patient->id, $date, lock: true);

            // 4a. The patient's own daily cap.
            if ($sameDay->count() >= self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY) {
                throw new SlotUnavailableException(
                    'This patient already has the maximum of '
                    .self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY
                    .' appointments on this date. Please choose another day.'
                );
            }

            // 4b. The physical constraint: one person, one place at a time.
            // Half-open windows, so 9:00–9:30 and 9:30–10:00 are back-to-back
            // rather than in conflict — which is the whole point of allowing
            // more than one booking a day.
            $duration = $this->slotDurationFor($doctorId, $date);
            [$start, $end] = $this->windowFor($date, $time, $duration);

            $clash = $sameDay->first(
                fn (Appointment $booked) => $booked->overlaps($start, $end)
            );

            if ($clash) {
                throw new SlotUnavailableException(
                    "This patient is already booked at {$clash->appointment_time} on this date. Please choose a time that does not overlap it."
                );
            }

            // 4c. The DOCTOR's daily cap — the authoritative check.
            // getAvailableSlots() also enforces this, but it is cached for 60s,
            // so two people booking the last slot at once would both see it as
            // free. Locking the day's rows here is what actually holds the line.
            $bookedToday = Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->whereNotIn('status', Appointment::RELEASED_STATUSES)
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
                // Snapshotted, not derived on read: the doctor may reshape
                // their schedule tomorrow, and that must not retroactively
                // change how long a visit already booked is taken to last.
                'duration_minutes' => $duration,
                // Derived, never asked. Whether someone is new or returning is a
                // fact about their record, not an opinion they hold about it —
                // and asking meant a first-time child could be filed as
                // "returning" because their mother had visited before.
                // Callers that still pass it explicitly (seeders, tests) win.
                'patient_status' => $validated['patient_status']
                    ?? $this->derivePatientStatus($patient),
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

            // 5b-ii. A self-paid VIDEO consultation owes the clinic before it
            // happens, and this is the same guarantee as the LOA above: the
            // appointment and the record of what is owed are created together
            // or not at all. Without it a patient could book a virtual visit as
            // "Cash / Self-Pay" — cash being impossible to hand over a video
            // call — attend it, and leave no trace that anything was due.
            //
            // Called unconditionally; raise() itself decides and returns null
            // for every combination that owes nothing (in-person, HMO,
            // PhilHealth, corporate).
            $this->payments->raise($appointment);

            // 5c. Remember how this visit was covered, so the next booking for
            // the same person arrives with the Coverage step already filled.
            // Only ever widens what is known — a blank hmo_id on a cash visit
            // must not erase the member number captured on the last HMO one.
            $this->rememberCoverage($patient, $validated);

            $this->bustSlotCache($doctorId, $date);

            return $appointment;

        }, attempts: 3);
    }

    /**
     * The identity fields an Appointment snapshots off the Patient record.
     *
     * `appointments` denormalises name, email, contact, age and sex — all NOT
     * NULL — so the row still reads correctly years later even if the patient's
     * details change. Sourcing them here, from the record rather than the
     * request, is what makes the client unable to spoof them.
     *
     * @return array<string, mixed>
     */
    private static function identityOf(Patient $patient): array
    {
        return [
            'first_name' => $patient->first_name,
            'last_name' => $patient->last_name,
            'email' => $patient->email,
            'contact_number' => $patient->contact_number,
            // Derived, not the stored column: a patient recorded at 17 three
            // years ago is not 17 today, and this value is snapshotted onto the
            // appointment where the clinic will read it as current.
            'age' => $patient->current_age,
            'gender' => $patient->gender,
        ];
    }

    /**
     * A patient who has been seen before is returning; everyone else is new.
     *
     * Cancelled and no-show appointments do not count — the clinic never saw
     * them, so there is no chart to pull.
     */
    private function derivePatientStatus(Patient $patient): string
    {
        return $patient->appointments()
            ->whereNotIn('status', Appointment::RELEASED_STATUSES)
            ->exists()
            ? 'returning'
            : 'new';
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function rememberCoverage(Patient $patient, array $validated): void
    {
        $changes = array_filter([
            'default_coverage' => $validated['coverage'] ?? null,
            'hmo_provider' => $validated['hmo'] ?? null,
            'hmo_id' => $validated['hmo_id'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        if ($changes !== []) {
            $patient->update($changes);
        }
    }

    /**
     * Task 2.2 — move an appointment to a new slot as ONE transaction.
     *
     * ## Why this is not cancel-then-rebook
     *
     * That was the only path available before, and it is materially worse than
     * it looks. It destroys the appointment's identity and history, discards any
     * HMO approval already granted against it, and — the part that actually
     * harms patients — releases the old slot to the public BEFORE the new one is
     * secured. A patient moving an appointment could end up with none, having
     * had one when they started.
     *
     * Here the target is acquired under `lockForUpdate()` and the origin is only
     * released by the same UPDATE that takes the new slot. There is no moment in
     * between.
     *
     * ## The self-collision
     *
     * Every conflict check has to exclude the appointment being moved, or it
     * conflicts with itself: its own row occupies the patient's day, counts
     * toward the doctor's cap, and — when only the time changes — sits in the
     * same day it is moving within. `$excludeId` threads through all three.
     *
     * ## HMO approval does not travel silently
     *
     * An LOA is approved for a stated date. Moving the appointment past that
     * date invalidates the approval, so the appointment returns to
     * `pending_hmo_approval` and HR sees it again. Doing nothing here would
     * present the front desk with an approved-looking booking whose LOA no
     * longer covers the day it falls on.
     *
     * @throws SlotUnavailableException
     */
    public function rescheduleAppointment(
        Appointment $appointment,
        string $date,
        string $time,
        ?int $doctorId = null,
    ): Appointment {
        if (! in_array($appointment->status, self::RESCHEDULABLE_STATUSES, true)) {
            throw new SlotUnavailableException(
                "An appointment that is {$appointment->status} can no longer be rescheduled."
            );
        }

        $this->assertLeadTime(Carbon::parse($date.' '.$this->to24h($time)));

        $originDoctorId = $appointment->doctor_id;
        $originDate = $appointment->appointment_date->toDateString();

        $moved = DB::transaction(function () use ($appointment, $date, $time, $doctorId) {
            $targetDoctorId = $doctorId ?? $appointment->doctor_id;

            if ($targetDoctorId === null) {
                $targetDoctorId = $this->resolveDoctor((string) $appointment->service, $date, $time);
            } elseif (! $this->isOwnCurrentSlot($appointment, $targetDoctorId, $date, $time)) {
                // assertSlotOffered() tests membership of getAvailableSlots(),
                // which subtracts slots that are already taken — and this
                // appointment's own slot is one of them. Without the exemption,
                // re-submitting the time an appointment already holds (a doctor
                // change, or a no-op save) is refused as "not available", which
                // is both wrong and confusing: the schedule plainly offers it,
                // because this booking is sitting in it.
                $this->assertSlotOffered($targetDoctorId, $date, $time);
            }

            // 1. The target slot, locked. Excludes this appointment so moving it
            //    to a time it already occupies is not reported as a clash.
            $taken = Appointment::where('doctor_id', $targetDoctorId)
                ->where('appointment_date', $date)
                ->where('appointment_time', $time)
                ->where('id', '!=', $appointment->id)
                ->whereNotIn('status', Appointment::RELEASED_STATUSES)
                ->where(function ($q) {
                    $q->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
                })
                ->lockForUpdate()
                ->first();

            if ($taken) {
                throw new SlotUnavailableException(
                    'That slot has just been taken. Please choose another time.'
                );
            }

            // 2. The patient's own day, minus this appointment.
            $sameDay = $this->patientAppointmentsOn(
                (int) $appointment->patient_id,
                $date,
                lock: true,
                excludeId: $appointment->id,
            );

            if ($sameDay->count() >= self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY) {
                throw new SlotUnavailableException(
                    'This patient already has the maximum of '
                    .self::MAX_APPOINTMENTS_PER_PATIENT_PER_DAY
                    .' appointments on that date.'
                );
            }

            $duration = $this->slotDurationFor($targetDoctorId, $date);
            [$start, $end] = $this->windowFor($date, $time, $duration);

            $clash = $sameDay->first(fn (Appointment $b) => $b->overlaps($start, $end));

            if ($clash) {
                throw new SlotUnavailableException(
                    "This patient is already booked at {$clash->appointment_time} on that date."
                );
            }

            // 3. The doctor's daily cap, minus this appointment.
            $bookedToday = Appointment::where('doctor_id', $targetDoctorId)
                ->where('appointment_date', $date)
                ->where('id', '!=', $appointment->id)
                ->whereNotIn('status', Appointment::RELEASED_STATUSES)
                ->where(function ($q) {
                    $q->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
                })
                ->lockForUpdate()
                ->count();

            if ($bookedToday >= $this->dailyCapFor($targetDoctorId)) {
                throw new SlotUnavailableException(
                    'That doctor is fully booked on that date.'
                );
            }

            // 4. Take the new slot and release the old one in a single write.
            $appointment->update([
                'doctor_id' => $targetDoctorId,
                'appointment_date' => $date,
                'appointment_time' => $time,
                'duration_minutes' => $duration,
                // The reminders already sent describe a date that no longer
                // applies. Clearing them lets the sweep remind about the new one
                // — a patient who moved an appointment and is never reminded of
                // the new time is worse off than before they moved it.
                'reminded_ahead_at' => null,
                'reminded_same_day_at' => null,
                'status' => $this->statusAfterMove($appointment, $date),
            ]);

            return $appointment->fresh();
        }, 3);

        // Both days change availability, and they are usually different.
        $this->bustSlotCache($originDoctorId, $originDate);
        $this->bustSlotCache($moved->doctor_id, $date);

        return $moved;
    }

    /**
     * Is this the exact slot the appointment already holds?
     *
     * Same doctor, same date, same time. Used to exempt a reschedule from the
     * availability check, because an appointment cannot be told that the slot it
     * is currently occupying is unavailable.
     */
    private function isOwnCurrentSlot(
        Appointment $appointment,
        int $doctorId,
        string $date,
        string $time,
    ): bool {
        return $appointment->doctor_id === $doctorId
            && $appointment->appointment_date->toDateString() === $date
            && $appointment->appointment_time === $time;
    }

    /**
     * Where a moved appointment lands in the state machine.
     *
     * Only HMO bookings can change: an approved LOA is granted for a stated
     * date, so a move beyond its validity sends the appointment back to HR
     * rather than carrying an approval that no longer covers the visit.
     */
    private function statusAfterMove(Appointment $appointment, string $date): string
    {
        if ($appointment->coverage !== 'hmo') {
            return $appointment->status;
        }

        $loa = LoaRequest::where('appointment_id', $appointment->id)
            ->where('status', 'approved')
            ->first();

        if ($loa === null) {
            // Never approved, or still queued — the status it already carries is
            // still the right one.
            return $appointment->status;
        }

        $stillCovered = $loa->valid_until === null
            || $loa->valid_until->gte(Carbon::parse($date));

        return $stillCovered ? $appointment->status : 'pending_hmo_approval';
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

        // published() on BOTH queries. This one also carries the out-of-office
        // blocks, which is why AvailabilityService::addTimeOff() writes them as
        // published explicitly rather than relying on the column default: an
        // unpublished blackout would be filtered out here and the doctor would
        // keep taking bookings on a day they had closed.
        $specificBlocks = AvailabilityBlock::published()
            ->where('doctor_id', $doctorId)
            ->where('specific_date', $dateStr)->get();

        if ($specificBlocks->where('is_available', false)->isNotEmpty()) {
            return collect();
        }
        if ($specificBlocks->isNotEmpty()) {
            return $specificBlocks->where('is_available', true);
        }

        return AvailabilityBlock::published()
            ->where('doctor_id', $doctorId)
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
            ->whereNotIn('status', Appointment::RELEASED_STATUSES)
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

    /**
     * This patient's live appointments on a date — the ones that still occupy
     * the calendar, in exactly the sense getTakenSlots() and dailyBookedCount()
     * use: cancelled, no-show and expired-hold rows have released their time and
     * must not block a rebooking.
     *
     * `lock: true` is for bookSlot()'s transaction only. Everywhere else this is
     * a read, and taking row locks on a read path would serialise the booking
     * form against itself.
     *
     * @return Collection<int, Appointment>
     */
    private function patientAppointmentsOn(
        int $patientId,
        string $date,
        bool $lock = false,
        ?int $excludeId = null,
    ): Collection {
        return Appointment::where('patient_id', $patientId)
            ->where('appointment_date', $date)
            // Task 2.2 — a rescheduling appointment must not be counted as its
            // own conflict. Null for every other caller.
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->whereNotIn('status', Appointment::RELEASED_STATUSES)
            ->where(function ($q) {
                $q->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
            })
            ->orderBy('appointment_at')
            ->when($lock, fn ($q) => $q->lockForUpdate())
            ->get();
    }

    /**
     * The [start, end) instants a booking at this date and display time covers.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function windowFor(string $date, string $time12, int $durationMinutes): array
    {
        $start = Carbon::parse($date.' '.$this->to24h($time12));

        return [$start, $start->copy()->addMinutes($durationMinutes)];
    }

    private function to24h(string $time12): string
    {
        return Carbon::createFromFormat('g:i A', $time12)->format('H:i');
    }
}
