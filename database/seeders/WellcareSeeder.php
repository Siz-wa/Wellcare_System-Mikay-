<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\AvailabilityBlock;
use App\Models\ConsultationSession;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * WellcareSeeder
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @deprecated DO NOT RUN. Superseded by the DatabaseSeeder chain
 *             (RoleAndPermissionSeeder → DoctorSeeder → HrSeeder →
 *              PatientSeeder → AppointmentSeeder).
 *
 * Two reasons this is dangerous to run now:
 *
 *   1. It TRUNCATES doctor_profiles and force-deletes users, wiping the roster
 *      the rest of the system depends on.
 *   2. It writes Title-Case values ("OB-GYN", "Pediatrics") into `specialty`,
 *      which is a lowercase slug everywhere else — breaking service→specialty
 *      matching in the booking flow.
 *
 * Its day_of_week convention (documented below) is the correct one; that
 * knowledge now lives on AvailabilityBlock::storedDayFor()/isoToStoredDay().
 *
 * Kept for reference only. Original description follows.
 *
 * Seeds the full Wellcare demo dataset:
 *   - 3 HR users
 *   - 10 doctors with profiles and Mon–Fri availability blocks
 *   - 40 patient users, each booking for 1–2 patients (self + family)
 *   - 10 appointments per user (400 total), varied statuses
 *   - Consultation sessions for all completed appointments
 *   - Patient allergies and diagnoses for each patient
 *   - Notifications for key appointment events
 *
 * Run:  php artisan db:seed --class=WellcareSeeder
 * Reset: php artisan migrate:fresh --seed  (if DatabaseSeeder calls this)
 *
 * availability_blocks.day_of_week convention:
 *   BookingService adds +1 to Carbon->dayOfWeek before querying.
 *   So DB stores: Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7, Sun=1
 */
class WellcareSeeder extends Seeder
{
    private const PASSWORD = 'password123';

    private const BRANCH = 'Wellcare Dasmarinas';

    private const SERVICES = [
        'general', 'cardiology', 'dermatology', 'pediatrics',
        'ob-gyne', 'laboratory', 'imaging', 'physical-therapy',
    ];

    private const COVERAGES = ['cash', 'cash', 'cash', 'philhealth', 'hmo'];

    private const HMO_PROVIDERS = ['maxicare', 'medicard', 'intellicare', 'philcare', 'carenet'];

