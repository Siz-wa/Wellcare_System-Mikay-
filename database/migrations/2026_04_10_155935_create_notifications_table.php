<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Laravel's built-in database notification table.
     * Works with the Notifiable trait already on User model.
     *
     * If this table already exists from a previous `php artisan notifications:table`
     * command, skip this migration — Laravel's default schema is identical.
     *
     * type          = notification class name (used to distinguish notification kinds)
     * notifiable    = polymorphic (type + id) — supports any model, not just User
     * data          = JSON payload (title, body, action_url, icon, role_hint, etc.)
     * read_at       = null = unread, timestamp = read
     */
    public function up(): void
    {
        if (Schema::hasTable('notifications')) {
            return; // already exists from artisan command
        }

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');     // notifiable_type + notifiable_id
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
