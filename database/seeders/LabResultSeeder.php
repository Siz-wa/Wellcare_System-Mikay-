<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds DFD store TB4 across every workflow state.
 *
 * Deliberately fills all three statuses. AppointmentSeeder never produces a
 * single 'pending_hmo_approval' row, which leaves the HR approvals page blank
 * on a fresh install — the queue looks broken when it is merely empty. Both
 * lab queues must have something in them right after `migrate:fresh --seed`.
 */
class LabResultSeeder extends Seeder
{
    /**
     * Realistic panels, shaped like the mock data the lab-reviews UI was built
     * against. Each parameter is [name, result, unit, ref_range, status].
     *
     * @var array<string, array<int, array{0: string, 1: string, 2: string, 3: string, 4: string}>>
     */
    private const PANELS = [
        'Complete Blood Count' => [
            ['Hemoglobin', '13.2', 'g/dL', '12.0–16.0', 'normal'],
            ['WBC Count', '11.8', '×10³/µL', '4.5–11.0', 'abnormal'],
            ['Platelets', '215', '×10³/µL', '150–400', 'normal'],
            ['Hematocrit', '39.5', '%', '36–46', 'normal'],
        ],
        'Lipid Profile' => [
            ['Total Cholesterol', '228', 'mg/dL', '<200', 'abnormal'],
            ['LDL', '148', 'mg/dL', '<130', 'abnormal'],
            ['HDL', '42', 'mg/dL', '>40', 'normal'],
            ['Triglycerides', '190', 'mg/dL', '<150', 'abnormal'],
        ],
        'HbA1c Test' => [
            ['HbA1c', '9.2', '%', '<5.7', 'abnormal'],
            ['Fasting Glucose', '218', 'mg/dL', '70–99', 'abnormal'],
            ['eAG', '215', 'mg/dL', '70–154', 'abnormal'],
            ['Insulin', '28', 'µIU/mL', '2.6–24.9', 'abnormal'],
        ],
        'Urinalysis' => [
            ['Protein', 'Trace', '', 'Negative', 'abnormal'],
            ['Glucose', 'Negative', '', 'Negative', 'normal'],
            ['WBC', '2–4', '/HPF', '0–5', 'normal'],
            ['pH', '6.0', '', '4.5–8.0', 'normal'],
        ],
        'Thyroid Panel' => [
            ['TSH', '2.1', 'mIU/L', '0.4–4.0', 'normal'],
            ['Free T4', '1.2', 'ng/dL', '0.8–1.8', 'normal'],
            ['Free T3', '3.0', 'pg/mL', '2.3–4.2', 'normal'],
            ['Anti-TPO', '12', 'IU/mL', '<35', 'normal'],
        ],
        'ECG Report' => [
            ['Heart Rate', '112', 'bpm', '60–100', 'abnormal'],
            ['PR Interval', '0.24', 's', '0.12–0.20', 'abnormal'],
            ['QRS Duration', '0.10', 's', '0.06–0.10', 'normal'],
            ['QT Interval', '0.46', 's', '0.35–0.44', 'abnormal'],
        ],
    ];

    private const INTERPRETATIONS = [
        'Complete Blood Count' => 'WBC count slightly elevated. Possible mild infection or inflammation. Recommend follow-up CBC in 1 week.',
        'Lipid Profile' => 'Borderline high cholesterol with elevated LDL and triglycerides. Recommend dietary modification and re-evaluation in 3 months.',
        'HbA1c Test' => 'Severely uncontrolled diabetes. HbA1c of 9.2% indicates poor long-term glycemic control. Immediate medication adjustment and endocrinology referral required.',
        'Urinalysis' => 'Trace proteinuria noted. No signs of active infection. Monitor blood pressure and repeat UA in 4 weeks.',
        'Thyroid Panel' => 'All thyroid parameters within normal limits. No evidence of thyroid dysfunction. Continue current management.',
        'ECG Report' => 'Tachycardia with prolonged PR and QT intervals detected. First-degree AV block suspected. Urgent cardiology consult required.',
    ];

