<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A prescription was saved that contradicts a recorded allergy, without the
 * prescriber acknowledging it.
 *
 * Carries the conflicts so the controller can put them in front of the doctor
 * rather than reporting a bare failure — a warning that does not say WHAT it
 * matched is a warning nobody can act on.
 *
 * Thrown rather than returned because the save must not partially succeed: the
 * SOAP note, the vitals and the prescriptions are written in one transaction,
 * and a contraindication has to roll all of it back.
 */
class AllergyContraindicationException extends RuntimeException
{
    /**
     * @param  array<int, array{name: string, conflicts: array<int, array<string, mixed>>}>  $conflicts
     */
    public function __construct(public readonly array $conflicts)
    {
        $names = implode(', ', array_column($conflicts, 'name'));

        parent::__construct(
            "This prescription conflicts with a recorded allergy: {$names}."
        );
    }
}
