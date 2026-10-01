<?php

namespace App\Enums;

/**
 * The clinic's specialty vocabulary.
 *
 * Until this existed the vocabulary was seven undeclared strings living in
 * three places at once — `doctor_profiles.specialty` rows written by
 * DoctorProfileSeeder, the SERVICE_TO_SPECIALTIES map in the booking wizard,
 * and nothing at all on the PHP side. A typo in any one of them silently
 * removed a doctor from search results, because DoctorProfile::forSpecialties()
 * matches on exact string equality.
 *
 * Backed by string on purpose: `->value` is byte-identical to what is already
 * stored, so this is additive. Existing string comparisons keep working and no
 * data migration is needed.
 *
 * Deliberately NOT applied to the older `status` columns (LoaRequest,
 * Appointment): those are strings by established convention and rewriting them
 * is a separate change with its own regression surface.
 */
enum Specialty: string
{
    case General = 'general';
    case Cardiology = 'cardiology';
    case Dermatology = 'dermatology';
    case InternalMedicine = 'internal_medicine';
    case Obstetrics = 'obstetrics';
    case Orthopedics = 'orthopedics';
    case Pediatrics = 'pediatrics';

    /** Human label for admin dropdowns and the public doctor directory. */
    public function label(): string
    {
        return match ($this) {
            self::General => 'General / Family Medicine',
            self::Cardiology => 'Cardiology',
            self::Dermatology => 'Dermatology',
            self::InternalMedicine => 'Internal Medicine',
            self::Obstetrics => 'Obstetrics & Gynecology',
            self::Orthopedics => 'Orthopedics',
            self::Pediatrics => 'Pediatrics',
        };
    }

    /**
     * The Philippine specialty board that certifies this practice.
     *
     * PhilHealth accredits a specialist on the strength of a Diplomate or
     * Fellow certificate issued by one of these boards, so the clinic records
     * which board it saw before conferring the specialty.
     */
    public function board(): ?string
    {
        return match ($this) {
            self::General => null,
            self::Cardiology => 'Philippine College of Cardiology',
            self::Dermatology => 'Philippine Dermatological Society',
            self::InternalMedicine => 'Philippine College of Physicians',
            self::Obstetrics => 'Philippine Obstetrical and Gynecological Society',
            self::Orthopedics => 'Philippine Orthopedic Association',
            self::Pediatrics => 'Philippine Pediatric Society',
        };
    }

    /**
     * Whether conferring this specialty requires a board certificate on file.
     *
     * General practice does not: a PRC-registered physician may practise
     * generally without any specialty board. Every other value here is a
     * *specialist* claim, and CredentialingService refuses to confer one
     * without a Diplomate or Fellow certificate recorded against it.
     */
    public function requiresBoardCertificate(): bool
    {
        return $this !== self::General;
    }

    /**
     * Slugs only — for `Rule::in()` and for the front end.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return array<int, array{value: string, label: string, board: string|null}>
     */
    public static function options(): array
    {
        return array_map(fn (self $s) => [
            'value' => $s->value,
            'label' => $s->label(),
            'board' => $s->board(),
        ], self::cases());
    }
}
