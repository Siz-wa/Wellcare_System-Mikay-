<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LabTestResult>
 */
class LabTestResultFactory extends Factory
{
    /**
     * Defaults to the first workflow step, so `->recorded()` and `->reviewed()`
     * read as moving forward through the state machine.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'appointment_id' => Appointment::factory(),
            'requested_by' => User::factory()->role('doctor'),
            'test_name' => fake()->randomElement([
                'Complete Blood Count',
                'Lipid Profile',
                'Urinalysis',
                'Thyroid Panel',
            ]),
            'status' => 'requested',
            'requested_at' => now(),
        ];
    }

    public function recorded(string $severity = 'normal'): static
    {
        return $this->state(fn () => [
            'status' => 'recorded',
            'severity' => $severity,
            'recorded_by' => User::factory()->role('nurse'),
            'recorded_at' => now(),
        ]);
    }

    public function reviewed(string $severity = 'normal'): static
    {
        return $this->recorded($severity)->state(fn () => [
            'status' => 'reviewed',
            'interpretation' => 'Reviewed and filed to the patient record.',
            'reviewed_at' => now(),
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
