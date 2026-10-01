<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PaymentVerification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentVerification>
 */
class PaymentVerificationFactory extends Factory
{
    /**
     * Default: a fee raised and not yet settled, which is the state every
     * record starts in. Everything downstream is opt-in below.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => Appointment::factory(),
            'patient_id' => Patient::factory(),
            'user_id' => User::factory(),
            'status' => 'pending',
            'amount_due' => 500.00,
            'due_at' => now()->addDay(),
        ];
    }

    /**
     * Attach to an existing appointment, taking its patient and guarantor with
     * it.
     *
     * `payment_verifications.appointment_id` is unique, so calling this twice
     * with the same appointment is a constraint violation rather than two
     * records — which is the point, and is what the gate relies on.
     */
    public function forAppointment(Appointment $appointment): static
    {
        return $this->state(fn () => [
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'user_id' => $appointment->user_id,
        ]);
    }

    /**
     * The fee is owed and nothing has been declared — the state raise() leaves.
     *
     * Identical to the default. It exists so a dataset can name all five states
     * uniformly instead of leaving one of them implied by its absence.
     */
    public function pending(): static
    {
        return $this->state(fn () => ['status' => 'pending']);
    }

    /** The patient has declared a remittance; staff has not looked at it yet. */
    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'submitted',
            'method' => 'gcash',
            'amount_paid' => $attributes['amount_due'] ?? 500.00,
            'remittance_reference' => fake()->numerify('#############'),
            'submitted_at' => now(),
        ]);
    }

    /** Staff matched it against the clinic's records — the gate opens. */
    public function verified(): static
    {
        return $this->submitted()->state(fn () => [
            'status' => 'verified',
            'verified_by' => User::factory()->role('hr'),
            'verified_at' => now(),
        ]);
    }

    /** Nothing matched. The patient may correct it and submit again. */
    public function rejected(): static
    {
        return $this->submitted()->state(fn () => [
            'status' => 'rejected',
            'verified_by' => User::factory()->role('hr'),
            'rejected_at' => now(),
            'verified_at' => null,
            'remarks' => 'No matching remittance found for that reference.',
        ]);
    }

    /** The clinic chose not to collect — settled with no money involved. */
    public function waived(): static
    {
        return $this->state(fn () => [
            'status' => 'waived',
            'verified_by' => User::factory()->role('hr'),
            'verified_at' => now(),
            'remarks' => 'Waived — follow-up on a consultation already paid for.',
        ]);
    }

    /** Past its deadline, so the sweeper is entitled to release the slot. */
    public function overdue(): static
    {
        return $this->state(fn () => [
            'due_at' => now()->subHour(),
        ]);
    }
}
