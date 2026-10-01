<?php

namespace Database\Factories;

use App\Enums\Specialty;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    public function definition(): array
    {
        $name = ucfirst($this->faker->unique()->words(2, true));

        return [
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1, 9999),
            'name' => $name,
            'description' => $this->faker->sentence(),
            'specialties' => [Specialty::General->value],
            'requires_in_person' => false,
            'restricted_to_sex' => null,
            'max_age' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /** Retired: still referenced by historical appointments, never offered. */
    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    /** Any rostered doctor may take it — a scan, a blood draw, a physical. */
    public function anyDoctor(): static
    {
        return $this->state(fn () => ['specialties' => null]);
    }

    /** Cannot happen over video. */
    public function inPersonOnly(): static
    {
        return $this->state(fn () => ['requires_in_person' => true]);
    }
}
