<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'patient_id' => Patient::factory(),
            'doctor_id' => User::factory()->role('doctor'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'contact_number' => fake()->numerify('09#########'),
            'age' => fake()->numberBetween(18, 80),
            'gender' => fake()->randomElement(['male', 'female']),
            'service' => 'general',
            'branch' => 'Dasmariñas',
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00 AM',
            'patient_status' => 'new',
            'coverage' => 'cash',
            'status' => 'confirmed',
        ];
    }

    public function forPatient(Patient $patient): static
    {
        return $this->state(fn () => [
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'first_name' => $patient->first_name,
            'last_name' => $patient->last_name,
        ]);
    }

    public function forDoctor(User $doctor): static
    {
        return $this->state(fn () => ['doctor_id' => $doctor->id]);
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => 'in_progress']);
    }
}
