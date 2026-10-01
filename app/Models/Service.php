<?php

namespace App\Models;

use App\Enums\Specialty;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One bookable service.
 *
 * Replaces App\Enums\Service, which was deleted when the catalogue became
 * something the clinic administers rather than something we ship. The methods
 * below are the enum's, unchanged in meaning — what moved is where the answers
 * come from.
 *
 * Read through the scopes rather than the table: `bookable()` is what the
 * wizard, the validator and the eligibility filter all agree on, and a query
 * that forgets `is_active` is a query that offers a retired service.
 *
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string $description
 * @property array<int, string>|null $specialties
 * @property bool $requires_in_person
 * @property string|null $restricted_to_sex
 * @property int|null $max_age
 * @property bool $is_active
 * @property int $sort_order
 */
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'specialties',
        'requires_in_person',
        'virtual_fee',
        'restricted_to_sex',
        'min_age',
        'max_age',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'specialties' => 'array',
            'requires_in_person' => 'boolean',
            // Money — never a float. See the add_virtual_fee migration.
            'virtual_fee' => 'decimal:2',
            'is_active' => 'boolean',
            'max_age' => 'integer',
            'min_age' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * What a patient may actually book, in the order the clinic set.
     *
     * `sort_order` then `name`, never the insertion order: a service added
     * last is not therefore last in the list, and two services sharing a
     * sort_order still come back in a stable order rather than whatever the
     * storage engine happens to return.
     *
     * @param  Builder<Service>  $query
     * @return Builder<Service>
     */
    public function scopeBookable(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    /**
     * The whole catalogue for an administrator, retired services included.
     *
     * @param  Builder<Service>  $query
     * @return Builder<Service>
     */
    public function scopeInDisplayOrder(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Whether this patient's own age and sex permit the service.
     *
     * Nulls mean "not answered yet", which rules nothing out — a patient who
     * declined to state a sex is excluded from nothing.
     */
    public function isEligibleFor(?string $sex, ?int $age): bool
    {
        return $this->ineligibilityReason($sex, $age) === null;
    }

    /**
     * Why this patient cannot take the service, in words a patient reads, or
     * null when they can.
     */
    public function ineligibilityReason(?string $sex, ?int $age): ?string
    {
        if ($this->restricted_to_sex === 'female' && $sex === 'male') {
            return "{$this->name} is not available for male patients.";
        }

        if ($this->restricted_to_sex === 'male' && $sex === 'female') {
            return "{$this->name} is only available for male patients.";
        }

        if ($this->max_age !== null && $age !== null && $age > $this->max_age) {
            return "{$this->name} is only available for patients aged {$this->max_age} and below.";
        }

        if ($this->min_age !== null && $age !== null && $age < $this->min_age) {
            return "{$this->name} is only available for patients aged {$this->min_age} and over.";
        }

        return null;
    }

    /**
     * Specialty labels for the admin screen, skipping any slug that is no
     * longer a case on the enum.
     *
     * @return array<int, string>
     */
    public function specialtyLabels(): array
    {
        return array_values(array_filter(array_map(
            fn (string $slug) => Specialty::tryFrom($slug)?->label(),
            $this->specialties ?? [],
        )));
    }

    /**
     * Bookable slugs, for `Rule::in()`.
     *
     * @return array<int, string>
     */
    public static function bookableSlugs(): array
    {
        return static::query()->bookable()->pluck('slug')->all();
    }

    /**
     * The bookable catalogue in the shape the wizard renders.
     *
     * Keys are camelCase because this crosses into TypeScript, and the shape
     * matches ServiceDefinition in bookingdata.ts. That file used to hold a
     * hand-maintained copy of this data; it now holds only the type and the
     * functions that read it.
     *
     * @return array<int, array{
     *     value: string,
     *     label: string,
     *     description: string,
     *     specialties: array<int, string>|null,
     *     inPersonOnly: bool,
     *     sex: string|null,
     *     maxAge: int|null,
     *     minAge: int|null,
     * }>
     */
    public static function catalogue(): array
    {
        return static::query()->bookable()->get()
            ->map(fn (self $service) => [
                'value' => $service->slug,
                'label' => $service->name,
                'description' => $service->description,
                'specialties' => $service->specialties,
                'inPersonOnly' => $service->requires_in_person,
                'sex' => $service->restricted_to_sex,
                'maxAge' => $service->max_age,
                'minAge' => $service->min_age,
            ])
            ->all();
    }

    /**
     * A readable name for a slug, including one that has since been retired.
     *
     * Historical appointments keep the slug they were booked with, so this
     * deliberately searches the whole table rather than `bookable()` — a
     * completed visit must not start displaying as its raw slug because the
     * clinic stopped offering the service afterwards.
     */
    public static function labelFor(?string $slug): ?string
    {
        if ($slug === null || $slug === '') {
            return null;
        }

        return static::query()->where('slug', $slug)->value('name');
    }
}
