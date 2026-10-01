<?php

namespace Database\Seeders;

use App\Enums\Specialty;
use App\Models\Service;
use Illuminate\Database\Seeder;

/**
 * The catalogue the clinic opens with.
 *
 * These eleven rows are App\Enums\Service, moved verbatim — the same slugs,
 * labels, descriptions, specialty mappings and clinical constraints, in the
 * same display order. The enum was deleted once this existed; this file is the
 * record of what it said.
 *
 * ## Why the naming matters
 *
 * A service mapping to ONE specialty is named exactly what that specialty is
 * named (Specialty::label()). This is not tidiness. `general` was once
 * "General Consultation" here, "General Practice" in the PHP enum,
 * "General / Family Medicine" in the specialty filter and "Family Medicine" on
 * the doctor's own card — four names for one thing, of which the one in the
 * dropdown was the only one a patient ever saw and the only one that never said
 * "family medicine". Five doctors were invisible behind that.
 *
 * ServiceCatalogueTest still asserts the property. OB-Gyne is the one
 * deliberate exception and the test names it as such.
 *
 * ## Idempotent
 *
 * Keyed on `slug` through updateOrCreate, so re-running it on a populated
 * database corrects drifted copy rather than raising a unique-key violation or
 * duplicating the catalogue. It deliberately does NOT touch `is_active` or
 * `sort_order` on a row that already exists: those are the administrator's
 * decisions, and a seeder that resets them would silently re-enable a service
 * the clinic had retired.
 */
class ServiceSeeder extends Seeder
{
    /**
     * Declaration order is display order: see-a-doctor services first, in the
     * order a patient is likely to want them, then the diagnostic and therapy
     * services that are ordered rather than consulted.
     *
     * `specialties => null` means any rostered doctor may take it. That is not
     * a shrug: a blood draw, a scan and an annual physical are delivered by
     * whoever is on, and filtering the picker for them would hide doctors who
     * can genuinely see the patient.
     */
    private const CATALOGUE = [
        [
            'slug' => 'general',
            'name' => 'General / Family Medicine',
            'description' => 'Your family doctor: everyday complaints, follow-ups and referrals.',
            'specialties' => [Specialty::General],
            'requires_in_person' => false,
            'virtual_fee' => 500.00,
        ],
        [
            'slug' => 'internal-medicine',
            'name' => 'Internal Medicine',
            'description' => 'Adult long-term conditions — diabetes, hypertension, thyroid.',
            'specialties' => [Specialty::InternalMedicine],
            'requires_in_person' => false,
            'virtual_fee' => 700.00,
            'min_age' => 18,
        ],
        [
            'slug' => 'pediatrics',
            'name' => 'Pediatrics',
            'description' => 'Children up to 18: check-ups, illness, immunisation.',
            'specialties' => [Specialty::Pediatrics],
            'requires_in_person' => false,
            'virtual_fee' => 600.00,
            'max_age' => 18,
        ],
        [
            'slug' => 'ob-gyne',
            'name' => 'OB-Gyne',
            'description' => 'Pregnancy care, womens health and gynaecological concerns.',
            'specialties' => [Specialty::Obstetrics],
            'requires_in_person' => false,
            'virtual_fee' => 700.00,
            'restricted_to_sex' => 'female',
            'min_age' => 12,
        ],
        [
            'slug' => 'cardiology',
            'name' => 'Cardiology',
            'description' => 'Heart and circulation.',
            'specialties' => [Specialty::Cardiology],
            'requires_in_person' => false,
            'virtual_fee' => 900.00,
        ],
        [
            'slug' => 'dermatology',
            'name' => 'Dermatology',
            'description' => 'Skin, hair and nails.',
            'specialties' => [Specialty::Dermatology],
            'requires_in_person' => false,
            'virtual_fee' => 800.00,
        ],
        [
            'slug' => 'orthopedics',
            'name' => 'Orthopedics',
            'description' => 'Bones, joints and injuries.',
            'specialties' => [Specialty::Orthopedics],
            'requires_in_person' => false,
            'virtual_fee' => 800.00,
        ],
        [
            'slug' => 'preventive-care',
            'name' => 'Preventive Care & Annual Physical',
            'description' => 'Annual physical exam, vaccination and health screening.',
            'specialties' => null,
            'requires_in_person' => true,
        ],
        [
            'slug' => 'laboratory',
            'name' => 'Laboratory Services',
            'description' => 'Blood work, urinalysis and specialised panels.',
            'specialties' => null,
            'requires_in_person' => true,
        ],
        [
            'slug' => 'imaging',
            'name' => 'Imaging / Radiology',
            'description' => 'X-ray, ultrasound, CT and MRI.',
            'specialties' => null,
            'requires_in_person' => true,
        ],
        [
            'slug' => 'physical-therapy',
            'name' => 'Physical Therapy',
            'description' => 'Rehabilitation and hands-on therapy.',
            'specialties' => null,
            'requires_in_person' => true,
        ],
    ];

    public function run(): void
    {
        foreach (self::CATALOGUE as $index => $definition) {
            $specialties = $definition['specialties'] === null
                ? null
                : array_map(fn (Specialty $specialty) => $specialty->value, $definition['specialties']);

            $service = Service::firstOrNew(['slug' => $definition['slug']]);

            // Copy always: a corrected description is the reason to re-run.
            $service->fill([
                'name' => $definition['name'],
                'description' => $definition['description'],
                'specialties' => $specialties,
                'requires_in_person' => $definition['requires_in_person'],
                'restricted_to_sex' => $definition['restricted_to_sex'] ?? null,
                'max_age' => $definition['max_age'] ?? null,
                'min_age' => $definition['min_age'] ?? null,
            ]);

            // Copy on first insert only. `is_active` and `sort_order` are the
            // administrator's, and a seeder that reset them would silently
            // re-enable a retired service and undo a hand-ordered catalogue.
            if (! $service->exists) {
                $service->is_active = true;
                // The administrator's to change at /admin/services, so copied
                // on first insert only — for the same reason is_active is. A
                // seeder that reset it would undo the clinic's own price list
                // on the next `migrate:fresh --seed`.
                $service->virtual_fee = $definition['virtual_fee'] ?? null;
                // Tens, so a service can be moved between two others without
                // renumbering the whole catalogue.
                $service->sort_order = ($index + 1) * 10;
            }

            $service->save();
        }
    }
}
