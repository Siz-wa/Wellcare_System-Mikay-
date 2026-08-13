<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ConsultationSession>
 */
class ConsultationSessionFactory extends Factory
{
    /**
     * Default: an in-person draft note, which is what every session in the
     * database was before Phase 3. The virtual states are opt-in below.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => Appointment::factory(),
            'doctor_id' => User::factory()->role('doctor'),
            'mode' => 'in_person',
            'status' => 'draft',
            'subjective' => fake()->sentence(),
            'objective' => fake()->sentence(),
            'assessment' => fake()->sentence(),
            'plan' => fake()->sentence(),
            'blood_pressure' => '120/80',
            'heart_rate' => '72',
            'temperature' => '36.5',
            'oxygen_saturation' => '98',
            'weight' => '70',
            'height' => '175',
        ];
    }

    /**
     * Bind the session to an existing appointment and its doctor.
     *
     * `consultation_sessions.appointment_id` is UNIQUE, so calling this twice
     * with the same appointment is a 1062, not a second session. That is the
     * constraint the room design leans on.
     */
    public function forAppointment(Appointment $appointment): static
    {
        return $this->state(fn () => [
            'appointment_id' => $appointment->id,
            'doctor_id' => $appointment->doctor_id,
        ]);
    }

    /** A virtual session with a room minted but no call opened yet. */
    public function virtual(): static
    {
        return $this->state(fn () => ['mode' => 'virtual']);
    }

    /** Room open, patient has not connected. This is what `openVirtualRoom` produces. */
    public function waiting(): static
    {
        return $this->state(fn () => [
            'mode' => 'virtual',
            'room_id' => (string) Str::uuid(),
            'consultation_status' => 'waiting',
            'started_at' => now(),
            'ended_at' => null,
        ]);
    }

    /** Both peers connected. */
    public function active(): static
    {
        return $this->state(fn () => [
            'mode' => 'virtual',
            'room_id' => (string) Str::uuid(),
            'consultation_status' => 'active',
            'started_at' => now()->subMinutes(5),
            'ended_at' => null,
        ]);
    }

    /**
     * Call closed. The room_id is deliberately retained — an ended call must
     * still refuse joins by *state*, not by the key having been erased. A test
     * that nulls room_id would pass for the wrong reason.
     */
    public function ended(): static
    {
        return $this->state(fn () => [
            'mode' => 'virtual',
            'room_id' => (string) Str::uuid(),
            'consultation_status' => 'ended',
            'started_at' => now()->subMinutes(20),
            'ended_at' => now(),
        ]);
    }

    /** The note is signed. Terminal. */
    public function finalized(): static
    {
        return $this->state(fn () => ['status' => 'finalized']);
    }
}
