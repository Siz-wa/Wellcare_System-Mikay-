<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('patient_medical', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('profile_id')->unique();
            $table->decimal('height', 5)->nullable()->comment('In centimeters');
            $table->decimal('weight', 5)->nullable()->comment('In kilograms');
            $table->string('blood_pressure', 20)->nullable()->comment('Format: 120/80');
            $table->string('hmo')->nullable();
            $table->enum('payment_method', ['cash', 'pwd', 'senior', 'mwc', 'hmo'])->nullable();
            $table->string('preferred_doctor')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_medical');
    }
};
