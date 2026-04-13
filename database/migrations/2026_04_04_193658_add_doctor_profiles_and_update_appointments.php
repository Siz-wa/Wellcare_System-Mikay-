<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Your existing appointments table (2026_03_21_122807) already has
     * doctor_id, so this migration ONLY creates doctor_profiles.
     *
     * The FK on appointments.doctor_id is also already defined there,
     * so we leave appointments completely untouched.
     */
    public function up(): void
    {
        Schema::create('doctor_profiles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->unique()
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('display_name');
            $table->string('specialty', 100);
            $table->string('specialization', 150)->nullable();
            $table->string('initials', 10)->nullable();
            $table->string('color', 20)->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['specialty', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_profiles');
    }
};