    private const TIME_SLOTS = [
        '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
        '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    ];

    // ─── Doctor data ──────────────────────────────────────────────────────────

    private array $doctorData = [
        ['Maria Santos',      'Internal Medicine', 'General Medicine & Wellness',   'MS', '#2B59C3'],
        ['Jose Reyes',        'Pediatrics',        'General Pediatrics',            'JR', '#16a34a'],
        ['Ana Dela Cruz',     'OB-GYN',            'Obstetrics & Gynecology',       'AD', '#db2777'],
        ['Carlos Bautista',   'Surgery',           'General Surgery',               'CB', '#7c3aed'],
        ['Luisa Aquino',      'Dermatology',       'Cosmetic & Medical Dermatology', 'LA', '#ca8a04'],
        ['Ramon Garcia',      'ENT',               'Ear, Nose & Throat',            'RG', '#0891b2'],
        ['Elena Torres',      'Cardiology',        'Cardiovascular Medicine',        'ET', '#dc2626'],
        ['Miguel Villanueva', 'Ophthalmology',     'Eye Care & Vision',             'MV', '#059669'],
        ['Cristina Lim',      'Psychiatry',        'Mental Health & Behavioral',    'CL', '#6d28d9'],
        ['Roberto Mendoza',   'Dental',            'General & Cosmetic Dentistry',  'RM', '#b45309'],
    ];

    // ─── Patient user data (40 users) ─────────────────────────────────────────

    private array $patientData = [
        // [first, last, email, gender]
        ['Juan',       'Dela Cruz',   'juan.delacruz@gmail.com',     'male'],
        ['Maria',      'Santos',      'maria.santos@yahoo.com',       'female'],
        ['Jose',       'Reyes',       'jose.reyes@gmail.com',         'male'],
        ['Ana',        'Garcia',      'ana.garcia@outlook.com',       'female'],
        ['Pedro',      'Bautista',    'pedro.bautista@gmail.com',     'male'],
        ['Rosa',       'Aquino',      'rosa.aquino@gmail.com',        'female'],
        ['Andres',     'Torres',      'andres.torres@yahoo.com',      'male'],
        ['Liwanag',    'Villanueva',  'liwanag.v@gmail.com',          'female'],
        ['Danilo',     'Mendoza',     'danilo.mendoza@gmail.com',     'male'],
        ['Corazon',    'Flores',      'corazon.flores@outlook.com',   'female'],
        ['Ramon',      'Ramos',       'ramon.ramos@gmail.com',        'male'],
        ['Ligaya',     'Cruz',        'ligaya.cruz@gmail.com',        'female'],
        ['Ernesto',    'Morales',     'ernesto.morales@yahoo.com',    'male'],
        ['Dolores',    'Castillo',    'dolores.castillo@gmail.com',   'female'],
        ['Rodrigo',    'Gutierrez',   'rodrigo.g@gmail.com',          'male'],
        ['Esperanza',  'Rivera',      'esperanza.r@yahoo.com',        'female'],
        ['Fernando',   'Pascual',     'fernando.pascual@gmail.com',   'male'],
        ['Gloria',     'Diaz',        'gloria.diaz@gmail.com',        'female'],
        ['Simplicio',  'Navarro',     'simplicio.n@gmail.com',        'male'],
        ['Milagros',   'Santiago',    'milagros.s@outlook.com',       'female'],
        ['Alfredo',    'Cabrera',     'alfredo.cabrera@gmail.com',    'male'],
        ['Teresita',   'Herrera',     'teresita.h@gmail.com',         'female'],
        ['Renato',     'Salazar',     'renato.salazar@yahoo.com',     'male'],
        ['Nimfa',      'Aguilar',     'nimfa.aguilar@gmail.com',      'female'],
        ['Isagani',    'Tan',         'isagani.tan@gmail.com',        'male'],
        ['Consuelo',   'Chua',        'consuelo.chua@outlook.com',    'female'],
        ['Narciso',    'Sy',          'narciso.sy@gmail.com',         'male'],
        ['Florencia',  'Ong',         'florencia.ong@gmail.com',      'female'],
        ['Leonilo',    'Lim',         'leonilo.lim@yahoo.com',        'male'],
        ['Imelda',     'Go',          'imelda.go@gmail.com',          'female'],
        ['Crisanto',   'Sison',       'crisanto.sison@gmail.com',     'male'],
        ['Pacita',     'Macapagal',   'pacita.m@gmail.com',           'female'],
        ['Alejandro',  'Mangahas',    'alejandro.m@yahoo.com',        'male'],
        ['Soledad',    'Quezon',      'soledad.quezon@gmail.com',     'female'],
        ['Maximo',     'Roxas',       'maximo.roxas@gmail.com',       'male'],
        ['Purificacion', 'Osmeña',     'purificacion.o@outlook.com',   'female'],
        ['Ruperto',    'Laurel',      'ruperto.laurel@gmail.com',     'male'],
        ['Charito',    'Marcos',      'charito.marcos@gmail.com',     'female'],
        ['Edilberto',  'Magsaysay',   'edilberto.m@gmail.com',        'male'],
        ['Adoracion',  'Quirino',     'adoracion.quirino@yahoo.com',  'female'],
    ];

    private array $familyNames = [
        // Extra patients that family-account users book for (first, last, gender, age)
        ['Carlo',    'Dela Cruz', 'male',   8],
        ['Bea',      'Santos',    'female', 35],
        ['Jasmine',  'Reyes',     'female', 12],
        ['Marco',    'Garcia',    'male',   42],
        ['Liza',     'Bautista',  'female', 65],
        ['Theo',     'Aquino',    'male',   5],
        ['Nina',     'Torres',    'female', 28],
        ['Enzo',     'Villanueva', 'male',   17],
        ['Delia',    'Mendoza',   'female', 71],
        ['Rex',      'Flores',    'male',   50],
    ];

    private array $allergies = [
        ['Penicillin',   'severe',   'Anaphylaxis',  'Documented allergy since childhood.'],
        ['Shellfish',    'moderate', 'Hives',         'Reacts to shrimp and crabs.'],
        ['Aspirin',      'mild',     'Rash',          'Mild cutaneous reaction.'],
        ['Sulfa drugs',  'severe',   'Stevens-Johnson syndrome', 'History of severe reaction.'],
        ['Latex',        'moderate', 'Contact dermatitis', null],
        ['Peanuts',      'severe',   'Anaphylaxis',   'Carries epinephrine auto-injector.'],
        ['Ibuprofen',    'mild',     'GI upset',      null],
        ['Amoxicillin',  'moderate', 'Urticaria',     'Cross-reactive with Penicillin.'],
        ['Contrast dye', 'moderate', 'Flushing, nausea', 'Pre-medicate before imaging.'],
        ['Codeine',      'mild',     'Nausea, drowsiness', null],
    ];

    private array $diagnoses = [
        ['J06.9',  'Acute Upper Respiratory Infection', 'primary',   'resolved', 'mild'],
        ['E11.9',  'Type 2 Diabetes Mellitus',          'chronic',   'chronic',  'diet-controlled'],
        ['I10',    'Hypertension',                       'primary',   'chronic',  'on amlodipine 5mg OD'],
        ['J45.9',  'Bronchial Asthma',                  'chronic',   'chronic',  'uses reliever inhaler prn'],
        ['K21.0',  'GERD with Esophagitis',             'primary',   'active',   'proton pump inhibitor prescribed'],
        ['M54.5',  'Low Back Pain',                     'primary',   'resolved', 'resolved with PT'],
        ['F32.0',  'Mild Depressive Episode',           'secondary', 'active',   'referred to psychiatry'],
        ['B34.9',  'Viral Infection NOS',               'primary',   'resolved', null],
        ['N39.0',  'Urinary Tract Infection',           'primary',   'resolved', 'completed antibiotics course'],
        ['L30.9',  'Dermatitis NOS',                    'secondary', 'active',   'topical steroids applied'],
        ['H52.1',  'Myopia',                            'chronic',   'chronic',  'corrective lenses prescribed'],
        ['K29.5',  'Chronic Gastritis',                 'chronic',   'chronic',  'H. pylori negative'],
        ['I25.1',  'Atherosclerotic Heart Disease',     'primary',   'active',   'cardiology follow-up'],
        ['G43.9',  'Migraine',                          'primary',   'active',   'triptan therapy initiated'],
        ['M79.3',  'Panniculitis',                      'secondary', 'resolved', null],
    ];

    private array $soapNotes = [
        [
            'subjective' => 'Patient reports 3-day history of sore throat, nasal congestion, and low-grade fever. Denies difficulty breathing.',
            'objective' => 'T 37.8°C, BP 120/80, HR 82. Pharynx erythematous, no exudates. Lungs clear bilaterally.',
            'assessment' => 'Acute upper respiratory tract infection, viral etiology.',
            'plan' => 'Supportive care — adequate hydration, rest, paracetamol 500mg PRN. RTC if no improvement in 5 days.',
        ],
        [
            'subjective' => 'Patient complains of epigastric pain for 2 weeks, worse after meals, with occasional heartburn.',
            'objective' => 'BP 118/76, HR 78. Abdomen soft, mild epigastric tenderness on deep palpation. No guarding.',
            'assessment' => 'Gastroesophageal reflux disease. Rule out peptic ulcer disease.',
            'plan' => 'Omeprazole 20mg OD x 4 weeks. Dietary modification: avoid fatty/spicy foods, caffeine, alcohol. Upright 30 min post-meals.',
        ],
        [
            'subjective' => 'Routine follow-up for hypertension. Patient reports good medication compliance. No chest pain or palpitations.',
            'objective' => 'BP 135/85, HR 72, RR 16. No pedal edema. Heart: regular rhythm, no murmurs.',
            'assessment' => 'Hypertension — adequately controlled.',
            'plan' => 'Continue Amlodipine 5mg OD. Low-sodium diet reinforced. BP monitoring at home. Follow-up in 3 months.',
        ],
        [
            'subjective' => 'Patient presents with 2-day history of dysuria and urinary frequency. Denies hematuria or flank pain.',
            'objective' => 'T 37.5°C. Suprapubic tenderness present. UA pending.',
            'assessment' => 'Urinary tract infection — uncomplicated cystitis.',
            'plan' => 'Cotrimoxazole DS BID x 7 days. Increase water intake to 2-3L/day. Return if fever or worsening symptoms.',
        ],
        [
            'subjective' => 'Annual physical examination. No specific complaints. Last consult 1 year ago.',
            'objective' => 'BP 122/78, HR 74, BMI 24.2. General: well-appearing. CBC, lipid panel, FBS ordered.',
            'assessment' => 'Annual PE — unremarkable. Awaiting laboratory results.',
            'plan' => 'Results to be discussed on follow-up. Continue healthy lifestyle. Influenza vaccine given.',
        ],
        [
            'subjective' => 'Low back pain radiating to left buttock for 2 weeks. Aggravated by prolonged sitting at work.',
            'objective' => 'Lumbar flexion limited to 60°. Positive straight leg raise left at 45°. No motor deficits.',
            'assessment' => 'Lumbar disc herniation with left-sided radiculopathy.',
            'plan' => 'Referred to physical therapy. Celecoxib 200mg OD x 5 days. Advised ergonomic adjustments at workstation.',
        ],
    ];

    // ─── Run ─────────────────────────────────────────────────────────────────

    public function run(): void
    {
        $this->command->info('🌱 Starting Wellcare seed...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $this->truncateAll();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->ensureRoles();
        $hrUsers = $this->seedHR();
        $doctors = $this->seedDoctors();
        $this->seedAvailabilityBlocks($doctors);
        $patientUsers = $this->seedPatientUsers();
        $this->seedAppointmentsAndRecords($patientUsers, $doctors, $hrUsers);

        $this->command->info('✅ Wellcare seed complete.');
    }

    // ─── Truncate ─────────────────────────────────────────────────────────────

    private function truncateAll(): void
    {
        foreach ([
            'appointment_notifications', 'patient_diagnoses',
            'patient_allergies', 'patient_documents',
            'consultation_sessions', 'appointments',
            'availability_blocks', 'patients',
            'doctor_profiles',
            'model_has_permissions',
        ] as $table) {
            DB::table($table)->truncate();
        }
        // Remove all seeded users (keep any manually created admin)
        // model_has_roles already truncated above
        User::where('email', 'not like', '%@admin.com')
            ->where('email', '!=', 'admin@wellcare.com')
            ->forceDelete();
    }

    // ─── Roles ────────────────────────────────────────────────────────────────

    private function ensureRoles(): void
    {
        foreach (['admin', 'doctor', 'hr', 'user'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    // ─── HR users ─────────────────────────────────────────────────────────────

    private function seedHR(): array
    {
        $hrData = [
            ['Josefa', 'Macaraeg', 'josefa.hr@wellcare.com'],
            ['Rodrigo', 'Dimacali', 'rodrigo.hr@wellcare.com'],
            ['Lourdes', 'Buenaventura', 'lourdes.hr@wellcare.com'],
        ];

        $users = [];
        foreach ($hrData as [$first, $last, $email]) {
            $user = User::create([
                'name' => "{$first} {$last}",
                'email' => $email,
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
            ]);
            $user->assignRole('hr');
            $users[] = $user;
        }
        $this->command->info('  ✓ 3 HR users created');

        return $users;
    }

    // ─── Doctors ─────────────────────────────────────────────────────────────

    private function seedDoctors(): array
    {
        $doctors = [];
        foreach ($this->doctorData as [$name, $specialty, $specialization, $initials, $color]) {
            [$first, $last] = explode(' ', $name, 2);
            $email = strtolower(str_replace(' ', '.', $name)).'@wellcare.com';

            $user = User::create([
                'name' => "Dr. {$name}",
                'email' => $email,
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
            ]);
            $user->assignRole('doctor');

            DoctorProfile::create([
                'user_id' => $user->id,
                'display_name' => "Dr. {$name}",
                'specialty' => $specialty,
                'specialization' => $specialization,
                'initials' => $initials,
                'color' => $color,
                'is_active' => true,
            ]);

            $doctors[] = $user;
        }
        $this->command->info('  ✓ 10 doctors created');

        return $doctors;
    }

    // ─── Availability blocks ──────────────────────────────────────────────────
    // day_of_week uses BookingService convention:
    // Carbon->dayOfWeek + 1 → Mon=2, Tue=3, Wed=4, Thu=5, Fri=6

    private function seedAvailabilityBlocks(array $doctors): void
    {
        $schedules = [
            // [days, start, end, duration_mins]
            [[2, 3, 4, 5, 6], '08:00', '17:00', 30],  // Standard Mon–Fri
            [[2, 3, 4, 5],   '09:00', '16:00', 30],  // Mon–Thu
            [[2, 4, 6],     '08:00', '12:00', 30],  // Mon/Wed/Fri AM only
            [[3, 5],       '14:00', '18:00', 30],  // Tue/Thu PM only
            [[2, 3, 4, 5, 6], '07:00', '15:00', 30],  // Early shift
            [[2, 3, 4, 5, 6], '10:00', '19:00', 30],  // Late shift
            [[2, 4, 6],     '08:00', '17:00', 30],  // Alternate days
            [[3, 5],       '08:00', '17:00', 30],  // Tue/Thu
            [[2, 3, 4, 5, 6], '08:30', '16:30', 30],  // Slightly offset
            [[2, 3, 4, 5, 6], '08:00', '17:00', 30],  // Standard
        ];

        foreach ($doctors as $i => $doctor) {
            [$days, $start, $end, $duration] = $schedules[$i];
            foreach ($days as $day) {
                AvailabilityBlock::create([
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $day,
                    'specific_date' => null,
                    'start_time' => $start.':00',
                    'end_time' => $end.':00',
                    'slot_duration_minutes' => $duration,
                    'is_available' => true,
                ]);
            }
        }
        $this->command->info('  ✓ Availability blocks created');
    }

    // ─── Patient users ────────────────────────────────────────────────────────

    private function seedPatientUsers(): array
    {
        $users = [];
        foreach ($this->patientData as [$first, $last, $email, $gender]) {
            $age = rand(18, 70);
            $user = User::create([
                'name' => "{$first} {$last}",
                'email' => $email,
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
            ]);
            $user->assignRole('user');
            $users[] = [
                'user' => $user,
                'first' => $first,
                'last' => $last,
                'gender' => $gender,
                'age' => $age,
            ];
        }
        $this->command->info('  ✓ 40 patient users created');

        return $users;
    }

    // ─── Appointments + all related records ───────────────────────────────────

    private function seedAppointmentsAndRecords(
        array $patientUsers,
        array $doctors,
        array $hrUsers
    ): void {
        $this->command->info('  Seeding appointments...');
        $bar = $this->command->getOutput()->createProgressBar(count($patientUsers));

        // Status distribution for 10 appointments per user
        $statusPlan = [
            'completed',  'completed',  'completed', 'completed',
            'confirmed',  'confirmed',
            'requested',
            'cancelled',
            'checked_in',
            'in_progress',
        ];

        foreach ($patientUsers as $i => $pu) {
            $user = $pu['user'];
            shuffle($doctors);

            // Each user has a primary patient (themselves) and 30% chance of a family patient
            $primaryPatient = $this->createOrFindPatient(
                $user->id, $pu['first'], $pu['last'],
                $user->email, '09'.rand(100000000, 999999999),
                $pu['age'], $pu['gender']
            );

            $hasFamilyMember = $i % 3 === 0; // every 3rd user has a family member
            $familyPatient = null;
            if ($hasFamilyMember) {
                $fam = $this->familyNames[$i % count($this->familyNames)];
                $familyPatient = $this->createOrFindPatient(
                    $user->id, $fam[0], $fam[1],
                    "family{$i}@wellcare.test",
                    '09'.rand(100000000, 999999999),
                    $fam[3], $fam[2]
                );
            }

            // Seed patient records (allergies, diagnoses)
            $this->seedPatientRecords($primaryPatient, $doctors, $hrUsers);
            if ($familyPatient) {
                $this->seedPatientRecords($familyPatient, $doctors, $hrUsers);
            }

            // Spread appointments across past 6 months + future 2 months
            foreach ($statusPlan as $si => $status) {
                $doctor = $doctors[$si % count($doctors)];

                // Determine which patient this appointment is for
                $patient = ($hasFamilyMember && $si % 4 === 3)
                    ? $familyPatient
                    : $primaryPatient;

                // Date: past for completed/cancelled, future/recent for others
                $daysOffset = match ($status) {
                    'completed' => -rand(7, 180),
                    'cancelled' => -rand(1, 90),
                    'confirmed' => rand(1, 30),
                    'requested' => rand(1, 45),
                    'checked_in' => 0,
                    'in_progress' => 0,
                    default => rand(1, 14),
                };
                $date = Carbon::today()->addDays($daysOffset)->toDateString();
                $time = self::TIME_SLOTS[array_rand(self::TIME_SLOTS)];

                $coverage = self::COVERAGES[array_rand(self::COVERAGES)];
                $service = self::SERVICES[array_rand(self::SERVICES)];

                $appointment = Appointment::create([
                    'user_id' => $user->id,
                    'patient_id' => $patient->id,
                    'first_name' => $patient->first_name,
                    'last_name' => $patient->last_name,
                    'email' => $patient->email,
                    'contact_number' => $patient->contact_number,
                    'age' => $patient->age ?? rand(18, 70),
                    'gender' => $patient->gender ?? 'male',
                    'doctor_id' => $doctor->id,
                    'service' => $service,
                    'branch' => self::BRANCH,
                    'appointment_date' => $date,
                    'appointment_time' => $time,
                    'patient_status' => rand(0, 1) ? 'new' : 'returning',
                    'coverage' => $coverage,
                    'hmo' => $coverage === 'hmo' ? self::HMO_PROVIDERS[array_rand(self::HMO_PROVIDERS)] : null,
                    'hmo_id' => $coverage === 'hmo' ? 'MC-'.rand(100000, 999999) : null,
                    'additional_info' => rand(0, 3) === 0 ? 'Please schedule in the morning if possible.' : null,
                    'status' => $status,
                    'cancellation_reason' => $status === 'cancelled' ? 'Cancelled by patient via dashboard.' : null,
                    'cancelled_at' => $status === 'cancelled' ? Carbon::today()->addDays($daysOffset + 1) : null,
                    'hold_expires_at' => null,
                    'created_at' => Carbon::today()->addDays($daysOffset - 1),
                    'updated_at' => Carbon::today()->addDays($daysOffset),
                ]);

                // Consultation session for completed and in_progress appointments
                if (in_array($status, ['completed', 'in_progress'])) {
                    $soap = $this->soapNotes[array_rand($this->soapNotes)];
                    ConsultationSession::create([
                        'appointment_id' => $appointment->id,
                        'doctor_id' => $doctor->id,
                        'subjective' => $soap['subjective'],
                        'objective' => $soap['objective'],
                        'assessment' => $soap['assessment'],
                        'plan' => $soap['plan'],
                        'blood_pressure' => rand(110, 145).'/'.rand(70, 95),
                        'heart_rate' => (string) rand(60, 100),
                        'temperature' => number_format(rand(365, 378) / 10, 1),
                        'oxygen_saturation' => (string) rand(95, 100),
                        'weight' => (string) rand(45, 95),
                        'height' => (string) rand(150, 185),
                        'status' => $status === 'completed' ? 'finalized' : 'draft',
                        'created_at' => $appointment->appointment_date,
                        'updated_at' => $appointment->appointment_date,
                    ]);
                }

                // Notifications
                $this->seedNotification($appointment, $status, $user, $doctor);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->command->newLine();
        $this->command->info('  ✓ 400 appointments seeded');
    }

    // ─── Patient record ───────────────────────────────────────────────────────

    private function createOrFindPatient(
        int $guarantorId,
        string $first,
        string $last,
        string $email,
        string $phone,
        int $age,
        string $gender
    ): Patient {
        return Patient::firstOrCreate(
            ['first_name' => $first, 'last_name' => $last, 'contact_number' => $phone],
            [
                'guarantor_id' => $guarantorId,
                'email' => $email,
                'age' => $age,
                'gender' => $gender,
                'birthdate' => Carbon::today()->subYears($age)->subDays(rand(0, 364)),
                'address' => $this->randomAddress(),
                'civil_status' => ['single', 'married', 'widowed'][array_rand(['single', 'married', 'widowed'])],
                'default_coverage' => 'cash',
                'clinic_id' => 'WC-'.strtoupper(substr(md5(uniqid()), 0, 6)),
            ]
        );
    }

    private function seedPatientRecords(Patient $patient, array $doctors, array $hrUsers): void
    {
        $doctor = $doctors[array_rand($doctors)];
        $numAllergies = rand(0, 2);
        $numDiagnoses = rand(1, 3);
        $usedAllergies = array_rand($this->allergies, max(1, $numAllergies));
        if (! is_array($usedAllergies)) {
            $usedAllergies = [$usedAllergies];
        }

        foreach (array_slice($usedAllergies, 0, $numAllergies) as $idx) {
            [$allergen, $severity, $reaction, $notes] = $this->allergies[$idx];
            PatientAllergy::firstOrCreate(
                ['patient_id' => $patient->id, 'allergen' => $allergen],
                [
                    'user_id' => $patient->guarantor_id,
                    'recorded_by' => $doctor->id,
                    'severity' => $severity,
                    'reaction' => $reaction,
                    'notes' => $notes,
                ]
            );
        }

        $diagKeys = (array) array_rand($this->diagnoses, min($numDiagnoses, count($this->diagnoses)));
        foreach ($diagKeys as $idx) {
            [$icd, $diagnosis, $type, $status, $notes] = $this->diagnoses[$idx];
            PatientDiagnosis::firstOrCreate(
                ['patient_id' => $patient->id, 'icd_code' => $icd],
                [
                    'user_id' => $patient->guarantor_id,
                    'recorded_by' => $doctor->id,
                    'icd_code' => $icd,
                    'diagnosis' => $diagnosis,
                    'type' => $type,
                    'status' => $status,
                    'diagnosed_at' => Carbon::today()->subDays(rand(30, 730)),
                    'notes' => $notes,
                ]
            );
        }
    }

    // ─── Notifications ────────────────────────────────────────────────────────

    private function seedNotification(
        Appointment $appointment,
        string $status,
        User $user,
        User $doctor
    ): void {
        $date = $appointment->appointment_date;
        $time = $appointment->appointment_time;

        match ($status) {
            'confirmed' => AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $user->id,
                'type' => 'confirmed',
                'subject' => 'Appointment Confirmed',
                'body' => "Your appointment on {$date} at {$time} has been confirmed by your doctor. Please check in when you arrive.",
                'read' => (bool) rand(0, 1),
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->created_at,
            ]),
            'cancelled' => AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $user->id,
                'type' => 'cancelled',
                'subject' => 'Appointment Cancelled',
                'body' => "We're sorry, your appointment on {$date} at {$time} has been cancelled.",
                'read' => (bool) rand(0, 1),
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->created_at,
            ]),
            'checked_in' => AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $doctor->id,
                'type' => 'checked_in',
                'subject' => 'Patient Checked In',
                'body' => "{$appointment->first_name} {$appointment->last_name} has checked in for their {$time} appointment.",
                'read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]),
            'completed' => AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $user->id,
                'type' => 'consultation_done',
                'subject' => 'Consultation Complete',
                'body' => "Your consultation on {$date} has been finalized. Thank you for visiting Wellcare.",
                'read' => true,
                'created_at' => $appointment->updated_at,
                'updated_at' => $appointment->updated_at,
            ]),
            default => null,
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function randomAddress(): string
    {
        $streets = ['Rizal St', 'Bonifacio Ave', 'Mabini St', 'Quezon Blvd', 'Aguinaldo Hwy'];
        $barangays = ['Brgy. San Jose', 'Brgy. Paliparan', 'Brgy. Salawag', 'Brgy. Burol', 'Brgy. Langkaan'];
        $cities = ['Dasmariñas, Cavite', 'Bacoor, Cavite', 'General Trias, Cavite', 'Imus, Cavite'];

        return rand(1, 999).' '.$streets[array_rand($streets)].', '.$barangays[array_rand($barangays)].', '.$cities[array_rand($cities)];
    }
}
