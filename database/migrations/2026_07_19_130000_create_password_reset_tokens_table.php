<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `password_reset_tokens` table was never created.
 *
 * The original schema was reverse-engineered from a live database with
 * kitloong/laravel-migrations-generator and this table was missed. Meanwhile
 * `Features::resetPasswords()` is enabled in config/fortify.php and the login
 * page renders a "Forgot password?" link — so the flow is reachable and fails
 * for real users, not just in tests.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('password_reset_tokens')) {
            return;
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
