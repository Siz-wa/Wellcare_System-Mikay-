<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The bookable service catalogue, moved out of code and into the clinic's hands.
 *
 * ## Why this table exists
 *
 * The catalogue used to be App\Enums\Service: eleven PHP cases, mirrored by
 * hand into a TypeScript array, with a test asserting the two never drifted.
 * That was the right shape while the list was a developer's concern. It is the
 * wrong shape now, because the list is a CLINIC's concern — adding a service,
 * retiring one, or correcting the description a patient reads meant editing two
 * source files and shipping a build, which is not something an administrator
 * can do and not something that should wait for one of us.
 *
 * ## What is a column and what is not
 *
 * Everything the clinic decides is a column: the name, the description, whether
 * it is offered at all, what order it appears in, which specialties may take it,
 * and the clinical constraints (in-person only, sex, maximum age).
 *
 * `slug` is the exception. `appointments.service` is a varchar holding this
 * value on every historical row, and there is no foreign key — deliberately, so
 * that retiring a service cannot orphan or cascade-delete the appointments that
 * used it. A completed appointment for a service the clinic no longer offers is
 * still a true record of what happened. The slug is therefore immutable once
 * appointments reference it, which AdminServiceController enforces.
 *
 * `specialties` is JSON rather than a pivot table: it is a short list of enum
 * values read as a whole and never queried across, and a pivot would add a
 * table and two joins to store what is read as an array either way. NULL there
 * means "any rostered doctor may take it" — a blood draw or a scan — which is
 * different from an empty array, and the model's cast preserves that.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();

            // Immutable once booked against. See the note above.
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('description', 500);

            // NULL = any rostered doctor. See the note above on NULL vs [].
            $table->json('specialties')->nullable();

            $table->boolean('requires_in_person')->default(false);

            // 'female' or null. A column rather than a boolean because the
            // clinic may one day need the other value, and a
            // `restricted_to_female` flag could not express it.
            $table->string('restricted_to_sex', 10)->nullable();
            $table->unsignedTinyInteger('max_age')->nullable();

            // Retiring a service hides it from booking without touching the
            // appointments that already reference it — which is why this is a
            // flag and not a delete.
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            // The booking wizard asks for exactly this: active services in
            // display order. Indexed together so it stays one index scan as the
            // catalogue grows.
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
