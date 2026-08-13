<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
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
        // Age follows the birthdate rather than being drawn separately. The two
        // used to be independent randoms, so a factory patient could be "30"
        // with a birthdate that made them 7 — and any test about age eligibility
        // was then testing whichever of the two the code happened to read.
        $birthdate = fake()->dateTimeBetween('-80 years', '-19 years');

        return [
            // The guarantor is the booking account; one account can hold several
            // patients, which is the case most record-bleed bugs come from.
            'guarantor_id' => User::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'contact_number' => fake()->numerify('09#########'),
            'birthdate' => $birthdate->format('Y-m-d'),
            'age' => Carbon::parse($birthdate)->age,
            'gender' => fake()->randomElement(['male', 'female']),
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

    /**
     * A patient of a given age today, with a birthdate that agrees.
     *
     * Age is derived from birthdate everywhere in the app, so setting the column
     * alone would not actually make a test patient that age.
     */
    public function aged(int $years): static
    {
        $birthdate = Carbon::today()->subYears($years)->subMonths(1);

        return $this->state(fn () => [
            'birthdate' => $birthdate->toDateString(),
            'age' => $years,
        ]);
    }

    /** Too young to hold their own coverage — billed to the guarantor. */
    public function minor(int $years = 8): static
    {
        return $this->aged($years);
    }
}