    public function run(): void
    {
        $nurses = User::role('nurse')->get();

        if ($nurses->isEmpty()) {
            $this->command->warn('⚠ No nurses found — run NurseSeeder first. Skipping lab results.');

            return;
        }

        // Only appointments that actually reached a doctor can have lab orders,
        // and they must carry a patient_id — lab results belong to the person
        // seen, not the booking account.
        $appointments = Appointment::whereNotNull('patient_id')
            ->whereIn('status', ['completed', 'in_progress', 'checked_in'])
            ->with('patientRecord')
            ->inRandomOrder()
            ->limit(45)
            ->get()
            ->filter(fn (Appointment $a) => $a->patientRecord !== null)
            ->values();

        if ($appointments->isEmpty()) {
            $this->command->warn('⚠ No eligible appointments found. Skipping lab results.');

            return;
        }

        $panelNames = array_keys(self::PANELS);
        $created = ['requested' => 0, 'recorded' => 0, 'reviewed' => 0];

        foreach ($appointments as $index => $appointment) {
            // Advance the panel only once every three rows. Selecting it with
            // `$index % 6` instead would share a factor with the status cycle
            // below, so each status would only ever see two of the six panels
            // and 'reviewed' rows could never come out normal.
            $testName = $panelNames[intdiv($index, 3) % count($panelNames)];

            // Roughly a third in each state so neither queue is ever empty.
            $status = match ($index % 3) {
                0 => 'requested',
                1 => 'recorded',
                default => 'reviewed',
            };

            $result = $this->seedResult(
                $appointment,
                $testName,
                $status,
                $nurses->random(),
                // Every ninth result is critical, so the doctor's review queue
                // always shows the red-flag state too.
                isCritical: $status !== 'requested' && $index % 9 === 1,
            );

            if ($result) {
                $created[$status]++;
            }
        }

        $this->command->info(sprintf(
            '✓ Lab results seeded: %d requested, %d recorded, %d reviewed',
            $created['requested'],
            $created['recorded'],
            $created['reviewed'],
        ));
    }

    private function seedResult(
        Appointment $appointment,
        string $testName,
        string $status,
        User $nurse,
        bool $isCritical,
    ): ?LabTestResult {
        if (! $appointment->doctor_id) {
            return null;
        }

        $patient = $appointment->patientRecord;
        $requestedAt = $appointment->appointment_date->copy()->addHours(rand(1, 4));

        $severity = match (true) {
            $status === 'requested' => null,
            $isCritical => 'critical',
            default => $this->severityFor($testName),
        };

        $result = LabTestResult::create([
            'patient_id' => $patient->id,
            'user_id' => $appointment->user_id,
            'appointment_id' => $appointment->id,
            'requested_by' => $appointment->doctor_id,
            'recorded_by' => $status === 'requested' ? null : $nurse->id,
            'reviewed_by' => $status === 'reviewed' ? $appointment->doctor_id : null,
            'test_name' => $testName,
            'status' => $status,
            'severity' => $severity,
            'notes' => $status === 'requested'
                ? null
                : 'Specimen collected and processed on site. Values verified against the reference range.',
            'interpretation' => $status === 'reviewed' ? self::INTERPRETATIONS[$testName] : null,
            'requested_at' => $requestedAt,
            'recorded_at' => $status === 'requested' ? null : $requestedAt->copy()->addHours(2),
            'reviewed_at' => $status === 'reviewed' ? $requestedAt->copy()->addHours(5) : null,
        ]);

        // A 'requested' test has no values yet — that is the whole point of the
        // nurse queue, so leave its parameters empty.
        if ($status !== 'requested') {
            foreach (self::PANELS[$testName] as $order => [$name, $value, $unit, $refRange, $paramStatus]) {
                $result->parameters()->create([
                    'name' => $name,
                    'result' => $value,
                    'unit' => $unit ?: null,
                    'ref_range' => $refRange,
                    'status' => $paramStatus,
                    'sort_order' => $order,
                ]);
            }
        }

        return $result;
    }

    /** Derive severity from whether the panel contains any abnormal value. */
    private function severityFor(string $testName): string
    {
        $hasAbnormal = collect(self::PANELS[$testName])
            ->contains(fn (array $parameter) => $parameter[4] === 'abnormal');

        return $hasAbnormal ? 'abnormal' : 'normal';
    }
}
