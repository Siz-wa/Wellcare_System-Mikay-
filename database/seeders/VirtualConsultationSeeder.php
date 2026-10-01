<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use App\Services\PaymentVerificationService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Video consultations, one at each step of the payment workflow.
 *
 * AppointmentSeeder writes every row as in-person, so a freshly seeded
 * database had no virtual booking at all: the Payments queue was empty, no
 * patient had a fee to settle, and demonstrating the video room meant first
 * booking one by hand, paying it, and verifying it from a second account.
 *
 * Each case below is a demo script's starting point:
 *
 *   ready    — today, checked in, payment verified. The doctor can open the
 *              video room immediately (gates G2, G3 and G5 all pass).
 *   verify   — today, confirmed, payment submitted. Sits in the HR payment
 *              queue waiting for someone to match the reference.
 *   owed     — in four days, confirmed, payment pending. The patient sees the
 *              "Payment needed" notice and the Pay form.
 *   history  — two weeks ago, completed, paid, with a finalized virtual
 *              session — what a past video visit looks like in the record.
 *
 * Payments go through PaymentVerificationService rather than being written
 * directly, so the rows, their references and the bell notifications are the
 * ones a real booking produces. Must run after AppointmentSeeder (patients,
 * doctors and HR officers exist) and is idempotent: a patient who already has
 * a virtual booking is skipped.
 */
class VirtualConsultationSeeder extends Seeder
{
    /**
     * @var array<int, array{email: string, service: string, days: int, time: string, status: string, payment: string}>
     */
    private const CASES = [
        ['email' => 'juan.dela.cruz@gmail.com', 'service' => 'general',           'days' => 0,   'time' => '5:00 PM',  'status' => 'checked_in', 'payment' => 'verified'],
        ['email' => 'maria.santos@gmail.com',   'service' => 'internal-medicine', 'days' => 0,   'time' => '5:30 PM',  'status' => 'confirmed',  'payment' => 'submitted'],
        ['email' => 'pedro.reyes@gmail.com',    'service' => 'dermatology',       'days' => 4,   'time' => '10:00 AM', 'status' => 'confirmed',  'payment' => 'pending'],
        ['email' => 'ana.gomez@gmail.com',      'service' => 'cardiology',        'days' => -14, 'time' => '2:00 PM',  'status' => 'completed',  'payment' => 'verified'],
    ];

    public function run(PaymentVerificationService $payments): void
    {
        $verifier = User::role('hr')->where('is_active', true)->first();

        if (! $verifier) {
            $this->command->warn('No HR officer found — run HrSeeder first.');

            return;
        }

        foreach (self::CASES as $case) {
            $account = User::where('email', $case['email'])->first();
            $patient = $account ? Patient::where('guarantor_id', $account->id)->first() : null;
            $doctor = $this->doctorFor($case['service']);

            if (! $account || ! $patient || ! $doctor) {
                $this->command->warn("Skipped virtual booking for {$case['email']} — patient or doctor missing.");

                continue;
            }

            $alreadySeeded = Appointment::where('patient_id', $patient->id)
                ->where('consultation_type', 'virtual')
                ->exists();

            if ($alreadySeeded) {
                continue;
            }

            $date = Carbon::today()->addDays($case['days']);
            $time = $this->freeTime($doctor, $date, $case['time']);

            if (! $time) {
                $this->command->warn("Skipped virtual booking for {$case['email']} — no free slot.");

                continue;
            }

            $appointment = Appointment::create([
                'user_id' => $account->id,
                'patient_id' => $patient->id,
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'email' => $patient->email,
                'contact_number' => $patient->contact_number,
                'age' => $patient->age ?? 30,
                'gender' => $patient->gender ?? 'male',
                'doctor_id' => $doctor->id,
                'service' => $case['service'],
                'branch' => 'Main Branch',
                'appointment_date' => $date->toDateString(),
                'appointment_time' => $time,
                'patient_status' => 'returning',
                'coverage' => 'cash',
                'consultation_type' => 'virtual',
                'additional_info' => 'Prefers a video consultation.',
                'status' => $case['status'],
            ]);

            $payment = $payments->raise($appointment);

            if ($payment && $case['payment'] !== 'pending') {
                $payment = $payments->submit(
                    $payment,
                    'gcash',
                    (float) $payment->amount_due,
                    '10'.str_pad((string) $appointment->id, 11, '0', STR_PAD_LEFT),
                );
            }

            if ($payment && $case['payment'] === 'verified') {
                $payments->verify($payment, $verifier, 'Matched against the clinic GCash statement.');
            }

            if ($case['status'] === 'completed') {
                $appointment->consultationSession()->create([
                    'doctor_id' => $doctor->id,
                    'mode' => 'virtual',
                    'vitals_source' => 'patient_reported',
                    'subjective' => 'Follow-up on intermittent palpitations, now less frequent. Home BP log reviewed on screen.',
                    'objective' => 'Seen over video. Alert, speaking in full sentences, no visible distress. Home BP readings 118–126/76–82.',
                    'assessment' => 'Palpitations, likely benign; blood pressure well controlled.',
                    'plan' => 'Continue current medication. Limit caffeine. Return in person if palpitations recur with dizziness.',
                    'blood_pressure' => '122/80',
                    'heart_rate' => '78 bpm',
                    'status' => 'finalized',
                ]);
            }

            $this->command->info("✓ Virtual consultation ({$case['payment']}) seeded for {$case['email']}");
        }
    }

    /**
     * The preferred time, or the next half hour the doctor is not already
     * booked for. A slot taken by anyone is taken — the unique active-slot
     * index would reject a second row.
     */
    private function freeTime(User $doctor, Carbon $date, string $preferred): ?string
    {
        $candidate = Carbon::parse($date->toDateString().' '.$preferred);

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $time = $candidate->format('g:i A');

            $taken = Appointment::where('doctor_id', $doctor->id)
                ->where('appointment_date', $date->toDateString())
                ->where('appointment_time', $time)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->exists();

            if (! $taken) {
                return $time;
            }

            $candidate->addMinutes(30);
        }

        return null;
    }

    /**
     * The first active doctor who offers the service.
     *
     * Read through `services.specialties`, the same mapping the booking form
     * uses: service slugs and doctor specialties are different vocabularies
     * (`internal-medicine` is served by `internal_medicine`).
     */
    private function doctorFor(string $service): ?User
    {
        $specialties = Service::where('slug', $service)->value('specialties') ?? [];

        return User::role('doctor')
            ->whereHas('doctorProfile', fn ($profile) => $profile
                ->whereIn('specialty', $specialties)
                ->where('is_active', true))
            ->orderBy('id')
            ->first();
    }
}
