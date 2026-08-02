<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LoaRequest>
 */
class LoaRequestFactory extends Factory
{
    /**
     * Defaults to the first workflow step, so `->approved()` and `->rejected()`
     * read as moving forward through the state machine.
     *
     * `loa_number` is deliberately left out — the model's creating hook
     * generates it, and letting the factory set one would hide a regression in
     * that hook.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'appointment_id' => Appointment::factory(),
            'hmo_provider' => fake()->randomElement([
                'Maxicare',
                'Intellicare',
                'MediCard',
                'PhilCare',
            ]),
            'hmo_id' => fake()->numerify('HMO-########'),
            'status' => 'submitted',
            'requested_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => 'approved',
            'approved_by' => User::factory()->role('hr'),
            'approved_at' => now(),
            'valid_until' => today()->addDays(30),
        ]);
    }

    public function rejected(string $remarks = 'Coverage not active for this service.'): static
    {
        return $this->state(fn () => [
            'status' => 'rejected',
            'approved_by' => User::factory()->role('hr'),
            'rejected_at' => now(),
            'remarks' => $remarks,
        ]);
    }

    /** An approved LOA whose validity window has already closed. */
    public function expired(): static
    {
        return $this->approved()->state(fn () => [
            'valid_until' => today()->subDay(),
        ]);
    }

    public function forPatient(Patient $patient): static
    {
        return $this->state(fn () => [
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
        ]);
    }
}
