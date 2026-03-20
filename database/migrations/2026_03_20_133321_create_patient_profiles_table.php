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
        Schema::create('patient_profiles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->unique();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('address', 500)->nullable();
            $table->string('company')->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->enum('gender', ['M', 'F'])->nullable();
            $table->date('birthdate')->nullable();
            $table->enum('civil_status', ['single', 'married', 'widowed'])->nullable();
            $table->string('client_number', 20)->nullable()->unique()->comment('Auto-generated: WC-YYYY-XXXXX');
            $table->enum('classification', ['new', 'old'])->default('new');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_profiles');
    }
};
