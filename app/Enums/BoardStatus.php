<?php

namespace App\Enums;

/**
 * Standing with a Philippine specialty board.
 *
 * PhilHealth accredits a medical specialist on the strength of a Diplomate or
 * Fellow certificate issued by the relevant Philippine Specialty Board, so
 * those are the two ranks the clinic records. `none` covers a PRC-registered
 * physician practising generally, which is legitimate and needs no board.
 */
enum BoardStatus: string
{
    case None = 'none';
    case Diplomate = 'diplomate';
    case Fellow = 'fellow';

    public function label(): string
    {
        return match ($this) {
            self::None => 'No board certification',
            self::Diplomate => 'Diplomate',
            self::Fellow => 'Fellow',
        };
    }

    /** Whether this standing backs a specialist claim. */
    public function isCertified(): bool
    {
        return $this !== self::None;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
