<?php

namespace Database\Seeders;

use App\Models\DoctorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * DoctorProfileSeeder
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * @deprecated DO NOT RUN. Superseded by DoctorSeeder.
 *
 * This bootstrapped doctor_profiles from the old hardcoded doctorsData.ts array,
 * which no longer exists — the public doctors page now reads the database.
 *
 * Worse, it writes Title-Case display strings ("OB-GYN", "Pediatrics") into the
 * `specialty` column, which is a lowercase slug ("obstetrics", "pediatrics")
 * everywhere else. Because it uses updateOrCreate, running it after DoctorSeeder
 * OVERWRITES the correct slugs. That silently breaks:
 *
 *   - SERVICE_TO_SPECIALTIES matching in the booking flow (OB-Gyne returns zero
 *     doctors, since "obstetrics" never matches "OB-GYN")
 *   - BookingService::SERVICE_SPECIALTIES, same mismatch
 *   - DoctorProfile::scopeForSpecialties()
 *
 * Kept only for reference. It is not registered in DatabaseSeeder.
 */
final class DoctorProfileSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure the "doctor" role exists
        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);

        foreach ($this->doctors() as $data) {
            // Derive a deterministic email from the slug
            $email = $data['id'].'@wellcare.ph';

            // Note: no `name` column — display name lives in doctor_profiles.display_name
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                ]
            );

            // Assign role (idempotent)
            if (! $user->hasRole('doctor')) {
                $user->assignRole($doctorRole);
            }

            // Create or update the profile
            DoctorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'display_name' => $data['name'],
                    'specialty' => $data['specialty'],
                    'specialization' => $data['specialization'],
                    'initials' => $data['initials'],
                    'color' => $data['color'],
                    'is_active' => true,
                ]
            );
        }
    }

    /** Mirrors doctorsData.ts — update this when the roster changes */
    private function doctors(): array
    {
        return [
            ['id' => 'flerida-ambat',       'name' => 'Dr. Flerida Ambat',                   'specialty' => 'Dermatology',      'specialization' => 'Dermatologist',                     'initials' => 'FA', 'color' => '#0056b3'],
            ['id' => 'kristine-brania',     'name' => 'Dr. Kristine Rose Brania-Alcantara',   'specialty' => 'Psychiatry',       'specialization' => 'Psychiatry',                        'initials' => 'KB', 'color' => '#7c3aed'],
            ['id' => 'estephany-guerra',    'name' => 'Dr. Estephany Marie Guerra',           'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'EG', 'color' => '#0891b2'],
            ['id' => 'milagros-capacio',    'name' => 'Dr. Milagros Rafol Capacio',           'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'MC', 'color' => '#0891b2'],
            ['id' => 'aileen-ledesma',      'name' => 'Dr. Aileen Anies-Ledesma',             'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'AL', 'color' => '#0891b2'],
            ['id' => 'ronnelaine-arpilleda', 'name' => 'Dr. Ronnelaine Cortez-Arpilleda',      'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'RA', 'color' => '#0891b2'],
            ['id' => 'joanna-legaspi',      'name' => 'Dr. Joanna Kristine Rue-Legaspi',      'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'JL', 'color' => '#0891b2'],
            ['id' => 'michelle-martinez',   'name' => 'Dr. Michelle Angela Martinez',         'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'MM', 'color' => '#0891b2'],
            ['id' => 'vellanie-sandoval',   'name' => 'Dr. Vellanie Sandoval',                'specialty' => 'Pediatrics',       'specialization' => 'Pediatrics',                        'initials' => 'VS', 'color' => '#0891b2'],
            ['id' => 'danice-alombro',      'name' => 'Dr. Danice Faith Alombro',             'specialty' => 'Internal Medicine', 'specialization' => 'IM – Infectious Disease',            'initials' => 'DA', 'color' => '#16a34a'],
            ['id' => 'charles-onda',        'name' => 'Dr. Charles Onda',                     'specialty' => 'Internal Medicine', 'specialization' => 'IM – Geriatrics',                   'initials' => 'CO', 'color' => '#16a34a'],
            ['id' => 'cristan-alto',        'name' => 'Dr. Cristan Barrera Alto',             'specialty' => 'Internal Medicine', 'specialization' => 'IM – Pulmonology',                  'initials' => 'CA', 'color' => '#16a34a'],
            ['id' => 'jesus-ambat',         'name' => 'Dr. Jesus Ambat',                      'specialty' => 'Internal Medicine', 'specialization' => 'IM – Pulmonology',                  'initials' => 'JA', 'color' => '#16a34a'],
            ['id' => 'mon-aguilar',         'name' => 'Dr. Mon Kenneth Aguilar',              'specialty' => 'Internal Medicine', 'specialization' => 'IM – Cardiology',                   'initials' => 'MA', 'color' => '#16a34a'],
            ['id' => 'kevin-esguerra',      'name' => 'Dr. Kevin Esguerra',                   'specialty' => 'Internal Medicine', 'specialization' => 'IM – Cardiology',                   'initials' => 'KE', 'color' => '#16a34a'],
            ['id' => 'leah-legaspi',        'name' => 'Dr. Leah Anne Legaspi',                'specialty' => 'Internal Medicine', 'specialization' => 'OM – Diabetology / IM – Gastroenterology', 'initials' => 'LL', 'color' => '#16a34a'],
            ['id' => 'maryjane-leones',     'name' => 'Dr. Mary Jane Balidio-Leones',         'specialty' => 'Internal Medicine', 'specialization' => 'OM – Diabetology',                  'initials' => 'ML', 'color' => '#16a34a'],
            ['id' => 'carl-amante',         'name' => 'Dr. Carl Angelo Amante',               'specialty' => 'Internal Medicine', 'specialization' => 'IM – Diabetology',                  'initials' => 'CA', 'color' => '#16a34a'],
            ['id' => 'sheila-quinto',       'name' => 'Dr. Sheila Quinto',                    'specialty' => 'Internal Medicine', 'specialization' => 'Internal Medicine',                 'initials' => 'SQ', 'color' => '#16a34a'],
            ['id' => 'vasha-gutierrez',     'name' => 'Dr. Vasha Gianina Delica-Gutierrez',   'specialty' => 'Internal Medicine', 'specialization' => 'Internal Medicine',                 'initials' => 'VG', 'color' => '#16a34a'],
            ['id' => 'rhett-crisostomo',    'name' => 'Dr. Rhett Crisostomo',                 'specialty' => 'ENT',              'specialization' => 'ENT',                               'initials' => 'RC', 'color' => '#ca8a04'],
            ['id' => 'carolynne-unay',      'name' => 'Dr. Carolynne Unay',                   'specialty' => 'ENT',              'specialization' => 'ENT',                               'initials' => 'CU', 'color' => '#ca8a04'],
            ['id' => 'karen-bathan',        'name' => 'Dr. Karen Del Rosario Bathan',         'specialty' => 'ENT',              'specialization' => 'ENT',                               'initials' => 'KB', 'color' => '#ca8a04'],
            ['id' => 'wendell-lim',         'name' => 'Dr. Wendell Lim',                      'specialty' => 'ENT',              'specialization' => 'ENT',                               'initials' => 'WL', 'color' => '#ca8a04'],
            ['id' => 'michiko-hosojima',    'name' => 'Dr. Michiko Sucaldito Hosojima',       'specialty' => 'ENT',              'specialization' => 'ENT',                               'initials' => 'MH', 'color' => '#ca8a04'],
            ['id' => 'francis-dichoso',     'name' => 'Dr. Francis Warren Dichoso',           'specialty' => 'Surgery',          'specialization' => 'Orthopedic Surgeon',                'initials' => 'FD', 'color' => '#dc2626'],
            ['id' => 'ray-umali',           'name' => 'Dr. Ray Joselito Umali',               'specialty' => 'Surgery',          'specialization' => 'Surgeon',                           'initials' => 'RU', 'color' => '#dc2626'],
            ['id' => 'aylmer-espano',       'name' => 'Dr. Aylmer Españo',                    'specialty' => 'Surgery',          'specialization' => 'Surgeon',                           'initials' => 'AE', 'color' => '#dc2626'],
            ['id' => 'julie-calusim',       'name' => 'Dr. Julie Anne Calusim',               'specialty' => 'Surgery',          'specialization' => 'Surgeon',                           'initials' => 'JC', 'color' => '#dc2626'],
            ['id' => 'rodelio-aldueza',     'name' => 'Dr. Rodelio Aldueza',                  'specialty' => 'Dental',           'specialization' => 'Dental',                            'initials' => 'RA', 'color' => '#059669'],
            ['id' => 'bettina-limson',      'name' => 'Dr. Bettina Limson',                   'specialty' => 'Dental',           'specialization' => 'Dental',                            'initials' => 'BL', 'color' => '#059669'],
            ['id' => 'perfecto-cagampang',  'name' => 'Dr. Perfecto Roy Cagampang III',       'specialty' => 'Ophthalmology',    'specialization' => 'Ophthalmology',                     'initials' => 'PC', 'color' => '#00a8e8'],
            ['id' => 'jean-bonto',          'name' => 'Dr. Jean Bonto',                       'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'JB', 'color' => '#db2777'],
            ['id' => 'genevieve-villela',   'name' => 'Dr. Genevieve Rillorta-Villela',       'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'GV', 'color' => '#db2777'],
            ['id' => 'grace-palasi',        'name' => 'Dr. Grace Palasi',                     'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'GP', 'color' => '#db2777'],
            ['id' => 'mitzi-delapaz',       'name' => 'Dr. Mitzi Rose Ramirez-Delapaz',       'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'MD', 'color' => '#db2777'],
            ['id' => 'nazarena-mata',       'name' => 'Dr. Nazarena Mata',                    'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'NM', 'color' => '#db2777'],
            ['id' => 'annie-cortez',        'name' => 'Dr. Annie Grace Baldove-Cortez',       'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN',                            'initials' => 'AC', 'color' => '#db2777'],
            ['id' => 'trinidad-purugganan', 'name' => 'Dr. Trinidad Geraldine Purugganan',    'specialty' => 'OB-GYN',           'specialization' => 'OB-GYN & Addiction Medicine',       'initials' => 'TP', 'color' => '#db2777'],
            ['id' => 'hansel-ybanez',       'name' => 'Dr. Hansel John Ybañez',               'specialty' => 'In-House',         'specialization' => 'In-House Doctor',                   'initials' => 'HY', 'color' => '#475569'],
            ['id' => 'junimyn-miralles',    'name' => 'Dr. Junimyn Grace Miralles',           'specialty' => 'In-House',         'specialization' => 'In-House Doctor',                   'initials' => 'JM', 'color' => '#475569'],
            ['id' => 'reliever-inhouse',    'name' => 'Reliever In-House Physician',          'specialty' => 'In-House',         'specialization' => 'In-House Doctor',                   'initials' => 'RX', 'color' => '#475569'],
        ];
    }
}
