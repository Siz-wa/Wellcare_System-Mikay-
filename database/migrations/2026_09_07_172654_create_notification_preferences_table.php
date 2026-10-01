<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per account holding every notification toggle as JSON.
     *
     * A JSON column rather than a column per switch: the category list is
     * derived from AppointmentNotification's `type` enum, which this codebase
     * already extends by migration three times over
     * (extend_appointment_notifications_type_enum*). Adding a category should
     * not be a fourth schema change — NotificationPreference::DEFAULTS is the
     * single place a new toggle is declared, and rows written before it existed
     * fall back to that default rather than reading NULL.
     */
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('preferences');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
