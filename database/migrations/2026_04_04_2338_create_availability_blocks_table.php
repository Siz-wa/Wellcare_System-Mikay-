<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * availability_blocks — defines when a doctor is available.
     *
     * Each row = one recurring weekly slot or a one-off date-specific slot.
     * "Out of Office" rows (is_available = false) block an otherwise open slot.
     *
     * Slot duration stored explicitly so the service layer can compute
     * the 5-minute buffer correctly without needing a global constant.
     *
     * Deleted rows are soft-deleted so audit trails remain intact.
     */
    public function up(): void
    {
        Schema::create('availability_blocks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('doctor_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // ── Recurrence ──────────────────────────────────────────────────
            // day_of_week: 0 = Sunday … 6 = Saturday (null = one-off date)
            $table->unsignedTinyInteger('day_of_week')->nullable();

            // For one-off blocks (holiday, leave, etc.)
            $table->date('specific_date')->nullable();

            // ── Time window ─────────────────────────────────────────────────
            $table->time('start_time');
            $table->time('end_time');

            // Slot duration in minutes (e.g. 30 = 30-min appointments)
            $table->unsignedSmallInteger('slot_duration_minutes')->default(30);

            // ── Availability flag ────────────────────────────────────────────
            // false = "Out of Office" block that cancels an otherwise open period
            $table->boolean('is_available')->default(true);

            $table->timestamps();
            $table->softDeletes();

            // Constraint: must have either day_of_week OR specific_date, not both
            // (enforced at service layer; DB index below covers both lookup paths)
            $table->index(['doctor_id', 'day_of_week']);
            $table->index(['doctor_id', 'specific_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_blocks');
    }
};
