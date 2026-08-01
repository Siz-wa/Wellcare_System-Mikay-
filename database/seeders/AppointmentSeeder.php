<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AppointmentSeeder extends Seeder
{
    private const SERVICES = [
        'General Consultation',
        'Follow-up Consultation',
        'Blood Pressure Monitoring',
        'Diabetes Management',
        'Pediatric Check-up',
        'Wound Care',
        'ECG',
        'Physical Examination',
        'Vaccination',
        'Prescription Renewal',
    ];

    private const TIMES = [
        '8:00 AM',  '8:30 AM',  '9:00 AM',  '9:30 AM',
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '1:00 PM',  '1:30 PM',  '2:00 PM',  '2:30 PM',
        '3:00 PM',  '3:30 PM',  '4:00 PM',  '4:30 PM',
    ];

    private const BRANCHES = ['Main Branch', 'Annex'];

    /**
     * 10 slots per patient — spread across past, present, and future.
     * 7 past (mix of completed/cancelled), 1 today, 2 upcoming.
     */
    private const SLOT_OFFSETS = [
        ['days' => -90, 'status' => 'completed'],
        ['days' => -70, 'status' => 'completed'],
        ['days' => -55, 'status' => 'completed'],
        ['days' => -40, 'status' => 'cancelled'],
        ['days' => -28, 'status' => 'completed'],
        ['days' => -14, 'status' => 'completed'],
        ['days' => -7,  'status' => 'completed'],
        ['days' => 0,   'status' => 'checked_in'],
        ['days' => 5,   'status' => 'confirmed'],
        ['days' => 18,  'status' => 'requested'],
    ];

    public function run(): void
    {
        $doctors = User::role('doctor')->with('doctorProfile')->get();
        $patients = User::role('user')->with('profile')->get();

        if ($doctors->isEmpty()) {
            $this->command->warn('No doctors found — run DoctorSeeder first.');

            return;
        }

        if ($patients->isEmpty()) {
            $this->command->warn('No patients found — run PatientSeeder first.');

            return;
        }

        foreach ($patients->values() as $patientIndex => $userAccount) {
            $patient = Patient::where('guarantor_id', $userAccount->id)->first();

            if (! $patient) {
                $this->command->warn("No Patient record for {$userAccount->email} — skipping.");

                continue;
            }

            $this->seedAppointmentsForPatient($userAccount, $patient, $doctors, $patientIndex);
            $this->command->info("✓ 10 appointments seeded for {$userAccount->email}");
        }
    }

    private function seedAppointmentsForPatient(User $userAccount, Patient $patient, $doctors, int $patientIndex): void
    {
        $doctorList = $doctors->values();
        $doctorCount = $doctorList->count();
        $timeCount = count(self::TIMES);

        foreach (self::SLOT_OFFSETS as $i => $slot) {
            // Stagger BOTH doctor and time by patient index. Keying off $i alone
            // gave every patient the same doctor at the same time on the same
            // date, which double-books the slot — the unique index rejects it.
            $doctor = $doctorList[($patientIndex * count(self::SLOT_OFFSETS) + $i) % $doctorCount];
            $service = self::SERVICES[$i % count(self::SERVICES)];
            $time = self::TIMES[($patientIndex + $i) % $timeCount];
            $date = Carbon::today()->addDays($slot['days']);
            $status = $slot['status'];

            // Last upcoming slot is HMO, mix cash/hmo elsewhere
            $coverage = ($i === 9) ? 'hmo' : ($i % 3 === 0 ? 'hmo' : 'cash');
            $hmo = ($coverage === 'hmo') ? $this->randomHmo() : null;

            // Slot 9 is an HMO booking 18 days out — exactly the shape of an
            // unverified LOA. Split it so BOTH HR states carry data: half still
            // waiting on the HMO officer, half already approved and waiting on
            // the doctor. Sending every one to 'pending' would just move the
            // empty queue rather than fill it, and an empty queue reads as a
            // broken page.
            if ($i === 9 && $patientIndex % 2 === 0) {
                $status = 'pending_hmo_approval';
            }

            // Slot-level check, NOT scoped to this patient — a slot taken by
            // anyone is taken.
            $exists = Appointment::where('doctor_id', $doctor->id)
                ->where('appointment_date', $date->toDateString())
                ->where('appointment_time', $time)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->exists();

            if ($exists) {
                continue;
            }

            $appointment = Appointment::create([
                'user_id' => $userAccount->id,
                'patient_id' => $patient->id,
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'email' => $patient->email,
                'contact_number' => $patient->contact_number,
                'age' => $patient->age ?? 30,
                'gender' => $patient->gender ?? 'male',
                'doctor_id' => $doctor->id,
                'service' => $service,
                'branch' => self::BRANCHES[$i % 2],
                'appointment_date' => $date->toDateString(),
                'appointment_time' => $time,
                'patient_status' => $i < 4 ? 'returning' : 'new',
                'coverage' => $coverage,
                'hmo' => $hmo,
                'hmo_id' => $hmo ? strtoupper('HMO-'.rand(10000, 99999)) : null,
                'additional_info' => $i % 4 === 0 ? 'Patient requested morning slot.' : null,
                'status' => $status,
                'cancelled_at' => $status === 'cancelled' ? $date->copy()->subDay() : null,
                'cancellation_reason' => $status === 'cancelled' ? 'Doctor unavailable on this date.' : null,
            ]);

            if ($status === 'completed') {
                $this->seedConsultationSession($appointment, $doctor, $patient);
            }

            if (in_array($status, ['confirmed', 'cancelled', 'completed'], true)) {
                $this->seedNotification($appointment, $userAccount);
            }
        }
    }

    // ---- Consultation session ------------------------------------------------

    private function seedConsultationSession(Appointment $appointment, User $doctor, Patient $patient): void
    {
        if ($appointment->consultationSession()->exists()) {
            return;
        }

        $session = $appointment->consultationSession()->create([
            'doctor_id' => $doctor->id,
            'subjective' => 'Patient reports '.$this->randomSymptom().'. Onset approximately 3 days ago.',
            'objective' => 'Patient appears well. Alert and oriented. No acute distress noted.',
            'assessment' => $this->randomAssessment(),
            'plan' => 'Prescribed medications as below. Advised rest and increased fluid intake. Follow-up in 2 weeks.',
            'blood_pressure' => $this->randomBP(),
            'heart_rate' => rand(60, 100).' bpm',
            'temperature' => number_format(rand(366, 374) / 10, 1).' C',
            'oxygen_saturation' => rand(96, 100).'%',
            'weight' => rand(50, 95).' kg',
            'height' => rand(150, 185).' cm',
            'status' => 'finalized',
        ]);

        // 1-3 prescriptions per session
        $rxCount = rand(1, 3);
        for ($p = 0; $p < $rxCount; $p++) {
            $session->prescriptions()->create($this->randomPrescription());
        }

        // 50% chance of recording an allergy during this visit
        if (rand(0, 1)) {
            $this->seedPatientAllergy($appointment, $doctor, $patient);
        }

        // Always record a diagnosis
        $this->seedPatientDiagnosis($appointment, $doctor, $patient);

        // 0-2 documents per completed appointment
        $docCount = rand(0, 2);
        for ($d = 0; $d < $docCount; $d++) {
            $this->seedPatientDocument($appointment, $doctor, $patient);
        }
    }

    // ---- Patient allergy ----------------------------------------------------

    private function seedPatientAllergy(Appointment $appointment, User $doctor, Patient $patient): void
    {
        $allergen = $this->randomAllergen();

        $alreadyExists = PatientAllergy::where('patient_id', $patient->id)
            ->where('allergen', $allergen)
            ->exists();

        if ($alreadyExists) {
            return;
        }

        PatientAllergy::create([
            'patient_id' => $patient->id,
            'user_id' => $appointment->user_id,
            'appointment_id' => $appointment->id,
            'recorded_by' => $doctor->id,
            'allergen' => $allergen,
            'severity' => $this->randomSeverity(),
            'reaction' => $this->randomReaction(),
            'notes' => rand(0, 1) ? 'Noted during consultation. Patient was informed.' : null,
        ]);
    }

    // ---- Patient diagnosis ---------------------------------------------------

    private function seedPatientDiagnosis(Appointment $appointment, User $doctor, Patient $patient): void
    {
        PatientDiagnosis::create([
            'patient_id' => $patient->id,
            'user_id' => $appointment->user_id,
            'appointment_id' => $appointment->id,
            'recorded_by' => $doctor->id,
            'icd_code' => $this->randomIcdCode(),
            'diagnosis' => $this->randomDiagnosis(),
            'type' => $this->randomDiagnosisType(),
            'status' => rand(0, 3) > 0 ? 'resolved' : 'active',
            'diagnosed_at' => $appointment->appointment_date,
            'notes' => rand(0, 1) ? 'Monitored over the course of the consultation.' : null,
        ]);
    }

    // ---- Patient document ---------------------------------------------------

    private function seedPatientDocument(Appointment $appointment, User $doctor, Patient $patient): void
    {
        [$type, $title, $fileName, $mime] = $this->randomDocument(
            $patient->first_name,
            $appointment->appointment_date->format('M-Y')
        );

        PatientDocument::create([
            'patient_id' => $patient->id,
            'user_id' => $appointment->user_id,
            'appointment_id' => $appointment->id,
            'uploaded_by' => $doctor->id,
            'title' => $title,
            'type' => $type,
            'file_path' => "patient-documents/{$patient->id}/{$fileName}",
            'file_name' => $fileName,
            'mime_type' => $mime,
            'file_size' => rand(50000, 3500000),
        ]);
    }

    // ---- Notification -------------------------------------------------------

    private function seedNotification(Appointment $appointment, User $user): void
    {
        $typeMap = [
            'confirmed' => ['confirmed',        'Appointment Confirmed', 'Your appointment has been confirmed.'],
            'cancelled' => ['cancelled',         'Appointment Cancelled', 'Your appointment has been cancelled.'],
            'completed' => ['consultation_done', 'Consultation Complete', 'Your consultation has been finalized.'],
        ];

        [$type, $subject, $body] = $typeMap[$appointment->status];

        AppointmentNotification::create([
            'appointment_id' => $appointment->id,
            'user_id' => $user->id,
            'type' => $type,
            'subject' => $subject,
            'body' => $body.' Service: '.$appointment->service
                                .' on '.$appointment->appointment_date->format('M d, Y').'.',
            'read' => rand(0, 1),
        ]);
    }

    // ---- Random helpers -----------------------------------------------------

    private function randomHmo(): string
    {
        return collect(['Maxicare', 'Medicard', 'PhilHealth', 'Intellicare', 'Caritas Health', 'AXA'])->random();
    }

    private function randomBP(): string
    {
        return rand(110, 135).'/'.rand(70, 90);
    }

    private function randomSymptom(): string
    {
        return collect([
            'mild fever and body aches',
            'persistent cough for 5 days',
            'headache and dizziness',
            'abdominal pain after meals',
            'shortness of breath on exertion',
            'joint pain in the knees',
            'skin rash on the forearm',
            'fatigue and loss of appetite',
        ])->random();
    }

    private function randomAssessment(): string
    {
        return collect([
            'Acute Upper Respiratory Tract Infection',
            'Hypertension Stage 1, well-controlled',
            'Type 2 Diabetes Mellitus, stable',
            'Allergic Rhinitis',
            'Gastroesophageal Reflux Disease (GERD)',
            'Musculoskeletal Pain, lower back',
            'Community-Acquired Pneumonia, mild',
            'Migraine without aura',
        ])->random();
    }

    private function randomPrescription(): array
    {
        return collect([
            ['name' => 'Amoxicillin 500mg',    'instructions' => 'Three times daily after meals, 7 days'],
            ['name' => 'Paracetamol 500mg',    'instructions' => 'Every 6 hours as needed for fever/pain, 5 days'],
            ['name' => 'Losartan 50mg',         'instructions' => 'Once daily in the morning, 30 days'],
            ['name' => 'Metformin 500mg',       'instructions' => 'Twice daily with meals, 30 days'],
            ['name' => 'Cetirizine 10mg',       'instructions' => 'Once daily at bedtime, 14 days'],
            ['name' => 'Omeprazole 20mg',       'instructions' => 'Once daily before breakfast, 14 days'],
            ['name' => 'Ibuprofen 400mg',       'instructions' => 'Three times daily after meals, 5 days'],
            ['name' => 'Azithromycin 500mg',    'instructions' => 'Once daily, 3 days'],
            ['name' => 'Amlodipine 5mg',        'instructions' => 'Once daily, 30 days'],
            ['name' => 'Vitamin C 500mg',       'instructions' => 'Once daily, 30 days'],
            ['name' => 'Atorvastatin 20mg',     'instructions' => 'Once daily at bedtime, 30 days'],
            ['name' => 'Salbutamol 2mg',        'instructions' => 'Three times daily, 7 days'],
            ['name' => 'Clonazepam 0.5mg',      'instructions' => 'Once daily at bedtime, 14 days'],
            ['name' => 'Doxycycline 100mg',     'instructions' => 'Twice daily after meals, 7 days'],
        ])->random();
    }

    private function randomAllergen(): string
    {
        return collect([
            'Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfonamides',
            'Shellfish', 'Peanuts', 'Latex', 'Dust Mites',
            'Codeine', 'Contrast Dye',
        ])->random();
    }

    private function randomSeverity(): string
    {
        return collect(['mild', 'moderate', 'severe'])->random();
    }

    private function randomReaction(): string
    {
        return collect([
            'Hives', 'Anaphylaxis', 'Rash', 'Swelling',
            'Difficulty breathing', 'Nausea', 'Dizziness',
        ])->random();
    }

    private function randomIcdCode(): string
    {
        return collect([
            'J06.9', 'I10', 'E11.9', 'J30.1', 'K21.0',
            'M54.5', 'J18.9', 'G43.909', 'J45.909', 'K59.00',
            'I25.10', 'E78.5', 'J45.20', 'M79.3', 'R51',
        ])->random();
    }

    private function randomDiagnosis(): string
    {
        return collect([
            'Acute Upper Respiratory Tract Infection',
            'Hypertension',
            'Type 2 Diabetes Mellitus',
            'Allergic Rhinitis',
            'Gastroesophageal Reflux Disease',
            'Lumbar Strain',
            'Community-Acquired Pneumonia',
            'Migraine',
            'Bronchial Asthma',
            'Irritable Bowel Syndrome',
            'Coronary Artery Disease',
            'Hyperlipidemia',
            'Tension Headache',
            'Fibromyalgia',
            'Osteoarthritis',
        ])->random();
    }

    private function randomDiagnosisType(): string
    {
        return collect(['primary', 'secondary', 'chronic'])->random();
    }

    private function randomDocument(string $firstName, string $period): array
    {
        $docs = [
            ['lab',          "{$firstName} CBC Results {$period}",         "cbc-results-{$period}.pdf",      'application/pdf'],
            ['lab',          "{$firstName} Urinalysis {$period}",          "urinalysis-{$period}.pdf",       'application/pdf'],
            ['lab',          "{$firstName} Blood Chemistry {$period}",     "blood-chem-{$period}.pdf",       'application/pdf'],
            ['lab',          "{$firstName} HbA1c {$period}",               "hba1c-{$period}.pdf",            'application/pdf'],
            ['imaging',      "{$firstName} Chest X-Ray {$period}",         "chest-xray-{$period}.jpg",       'image/jpeg'],
            ['imaging',      "{$firstName} Ultrasound Report {$period}",   "ultrasound-{$period}.pdf",       'application/pdf'],
            ['imaging',      "{$firstName} ECG Tracing {$period}",         "ecg-{$period}.pdf",              'application/pdf'],
            ['referral',     "{$firstName} Referral Letter {$period}",     "referral-{$period}.pdf",         'application/pdf'],
            ['prescription', "{$firstName} Prescription {$period}",       "prescription-{$period}.pdf",     'application/pdf'],
            ['report',       "{$firstName} Medical Certificate {$period}", "med-certificate-{$period}.pdf",  'application/pdf'],
            ['report',       "{$firstName} Discharge Summary {$period}",   "discharge-{$period}.pdf",        'application/pdf'],
        ];

        return collect($docs)->random();
    }
}
