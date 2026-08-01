<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // The guarantor is the booking account; one account can hold several
            // patients, which is the case most record-bleed bugs come from.
            'guarantor_id' => User::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'contact_number' => fake()->numerify('09#########'),
            'age' => fake()->numberBetween(18, 80),
            'gender' => fake()->randomElement(['male', 'female']),
            'birthdate' => fake()->date(),
            'address' => fake()->address(),
            'civil_status' => fake()->randomElement(['single', 'married', 'widowed']),
            'default_coverage' => 'cash',
        ];
    }

    /** Two patients under one account — the record-isolation fixture. */
    public function forGuarantor(User $guarantor): static
    {
        return $this->state(fn () => ['guarantor_id' => $guarantor->id]);
    }
}
